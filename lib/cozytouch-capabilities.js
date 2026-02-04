'use strict';

/**
 * Maps Cozytouch API capability IDs to Homey capability names.
 * Ported from HA integration capability.py.
 *
 * Only includes capabilities that map to Homey device capabilities.
 */
const CapabilityId = {
  // HVAC mode (zone 1 alt / zone 2 alt for heat pump 211)
  HVAC_MODE_Z1_ALT: 1,
  HVAC_MODE_Z2_ALT: 2,
  // HVAC mode (default zone 1 / zone 2)
  HVAC_MODE_Z1: 7,
  HVAC_MODE_Z2: 8,

  // Target temperatures
  TARGET_TEMP_HP_Z1: 17,
  TARGET_TEMP_HP_Z2: 18,
  TEMP_SETPOINT: 19,
  TARGET_TEMP_DHW: 22,
  TARGET_TEMP: 40,
  TARGET_TEMP_COOL: 177,
  TARGET_TEMP_231: 231,

  // Current temperatures
  THERMOSTAT_TEMP_Z1: 117,
  THERMOSTAT_TEMP_Z2: 118,
  OUTSIDE_TEMP: 119,
  BOILER_WATER_TEMP: 109,
  DHW_TEMP: 111,
  EXHAUST_TEMP: 116,

  // Energy
  CH_POWER_CONSUMPTION: 44,
  DHW_POWER_CONSUMPTION: 45,
  TOTAL_POWER_CONSUMPTION: 46,
  POWER_CONSUMPTION_57: 57,
  POWER_CONSUMPTION_59: 59,

  // Switches / modes
  DHW_SWITCH: 86,
  HEATING_MODE: 87,
  AWAY_MODE: 152,
  AWAY_MODE_ALT: 227,
  AWAY_MODE_TIMESTAMPS: 222,
  AWAY_MODE_TIMESTAMPS_ALT: 226,
  BOOST_MODE: 165,
  BOOST_MODE_ALT: 104044,
  PROG_MODE: 184,

  // AC specific
  FAN_MODE: 100801,
  QUIET_MODE: 100802,
  SWING_MODE: 100803,
  SWING_ON: 100804,
  POWERFUL_MODE: 100505,
  PRESENCE_MODE: 100506,
  ECO_MODE: 100507,

  // Status
  FLAME: 153,
  WATER_PRESSURE: 100,
  RADIO_SIGNAL: 169,
  WIFI_SIGNAL: 179,

  // Water heater specific
  DHW_CURRENT_TEMP: 265,
  DHW_EVAPORATOR_TEMP: 267,
  DHW_INLET_TEMP: 280,
  DHW_OUTLET_TEMP: 228,
  HOT_WATER_AVAILABLE: 271,
  V40_WATER_AVAILABLE: 268,
  TANK_CAPACITY: 258,
};

function mapHvacMode(apiValue, modelInfo) {
  if (!modelInfo || !modelInfo.hvacModes) return null;
  const mode = modelInfo.hvacModes[apiValue];
  if (!mode) return null;

  const homeyModeMap = {
    off: 'off',
    heat: 'heat',
    auto: 'auto',
    cool: 'cool',
    fan_only: 'off',
    dry: 'off',
  };

  const homeyMode = homeyModeMap[mode] || 'off';
  return { capability: 'thermostat_mode', value: homeyMode };
}

function mapHeatingMode(apiValue, modelInfo) {
  if (!modelInfo || !modelInfo.heatingModes) return null;
  const mode = modelInfo.heatingModes[apiValue];
  return mode ? { capability: 'heating_mode', value: mode } : null;
}

function mapFanMode(apiValue, modelInfo) {
  if (!modelInfo || !modelInfo.fanModes) return null;
  const mode = modelInfo.fanModes[apiValue];
  return mode ? { capability: 'cozytouch_fan_mode', value: mode } : null;
}

function mapSwingMode(apiValue, modelInfo) {
  if (!modelInfo || !modelInfo.swingModes) return null;
  const mode = modelInfo.swingModes[apiValue];
  return mode ? { capability: 'cozytouch_swing_mode', value: mode } : null;
}

/**
 * Map a Cozytouch capability to a Homey capability value.
 * Handles type conversion and value mapping.
 */
