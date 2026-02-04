'use strict';

const Homey = require('homey');
const CozytouchApi = require('../../lib/cozytouch-api');
const { DeviceType } = require('../../lib/cozytouch-models');

module.exports = class AirConditionerDriver extends Homey.Driver {

  async onPairListDevices() {
    const api = this.homey.app.getApi();
    if (!api) {
      throw new Error('Not connected to Cozytouch. Please configure credentials in app settings.');
    }

    const devices = this.homey.app.getDevices();
    const result = [];

    for (const [deviceId, deviceData] of devices) {
      if (deviceData.modelInfo.type === DeviceType.AC) {
        result.push({
          name: deviceData.modelInfo.name || deviceData.name,
          data: {
            id: String(deviceId),
          },
          store: {
            deviceId,
            modelId: deviceData.modelId,
            zoneId: deviceData.zoneId,
            gatewaySerialNumber: deviceData.gatewaySerialNumber,
          },
        });
      }
    }

    return result;
  }

  async onPair(session) {
    session.setHandler('login', async (data) => {
      const api = new CozytouchApi({
        username: data.username,
        password: data.password,
        log: this.log.bind(this),
      });
      await api.testConnection();

      await this.homey.app.ensureSetup(data.username, data.password);

      return true;
    });

    session.setHandler('list_devices', async () => {
      return this.onPairListDevices();
    });
  }

};
