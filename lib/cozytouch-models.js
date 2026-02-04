'use strict';

/**
 * Device type constants matching the HA integration.
 */
const DeviceType = {
  UNKNOWN: 'unknown',
  THERMOSTAT: 'thermostat',
  GAZ_BOILER: 'gaz_boiler',
  HEAT_PUMP: 'heat_pump',
  WATER_HEATER: 'water_heater',
  TOWEL_RACK: 'towel_rack',
  AC: 'ac',
  AC_CONTROLLER: 'ac_controller',
  HUB: 'hub',
};

/**
 * HVAC mode value constants (sent to/from API).
 */
const HVACMode = {
  OFF: 0,
  AUTO: 1,
  HEAT_ALT: 2,
  COOL: 3,
  HEAT: 4,
  FAN_ONLY: 7,
  DRY: 8,
};

/**
 * Heating mode value constants (for water heaters, heat pumps).
 */
const HeatingMode = {
  MANUAL: 0,
  ECO_PLUS: 3,
  PROG: 4,
};

/**
 * Fan mode value constants (AC).
 */
const FanMode = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  AUTO: 5,
};

/**
 * Swing mode value constants (AC).
 */
const SwingMode = {
  UP: 1,
  MIDDLE_UP: 2,
  MIDDLE_DOWN: 3,
  DOWN: 4,
};

/**
 * Model database mapping model IDs to device info.
 * Ported from HA integration model.py.
 */
