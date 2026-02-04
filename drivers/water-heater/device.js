'use strict';

const Homey = require('homey');
const { getModelInfo } = require('../../lib/cozytouch-models');
const {
  CapabilityId,
  mapCapabilityToHomey,
  homeyHeatingModeToApiValue,
} = require('../../lib/cozytouch-capabilities');

module.exports = class WaterHeaterDevice extends Homey.Device {

  async onInit() {
    this._deviceId = this.getStoreValue('deviceId');
    this._modelId = this.getStoreValue('modelId');
    this._modelInfo = getModelInfo(this._modelId);

    this.log(`Init water heater device: ${this._modelInfo.name} (model ${this._modelId}, device ${this._deviceId})`);

    // Remove deprecated capabilities
    if (this.hasCapability('evaporator_temperature')) {
      await this.removeCapability('evaporator_temperature');
    }

    // Add capabilities if not present (for devices paired before these were added)
    for (const cap of ['measure_power', 'inlet_temperature', 'outlet_temperature', 'hot_water_available']) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap);
      }
    }

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

    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value) => {
        const api = this.homey.app.getApi();
        await api.setCapability(this._deviceId, CapabilityId.TARGET_TEMP_DHW, value);
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

    if (this.hasCapability('boost_mode')) {
      this.registerCapabilityListener('boost_mode', async (value) => {
        const api = this.homey.app.getApi();
        await api.setCapability(this._deviceId, CapabilityId.BOOST_MODE, value ? 1 : 0);
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
      // For water heaters, use TARGET_TEMP_DHW (22) as the active target temperature
      // and ignore TARGET_TEMP_231 which is the manual/comfort setpoint
      if (cap.capabilityId === CapabilityId.TARGET_TEMP_231) continue;

      const mapped = mapCapabilityToHomey(cap.capabilityId, cap.value, this._modelInfo);
      if (!mapped) continue;

      // Map HVAC mode to onoff for water heaters
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
