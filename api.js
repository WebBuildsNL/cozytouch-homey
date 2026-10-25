'use strict';

const CozytouchApi = require('./lib/cozytouch-api');
const { getModelInfo } = require('./lib/cozytouch-models');

module.exports = {
  async testCredentials({ homey, body }) {
    const { username, password } = body;

    if (!username || !password) {
      throw new Error('Please provide both email and password.');
    }

    const api = new CozytouchApi({
      username,
      password,
      log: homey.app.log.bind(homey.app),
    });

    await api.authenticate();
    const setup = await api.getSetup();

    // Build debug info about what we found
    const rawDevices = setup.devices || [];
    const debugDevices = rawDevices.map((dev) => {
      const modelInfo = getModelInfo(dev.modelId, dev.productId);
      return {
        deviceId: dev.deviceId,
        name: dev.name,
        modelId: dev.modelId,
        productId: dev.productId,
        resolvedType: modelInfo.type,
        resolvedName: modelInfo.name,
      };
    });

    return {
      deviceCount: rawDevices.length,
      setupKeys: Object.keys(setup),
      devices: debugDevices,
    };
  },

};
