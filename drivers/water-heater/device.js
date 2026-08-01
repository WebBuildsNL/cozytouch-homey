'use strict';

const Homey = require('homey');
const { getModelInfo } = require('../../lib/cozytouch-models');
const {
  CapabilityId,
  mapCapabilityToHomey,
  homeyHeatingModeToApiValue,
} = require('../../lib/cozytouch-capabilities');

const WEEKDAY_TO_SCHEDULE_CAPABILITY = {
  Mon: CapabilityId.SCHEDULE_MON,
  Tue: CapabilityId.SCHEDULE_TUE,
  Wed: CapabilityId.SCHEDULE_WED,
  Thu: CapabilityId.SCHEDULE_THU,
  Fri: CapabilityId.SCHEDULE_FRI,
  Sat: CapabilityId.SCHEDULE_SAT,
  Sun: CapabilityId.SCHEDULE_SUN,
};

module.exports = class WaterHeaterDevice extends Homey.Device {

  async onInit() {
    this._deviceId = this.getStoreValue('deviceId');
    this._modelId = this.getStoreValue('modelId');
    this._modelInfo = getModelInfo(this._modelId);

    this.log(`Init water heater device: ${this._modelInfo.name} (model ${this._modelId}, device ${this._deviceId})`);

    // Migrate to the dedicated waterheater device class
    if (this.getClass() !== 'waterheater') {
      await this.setClass('waterheater').catch((err) => {
        this.error('Failed to update device class:', err.message);
      });
    }

    // Remove deprecated capabilities
    if (this.hasCapability('evaporator_temperature')) {
      await this.removeCapability('evaporator_temperature');
    }
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

  _getApi() {
    const api = this.homey.app.getApi();
    if (!api) {
      throw new Error('Not connected to Cozytouch. Check the credentials in the app settings.');
    }
    return api;
  }

  _registerCapabilityListeners() {
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value) => {
        await this._getApi().setCapability(this._deviceId, CapabilityId.TARGET_TEMP_231, value);
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
          this._fireChangeTriggers('heating_mode', value, previous);
        }
        this.homey.app.pollDevice(this._deviceId);
      });
    }

    if (this.hasCapability('boost_mode')) {
      this.registerCapabilityListener('boost_mode', async (value) => {
        const previous = this.getCapabilityValue('boost_mode');
        await this._getApi().setCapability(this._deviceId, CapabilityId.BOOST_MODE, value ? 1 : 0);
        if (previous !== null && previous !== value) {
          this._fireChangeTriggers('boost_mode', value, previous);
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
      // For water heaters, use TARGET_TEMP_231 as the user-configured setpoint
      // and ignore TARGET_TEMP_DHW (22) which is the eco+-adjusted computed target
      if (cap.capabilityId === CapabilityId.TARGET_TEMP_DHW) continue;

      const mapped = mapCapabilityToHomey(cap.capabilityId, cap.value, this._modelInfo);
      if (!mapped) continue;

      // Skip thermostat_mode for water heaters (no on/off control)
      if (mapped.capability === 'thermostat_mode') continue;

      if (this.hasCapability(mapped.capability)) {
        const previous = this.getCapabilityValue(mapped.capability);
        this.setCapabilityValue(mapped.capability, mapped.value).catch((err) => {
          this.error(`Failed to set ${mapped.capability}:`, err.message);
        });
        if (previous !== null && previous !== mapped.value) {
          this._fireChangeTriggers(mapped.capability, mapped.value, previous);
        }

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

  _fireChangeTriggers(capability, value, previous) {
    if (capability === 'boost_mode') {
      const card = value ? 'boost-mode-turned-on' : 'boost-mode-turned-off';
      this.homey.flow.getDeviceTriggerCard(card)
        .trigger(this)
        .catch((err) => this.error(`Failed to trigger ${card}:`, err.message));
    } else if (capability === 'heating_mode') {
      this.homey.flow.getDeviceTriggerCard('heating-mode-changed')
        .trigger(this, { mode: value })
        .catch((err) => this.error('Failed to trigger heating-mode-changed:', err.message));
    } else if (capability === 'measure_water') {
      this.homey.flow.getDeviceTriggerCard('hot-water-below')
        .trigger(this, { percentage: value }, { previous, current: value })
        .catch((err) => this.error('Failed to trigger hot-water-below:', err.message));
    }
  }

  _updateSchedule(capabilities) {
    if (!this.hasCapability('heating_schedule')) return;

    // Determine the current weekday in Homey's configured timezone; the
    // system clock runs in UTC so new Date().getDay() would be off around midnight
    const timezone = this.homey.clock.getTimezone();
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(new Date());
    const scheduleCapId = WEEKDAY_TO_SCHEDULE_CAPABILITY[weekday];
    if (!scheduleCapId) return;

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
