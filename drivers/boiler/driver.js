'use strict';

const Homey = require('homey');
const CozytouchApi = require('../../lib/cozytouch-api');
const { DeviceType } = require('../../lib/cozytouch-models');

const BOILER_TYPES = [DeviceType.GAZ_BOILER, DeviceType.HEAT_PUMP, DeviceType.THERMOSTAT];

module.exports = class BoilerDriver extends Homey.Driver {

  async onPairListDevices() {
    const api = this.homey.app.getApi();
    if (!api) {
      throw new Error(this.homey.__('errors.not_connected'));
    }

    const devices = this.homey.app.getDevices();
    const result = [];

    for (const [deviceId, deviceData] of devices) {
      if (BOILER_TYPES.includes(deviceData.modelInfo.type)) {
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
      // Validate credentials
      const api = new CozytouchApi({
        username: data.username,
        password: data.password,
        log: this.log.bind(this),
      });
      await api.testConnection();

      // Connect the app and fetch devices (awaits completion)
      await this.homey.app.ensureSetup(data.username, data.password);

      return true;
    });

    session.setHandler('list_devices', async () => {
      return this.onPairListDevices();
    });
  }

};
