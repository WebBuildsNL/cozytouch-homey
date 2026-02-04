'use strict';

const Homey = require('homey');
const { getModelInfo } = require('../../lib/cozytouch-models');
const {
  mapCapabilityToHomey,
} = require('../../lib/cozytouch-capabilities');

module.exports = class TowelRackDevice extends Homey.Device {

  async onInit() {
    this._deviceId = this.getStoreValue('deviceId');
    this._modelId = this.getStoreValue('modelId');
    this._modelInfo = getModelInfo(this._modelId);

    this.log(`Init towel rack device: ${this._modelInfo.name} (model ${this._modelId}, device ${this._deviceId})`);

    this._registerCapabilityListeners();
    this._registerPollListener();

    this.homey.app.pollDevice(this._deviceId);
  }

  _registerCapabilityListeners() {
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        const apiValue = value ? 4 : 0; // 4=HEAT, 0=OFF
        const capId = this._modelInfo.hvacModesCapabilityId[0];
        const api = this.homey.app.getApi();
        await api.setCapability(this._deviceId, capId, apiValue);
        this.homey.app.pollDevice(this._deviceId);
      });
    }
  }

  _registerPollListener() {
    this._onDeviceUpdate = (capabilities) => {
      this._updateCapabilities(capabilities);
    };
    this.homey.on(`cozytouch.deviceUpdate.${this._deviceId}`, this._onDeviceUpdate);
  }

  _updateCapabilities(capabilities) {
    for (const cap of capabilities) {
      const mapped = mapCapabilityToHomey(cap.capabilityId, cap.value, this._modelInfo);
      if (!mapped) continue;

      // Map HVAC mode to onoff for towel racks
      if (mapped.capability === 'thermostat_mode') {
        if (this.hasCapability('onoff')) {
          this.setCapabilityValue('onoff', mapped.value !== 'off').catch((err) => {
            this.error('Failed to set onoff:', err.message);
          });
        }
        continue;
      }

      if (this.hasCapability(mapped.capability)) {
        this.setCapabilityValue(mapped.capability, mapped.value).catch((err) => {
          this.error(`Failed to set ${mapped.capability}:`, err.message);
        });
      }
    }
  }

  async onDeleted() {
    if (this._onDeviceUpdate) {
      this.homey.removeListener(`cozytouch.deviceUpdate.${this._deviceId}`, this._onDeviceUpdate);
    }
  }

};
