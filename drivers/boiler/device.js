'use strict';

const Homey = require('homey');
const { getModelInfo } = require('../../lib/cozytouch-models');
const {
  CapabilityId,
  mapCapabilityToHomey,
  homeyModeToApiValue,
  homeyHeatingModeToApiValue,
} = require('../../lib/cozytouch-capabilities');

// API capability IDs that all report a temperature. These are routed to
// dedicated Homey capabilities in _updateTemperature(); left to the generic
// mapping they would all collapse into measure_temperature and overwrite
// each other on every poll.
const TEMPERATURE_CAPABILITY_IDS = [
  CapabilityId.THERMOSTAT_TEMP_Z1,
  CapabilityId.THERMOSTAT_TEMP_Z2,
  CapabilityId.OUTSIDE_TEMP,
  CapabilityId.BOILER_WATER_TEMP,
  CapabilityId.DHW_TEMP,
  CapabilityId.EXHAUST_TEMP,
  CapabilityId.DHW_CURRENT_TEMP,
];

module.exports = class BoilerDevice extends Homey.Device {

  async onInit() {
    this._deviceId = this.getStoreValue('deviceId');
    this._modelId = this.getStoreValue('modelId');
    this._modelInfo = getModelInfo(this._modelId);

    this.log(`Init boiler device: ${this._modelInfo.name} (model ${this._modelId}, device ${this._deviceId})`);

    // Add capabilities if not present (for devices paired before these were added)
    for (const cap of ['water_temperature', 'outside_temperature']) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap);
      }
    }

    this._registerCapabilityListeners();
    this._registerPollListener();

    // Initial poll
    this.homey.app.pollDevice(this._deviceId);
  }

  _getApi() {
    const api = this.homey.app.getApi();
    if (!api) {
      throw new Error('Not connected to Cozytouch. Check the credentials in the app settings.');
    }
    return api;
  }

  _registerCapabilityListeners() {
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (value) => {
        const apiValue = homeyModeToApiValue(value, this._modelInfo);
        if (apiValue === null) {
          throw new Error(`Unsupported mode: ${value}`);
        }
        const capId = this._modelInfo.hvacModesCapabilityId[0];
        await this._getApi().setCapability(this._deviceId, capId, apiValue);
        this.homey.app.pollDevice(this._deviceId);
      });
    }

    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value) => {
        await this._getApi().setCapability(this._deviceId, CapabilityId.TARGET_TEMP, value);
        this.homey.app.pollDevice(this._deviceId);
      });
    }

    if (this.hasCapability('heating_mode')) {
      this.registerCapabilityListener('heating_mode', async (value) => {
        const apiValue = homeyHeatingModeToApiValue(value, this._modelInfo);
        if (apiValue === null) {
          throw new Error(`Unsupported heating mode: ${value}`);
        }
        const previous = this.getCapabilityValue('heating_mode');
        await this._getApi().setCapability(this._deviceId, CapabilityId.HEATING_MODE, apiValue);
        if (previous !== null && previous !== value) {
          this._triggerHeatingModeChanged(value);
        }
        this.homey.app.pollDevice(this._deviceId);
      });
    }

    if (this.hasCapability('away_mode')) {
      this.registerCapabilityListener('away_mode', async (value) => {
        const api = this._getApi();
        const setupData = this.homey.app.getSetupData();
        if (value) {
          // Set away mode with default 7-day period
          const now = Math.floor(Date.now() / 1000);
          const oneWeek = 7 * 24 * 60 * 60;
          await api.setAwayMode(setupData.id, setupData, now, now + oneWeek);
        } else {
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
      if (TEMPERATURE_CAPABILITY_IDS.includes(cap.capabilityId)) {
        this._updateTemperature(cap.capabilityId, parseFloat(cap.value));
        continue;
      }

      const mapped = mapCapabilityToHomey(cap.capabilityId, cap.value, this._modelInfo);
      if (!mapped) continue;

      if (this.hasCapability(mapped.capability)) {
        const previous = this.getCapabilityValue(mapped.capability);
        this.setCapabilityValue(mapped.capability, mapped.value).catch((err) => {
          this.error(`Failed to set ${mapped.capability}:`, err.message);
        });
        if (mapped.capability === 'heating_mode' && previous !== null && previous !== mapped.value) {
          this._triggerHeatingModeChanged(mapped.value);
        }
      }
    }
  }

  /**
   * The room temperature comes from zone 1 or zone 2 depending on the model.
   */
  _roomTemperatureCapabilityId() {
    if (this._modelInfo.z1TempAvailable === false && this._modelInfo.z2TempAvailable) {
      return CapabilityId.THERMOSTAT_TEMP_Z2;
    }
    return CapabilityId.THERMOSTAT_TEMP_Z1;
  }

  _updateTemperature(capabilityId, value) {
    if (Number.isNaN(value)) return;

    let capability = null;
    if (capabilityId === this._roomTemperatureCapabilityId()) {
      capability = 'measure_temperature';
    } else if (capabilityId === CapabilityId.OUTSIDE_TEMP) {
      // The API reports -327.68 when no outside sensor is connected
      if (value <= -100) return;
      capability = 'outside_temperature';
    } else if (capabilityId === CapabilityId.BOILER_WATER_TEMP) {
      capability = 'water_temperature';
    }

    if (capability && this.hasCapability(capability)) {
      this.setCapabilityValue(capability, value).catch((err) => {
        this.error(`Failed to set ${capability}:`, err.message);
      });
    }
  }

  _triggerHeatingModeChanged(mode) {
    this.homey.flow.getDeviceTriggerCard('heating-mode-changed')
      .trigger(this, { mode })
      .catch((err) => this.error('Failed to trigger heating-mode-changed:', err.message));
  }

  async onDeleted() {
    if (this._onDeviceUpdate) {
      this.homey.removeListener(`cozytouch.deviceUpdate.${this._deviceId}`, this._onDeviceUpdate);
    }
  }

};
