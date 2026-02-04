'use strict';

const Homey = require('homey');
const { getModelInfo } = require('../../lib/cozytouch-models');
const {
  CapabilityId,
  mapCapabilityToHomey,
  homeyModeToApiValue,
  homeyHeatingModeToApiValue,
} = require('../../lib/cozytouch-capabilities');

module.exports = class BoilerDevice extends Homey.Device {

  async onInit() {
    this._deviceId = this.getStoreValue('deviceId');
    this._modelId = this.getStoreValue('modelId');
    this._modelInfo = getModelInfo(this._modelId);

    this.log(`Init boiler device: ${this._modelInfo.name} (model ${this._modelId}, device ${this._deviceId})`);

    this._registerCapabilityListeners();
    this._registerPollListener();

    // Initial poll
    this.homey.app.pollDevice(this._deviceId);
  }

  _registerCapabilityListeners() {
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (value) => {
        const apiValue = homeyModeToApiValue(value, this._modelInfo);
        if (apiValue === null) {
          throw new Error(`Unsupported mode: ${value}`);
        }
        const capId = this._modelInfo.hvacModesCapabilityId[0];
        const api = this.homey.app.getApi();
        await api.setCapability(this._deviceId, capId, apiValue);
        this.homey.app.pollDevice(this._deviceId);
      });
    }

    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value) => {
        const api = this.homey.app.getApi();
        await api.setCapability(this._deviceId, CapabilityId.TARGET_TEMP, value);
        this.homey.app.pollDevice(this._deviceId);
      });
    }

    if (this.hasCapability('heating_mode')) {
      this.registerCapabilityListener('heating_mode', async (value) => {
        const apiValue = homeyHeatingModeToApiValue(value, this._modelInfo);
        if (apiValue === null) {
          throw new Error(`Unsupported heating mode: ${value}`);
        }
        const api = this.homey.app.getApi();
        await api.setCapability(this._deviceId, CapabilityId.HEATING_MODE, apiValue);
        this.homey.app.pollDevice(this._deviceId);
      });
    }

    if (this.hasCapability('away_mode')) {
      this.registerCapabilityListener('away_mode', async (value) => {
        const api = this.homey.app.getApi();
        if (value) {
          // Set away mode with default 7-day period
          const now = Math.floor(Date.now() / 1000);
          const oneWeek = 7 * 24 * 60 * 60;
          const setupData = this.homey.app.getSetupData();
          await api.setAwayMode(setupData.id, setupData, now, now + oneWeek);
        } else {
          const setupData = this.homey.app.getSetupData();
          await api.setAwayMode(setupData.id, setupData, null, null);
        }
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
