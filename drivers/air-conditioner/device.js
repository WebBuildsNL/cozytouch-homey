'use strict';

const Homey = require('homey');
const { getModelInfo } = require('../../lib/cozytouch-models');
const {
  CapabilityId,
  mapCapabilityToHomey,
  homeyModeToApiValue,
  homeyFanModeToApiValue,
  homeySwingModeToApiValue,
} = require('../../lib/cozytouch-capabilities');

module.exports = class AirConditionerDevice extends Homey.Device {

  async onInit() {
    this._deviceId = this.getStoreValue('deviceId');
    this._modelId = this.getStoreValue('modelId');
    this._modelInfo = getModelInfo(this._modelId);

    this.log(`Init AC device: ${this._modelInfo.name} (model ${this._modelId}, device ${this._deviceId})`);

    this._registerCapabilityListeners();
    this._registerPollListener();

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

    if (this.hasCapability('cozytouch_fan_mode')) {
      this.registerCapabilityListener('cozytouch_fan_mode', async (value) => {
        const apiValue = homeyFanModeToApiValue(value, this._modelInfo);
        if (apiValue === null) {
          throw new Error(`Unsupported fan mode: ${value}`);
        }
        const api = this.homey.app.getApi();
        await api.setCapability(this._deviceId, CapabilityId.FAN_MODE, apiValue);
        this.homey.app.pollDevice(this._deviceId);
      });
    }

    if (this.hasCapability('cozytouch_swing_mode')) {
      this.registerCapabilityListener('cozytouch_swing_mode', async (value) => {
        const apiValue = homeySwingModeToApiValue(value, this._modelInfo);
        if (apiValue === null) {
          throw new Error(`Unsupported swing mode: ${value}`);
        }
        const api = this.homey.app.getApi();
        await api.setCapability(this._deviceId, CapabilityId.SWING_MODE, apiValue);
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