const MODEL_DATABASE = {
  // --- Gas Boilers ---
  56: {
    name: 'Naema 2 Micro 25',
    type: DeviceType.GAZ_BOILER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },
  61: {
    name: 'Naia 2 Micro 25',
    type: DeviceType.GAZ_BOILER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },
  65: {
    name: 'Naema 2 Duo 25',
    type: DeviceType.GAZ_BOILER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },
  1444: {
    name: 'Naema 3 Micro 25',
    type: DeviceType.GAZ_BOILER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },

  // --- Heat Pumps ---
  76: {
    name: 'Alfea Extensa Duo AI UE',
    type: DeviceType.HEAT_PUMP,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual' },
    z1TempAvailable: false,
    z2TempAvailable: true,
    exhaustTempAvailable: false,
  },
  211: {
    name: 'Alfea Extensa Duo A.I. 3 R32',
    type: DeviceType.HEAT_PUMP,
    hvacModes: { 0: 'off', 1: 'heat', 2: 'auto' },
    hvacModesCapabilityId: [1, 2],
    heatingModes: { 0: 'manual' },
    z1TempAvailable: true,
    z2TempAvailable: true,
    exhaustTempAvailable: false,
  },

  // --- Thermostats ---
  235: {
    name: 'Thermostat Navilink Connect',
    type: DeviceType.THERMOSTAT,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },
  418: {
    name: 'Atlantic Loria Duo 6006',
    type: DeviceType.THERMOSTAT,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    exhaustTempAvailable: true,
    z1TempAvailable: true,
    z2TempAvailable: false,
    overrideModeAvailable: true,
  },

  // --- Water Heaters ---
  236: {
    name: 'Sauter Phazy',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },
  389: {
    name: 'AQUEO ACI HYB VS 300L 3000M',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },
  390: {
    name: 'AQUEO ACI HYB VM 150L 2200M',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },
  1369: {
    name: 'Calypso Split',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },
  1371: {
    name: 'Aeromax SPLIT 3',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },
  1372: {
    name: 'Aeromax SPLIT 3',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },
  1376: {
    name: 'Calypso Split',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },
  1642: {
    name: 'Atlantic Explorer V5 270L',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },
  1644: {
    name: 'Atlantic Explorer V5 240L',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },
  1645: {
    name: 'Atlantic Explorer V5 270L Coil',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },
  1656: {
    name: 'Aeromax 6',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },
  1657: {
    name: 'Calypso 200L',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },
  1966: {
    name: 'Thermor Malicio 3 120L',
    type: DeviceType.WATER_HEATER,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
    heatingModes: { 0: 'manual', 3: 'eco_plus', 4: 'prog' },
  },

  // --- Towel Racks ---
  1381: {
    name: 'KELUD 1750W BLC',
    type: DeviceType.TOWEL_RACK,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },
  1382: {
    name: 'KELUD 1750W Anthracite',
    type: DeviceType.TOWEL_RACK,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },
  1388: {
    name: 'Doris Etroit 1500W BLC',
    type: DeviceType.TOWEL_RACK,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },
  1543: {
    name: 'Asama Connecte II Ventilo 1750W Blanc',
    type: DeviceType.TOWEL_RACK,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },
  1546: {
    name: 'Asama Connecte II Ventilo 1500W ANTH',
    type: DeviceType.TOWEL_RACK,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },
  1547: {
    name: 'Asama Connecte II Ventilo 1750W ANTH',
    type: DeviceType.TOWEL_RACK,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },
  1551: {
    name: 'Asama Connecte II Ventilo 1750W Noir',
    type: DeviceType.TOWEL_RACK,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },
  1622: {
    name: 'Thermor Riva 5',
    type: DeviceType.TOWEL_RACK,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  },

  // --- Air Conditioners (557-561) ---
  557: {
    name: 'Takao M3 / Naviclim',
    type: DeviceType.AC,
    hvacModes: {
      0: 'off', 1: 'auto', 3: 'cool', 4: 'heat', 7: 'fan_only', 8: 'dry',
    },
    hvacModesCapabilityId: [7, 8],
    fanModes: {
      1: 'low', 2: 'medium', 3: 'high', 5: 'auto',
    },
    swingModes: {
      1: 'up', 2: 'middle_up', 3: 'middle_down', 4: 'down',
    },
    quietModeAvailable: true,
  },
  558: {
    name: 'Takao M3 / Naviclim',
    type: DeviceType.AC,
    hvacModes: {
      0: 'off', 1: 'auto', 3: 'cool', 4: 'heat', 7: 'fan_only', 8: 'dry',
    },
    hvacModesCapabilityId: [7, 8],
    fanModes: {
      1: 'low', 2: 'medium', 3: 'high', 5: 'auto',
    },
    swingModes: {
      1: 'up', 2: 'middle_up', 3: 'middle_down', 4: 'down',
    },
    quietModeAvailable: true,
  },
  559: {
    name: 'Takao M3 / Naviclim',
    type: DeviceType.AC,
    hvacModes: {
      0: 'off', 1: 'auto', 3: 'cool', 4: 'heat', 7: 'fan_only', 8: 'dry',
    },
    hvacModesCapabilityId: [7, 8],
    fanModes: {
      1: 'low', 2: 'medium', 3: 'high', 5: 'auto',
    },
    swingModes: {
      1: 'up', 2: 'middle_up', 3: 'middle_down', 4: 'down',
    },
    quietModeAvailable: true,
  },
  560: {
    name: 'Takao M3 / Naviclim',
    type: DeviceType.AC,
    hvacModes: {
      0: 'off', 1: 'auto', 3: 'cool', 4: 'heat', 7: 'fan_only', 8: 'dry',
    },
    hvacModesCapabilityId: [7, 8],
    fanModes: {
      1: 'low', 2: 'medium', 3: 'high', 5: 'auto',
    },
    swingModes: {
      1: 'up', 2: 'middle_up', 3: 'middle_down', 4: 'down',
    },
    quietModeAvailable: true,
  },
  561: {
    name: 'Takao M3 / Naviclim',
    type: DeviceType.AC,
    hvacModes: {
      0: 'off', 1: 'auto', 3: 'cool', 4: 'heat', 7: 'fan_only', 8: 'dry',
    },
    hvacModesCapabilityId: [7, 8],
    fanModes: {
      1: 'low', 2: 'medium', 3: 'high', 5: 'auto',
    },
    swingModes: {
      1: 'up', 2: 'middle_up', 3: 'middle_down', 4: 'down',
    },
    quietModeAvailable: true,
  },

  // --- AC Controllers (skipped, no user-facing controls) ---
  562: {
    name: 'Naviclim Controller', type: DeviceType.AC_CONTROLLER, hvacModes: { 0: 'off' }, hvacModesCapabilityId: [7, 8],
  },
  563: {
    name: 'Naviclim Controller', type: DeviceType.AC_CONTROLLER, hvacModes: { 0: 'off' }, hvacModesCapabilityId: [7, 8],
  },
  564: {
    name: 'Naviclim Controller', type: DeviceType.AC_CONTROLLER, hvacModes: { 0: 'off' }, hvacModesCapabilityId: [7, 8],
  },
  565: {
    name: 'Naviclim Controller', type: DeviceType.AC_CONTROLLER, hvacModes: { 0: 'off' }, hvacModesCapabilityId: [7, 8],
  },
  566: {
    name: 'Naviclim Controller', type: DeviceType.AC_CONTROLLER, hvacModes: { 0: 'off' }, hvacModesCapabilityId: [7, 8],
  },
  567: {
    name: 'Naviclim Controller', type: DeviceType.AC_CONTROLLER, hvacModes: { 0: 'off' }, hvacModesCapabilityId: [7, 8],
  },
  568: {
    name: 'Naviclim Controller', type: DeviceType.AC_CONTROLLER, hvacModes: { 0: 'off' }, hvacModesCapabilityId: [7, 8],
  },
  569: {
    name: 'Naviclim Controller', type: DeviceType.AC_CONTROLLER, hvacModes: { 0: 'off' }, hvacModesCapabilityId: [7, 8],
  },
  570: {
    name: 'Naviclim Controller', type: DeviceType.AC_CONTROLLER, hvacModes: { 0: 'off' }, hvacModesCapabilityId: [7, 8],
  },

  // --- Hubs (skipped, gateways only) ---
  556: {
    name: 'Naviclim Hub', type: DeviceType.HUB, hvacModes: { 0: 'off' }, hvacModesCapabilityId: [7, 8],
  },
  1353: {
    name: 'Calypso Split Interface', type: DeviceType.HUB, hvacModes: { 0: 'off' }, hvacModesCapabilityId: [7, 8],
  },
};

