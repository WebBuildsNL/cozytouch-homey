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
    // Remove deprecated capabilities
    if (this.hasCapability('measure_power')) {
      await this.removeCapability('measure_power');
    }

    // Migrate renamed/removed capabilities
    if (this.hasCapability('hot_water_available')) {
      await this.removeCapability('hot_water_available');
    }
    if (this.hasCapability('onoff')) {
      await this.removeCapability('onoff');
    }

    // Add capabilities if not present (for devices paired before these were added)
    for (const cap of ['water_temperature', 'heating_schedule', 'inlet_temperature', 'outlet_temperature', 'measure_water']) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap);
      }
    }

    this._registerCapabilityListeners();
    this._registerPollListener();

    this.homey.app.pollDevice(this._deviceId);
  }

  _registerCapabilityListeners() {
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value) => {
        const api = this.homey.app.getApi();
        await api.setCapability(this._deviceId, CapabilityId.TARGET_TEMP_231, value);
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
      // For water heaters, use TARGET_TEMP_231 as the user-configured setpoint
      // and ignore TARGET_TEMP_DHW (22) which is the eco+-adjusted computed target
      if (cap.capabilityId === CapabilityId.TARGET_TEMP_DHW) continue;

      const mapped = mapCapabilityToHomey(cap.capabilityId, cap.value, this._modelInfo);
      if (!mapped) continue;

      // Skip thermostat_mode for water heaters (no on/off control)
      if (mapped.capability === 'thermostat_mode') continue;

      if (this.hasCapability(mapped.capability)) {
        this.setCapabilityValue(mapped.capability, mapped.value).catch((err) => {
          this.error(`Failed to set ${mapped.capability}:`, err.message);
        });

        // Mirror water temperature to custom capability for stats overview
        if (mapped.capability === 'measure_temperature' && this.hasCapability('water_temperature')) {
          this.setCapabilityValue('water_temperature', mapped.value).catch((err) => {
            this.error('Failed to set water_temperature:', err.message);
          });
        }
      }
    }

    // Update heating schedule for today
    this._updateSchedule(capabilities);
  }

  _updateSchedule(capabilities) {
    if (!this.hasCapability('heating_schedule')) return;

    // Schedule capabilities: Mon=245, Tue=246, ..., Sun=251
    const dayIndex = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    // Map JS day (0=Sun) to API day (Mon=245..Sun=251)
    const scheduleCapId = dayIndex === 0 ? CapabilityId.SCHEDULE_SUN : 244 + dayIndex;

    const scheduleCap = capabilities.find((c) => c.capabilityId === scheduleCapId);
    if (!scheduleCap) return;

    try {
      const slots = JSON.parse(scheduleCap.value);
      const timeSlots = slots
        .filter((slot) => slot[0] !== 0 || slot[1] !== 0)
        .map((slot) => {
          const startH = String(Math.floor(slot[0] / 60)).padStart(2, '0');
          const startM = String(slot[0] % 60).padStart(2, '0');
          const endH = String(Math.floor(slot[1] / 60)).padStart(2, '0');
          const endM = String(slot[1] % 60).padStart(2, '0');
          return `${startH}:${startM} - ${endH}:${endM}`;
        });

      const scheduleText = timeSlots.length > 0 ? timeSlots.join(', ') : '-';
      this.setCapabilityValue('heating_schedule', scheduleText).catch((err) => {
        this.error('Failed to set heating_schedule:', err.message);
      });
    } catch (err) {
      this.error('Failed to parse schedule:', err.message);
    }
  }

  async onDeleted() {
    if (this._onDeviceUpdate) {
      this.homey.removeListener(`cozytouch.deviceUpdate.${this._deviceId}`, this._onDeviceUpdate);
    }
  }

};