function mapCapabilityToHomey(capabilityId, value, modelInfo) {
  switch (capabilityId) {
    // Temperatures
    case CapabilityId.THERMOSTAT_TEMP_Z1:
    case CapabilityId.THERMOSTAT_TEMP_Z2:
    case CapabilityId.OUTSIDE_TEMP:
    case CapabilityId.BOILER_WATER_TEMP:
    case CapabilityId.DHW_TEMP:
    case CapabilityId.DHW_CURRENT_TEMP:
    case CapabilityId.EXHAUST_TEMP:
      return { capability: 'measure_temperature', value: parseFloat(value) };

    // Water heater heat pump temperatures
    case CapabilityId.DHW_INLET_TEMP:
      return { capability: 'inlet_temperature', value: parseFloat(value) };
    case CapabilityId.DHW_OUTLET_TEMP:
      return { capability: 'outlet_temperature', value: parseFloat(value) };

    // Hot water availability percentage
    case CapabilityId.HOT_WATER_AVAILABLE:
      return { capability: 'hot_water_available', value: parseInt(value, 10) };

    case CapabilityId.TARGET_TEMP:
    case CapabilityId.TARGET_TEMP_HP_Z1:
    case CapabilityId.TARGET_TEMP_HP_Z2:
    case CapabilityId.TARGET_TEMP_DHW:
    case CapabilityId.TARGET_TEMP_231:
    case CapabilityId.TEMP_SETPOINT:
      return { capability: 'target_temperature', value: parseFloat(value) };

    // Current power consumption (watts)
    case CapabilityId.POWER_CONSUMPTION_57:
      return { capability: 'measure_power', value: parseFloat(value) };

    // Cumulative energy (API returns Wh, Homey expects kWh)
    case CapabilityId.CH_POWER_CONSUMPTION:
    case CapabilityId.DHW_POWER_CONSUMPTION:
    case CapabilityId.TOTAL_POWER_CONSUMPTION:
    case CapabilityId.POWER_CONSUMPTION_59:
      return { capability: 'meter_power', value: parseFloat(value) / 1000 };

    // HVAC mode → thermostat_mode
    case CapabilityId.HVAC_MODE_Z1:
    case CapabilityId.HVAC_MODE_Z2:
    case CapabilityId.HVAC_MODE_Z1_ALT:
    case CapabilityId.HVAC_MODE_Z2_ALT:
      return mapHvacMode(parseInt(value, 10), modelInfo);

    // Heating mode (water heater / heat pump select)
    case CapabilityId.HEATING_MODE:
      return mapHeatingMode(parseInt(value, 10), modelInfo);

    // DHW on/off
    case CapabilityId.DHW_SWITCH:
      return { capability: 'onoff', value: parseInt(value, 10) === 1 };

    // Away mode
    case CapabilityId.AWAY_MODE:
    case CapabilityId.AWAY_MODE_ALT:
      return { capability: 'away_mode', value: parseInt(value, 10) === 1 };

    // Boost mode
    case CapabilityId.BOOST_MODE:
    case CapabilityId.BOOST_MODE_ALT:
      return { capability: 'boost_mode', value: parseInt(value, 10) === 1 };

    // AC fan mode
    case CapabilityId.FAN_MODE:
      return mapFanMode(parseInt(value, 10), modelInfo);

    // AC swing mode
    case CapabilityId.SWING_MODE:
      return mapSwingMode(parseInt(value, 10), modelInfo);

    default:
      return null;
  }
}

/**
 * Reverse map: convert Homey thermostat_mode to API value.
 */
function homeyModeToApiValue(homeyMode, modelInfo) {
  if (homeyMode === 'off') return 0;

  // Find the API value that maps to this Homey mode
  const modeMapping = {
    heat: ['heat'],
    auto: ['auto'],
    cool: ['cool'],
  };

  const targetModes = modeMapping[homeyMode] || [];
  for (const [apiVal, modeName] of Object.entries(modelInfo.hvacModes)) {
    if (targetModes.includes(modeName)) {
      return parseInt(apiVal, 10);
    }
  }

  return null;
}

/**
 * Reverse map: convert Homey heating_mode to API value.
 */
function homeyHeatingModeToApiValue(homeyMode, modelInfo) {
  if (!modelInfo || !modelInfo.heatingModes) return null;
  for (const [apiVal, modeName] of Object.entries(modelInfo.heatingModes)) {
    if (modeName === homeyMode) {
      return parseInt(apiVal, 10);
    }
  }
  return null;
}

/**
 * Reverse map: convert Homey fan mode to API value.
 */
function homeyFanModeToApiValue(homeyMode, modelInfo) {
  if (!modelInfo || !modelInfo.fanModes) return null;
  for (const [apiVal, modeName] of Object.entries(modelInfo.fanModes)) {
    if (modeName === homeyMode) {
      return parseInt(apiVal, 10);
    }
  }
  return null;
}

/**
 * Reverse map: convert Homey swing mode to API value.
 */
function homeySwingModeToApiValue(homeyMode, modelInfo) {
  if (!modelInfo || !modelInfo.swingModes) return null;
  for (const [apiVal, modeName] of Object.entries(modelInfo.swingModes)) {
    if (modeName === homeyMode) {
      return parseInt(apiVal, 10);
    }
  }
  return null;
}

module.exports = {
  CapabilityId,
  mapCapabilityToHomey,
  homeyModeToApiValue,
  homeyHeatingModeToApiValue,
  homeyFanModeToApiValue,
  homeySwingModeToApiValue,
};