/**
 * Get model info for a given modelId.
 * Returns default unknown info for unrecognized models.
 */
function getModelInfo(modelId) {
  if (MODEL_DATABASE[modelId]) {
    return MODEL_DATABASE[modelId];
  }
  return {
    name: `Unknown product (${modelId})`,
    type: DeviceType.UNKNOWN,
    hvacModes: { 0: 'off', 4: 'heat' },
    hvacModesCapabilityId: [7, 8],
  };
}

/**
 * Check if a device type should be exposed as a Homey device.
 */
function isUserFacingDevice(type) {
  return [
    DeviceType.GAZ_BOILER,
    DeviceType.HEAT_PUMP,
    DeviceType.THERMOSTAT,
    DeviceType.WATER_HEATER,
    DeviceType.TOWEL_RACK,
    DeviceType.AC,
  ].includes(type);
}

/**
 * Get driver ID for a device type.
 */
function getDriverId(type) {
  switch (type) {
    case DeviceType.GAZ_BOILER:
    case DeviceType.HEAT_PUMP:
    case DeviceType.THERMOSTAT:
      return 'boiler';
    case DeviceType.WATER_HEATER:
      return 'water-heater';
    case DeviceType.TOWEL_RACK:
      return 'towel-rack';
    case DeviceType.AC:
      return 'air-conditioner';
    default:
      return null;
  }
}

module.exports = {
  DeviceType,
  HVACMode,
  HeatingMode,
  FanMode,
  SwingMode,
  MODEL_DATABASE,
  getModelInfo,
  isUserFacingDevice,
  getDriverId,
};
