# Cozytouch for Homey

Control your Atlantic, Thermor, and Sauter devices via Cozytouch on your Homey Pro.

This app connects to the Cozytouch cloud API and lets you monitor and control your heating, hot water, air conditioning, and towel rack devices directly from your Homey.

## Requirements

- Homey Pro (firmware 12.4.0 or later)
- A Cozytouch account with linked devices (Atlantic, Thermor, or Sauter)

## Installation

1. Install the app from the [Homey App Store](https://homey.app/a/nl.webbuilds.cozytouch/)
2. Open the app settings and enter your Cozytouch email and password
3. Add a device via **Devices > + > Cozytouch** and select the device type
4. Enter your credentials during pairing — your devices will be discovered automatically

## Supported Device Types

### Water Heaters

| Brand | Model |
|-------|-------|
| Atlantic | Explorer V5 270L |
| Atlantic | Explorer V5 240L |
| Atlantic | Explorer V5 270L Coil |
| Atlantic | AQUEO ACI HYB VS 300L 3000M |
| Atlantic | AQUEO ACI HYB VM 150L 2200M |
| Atlantic | Calypso Split |
| Atlantic | Calypso 200L |
| Thermor | Aeromax SPLIT 3 |
| Thermor | Aeromax 6 |
| Thermor | Malicio 3 120L |
| Sauter | Phazy |

**Capabilities:** target temperature, water temperature, hot water availability (%), heating mode (Manual / Eco+ / Program), boost mode, energy consumption (kWh).

### Gas Boilers

| Brand | Model |
|-------|-------|
| Atlantic | Naema 2 Micro 25 |
| Atlantic | Naema 2 Duo 25 |
| Atlantic | Naema 3 Micro 25 |
| Atlantic | Naia 2 Micro 25 |

**Capabilities:** thermostat mode (off / heat), target temperature, current temperature, heating mode, away mode, energy consumption (kWh).

### Heat Pumps

| Brand | Model |
|-------|-------|
| Atlantic | Alfea Extensa Duo AI UE |
| Atlantic | Alfea Extensa Duo A.I. 3 R32 |

**Capabilities:** thermostat mode, target temperature, zone temperatures, heating mode, away mode, energy consumption (kWh).

### Thermostats

| Brand | Model |
|-------|-------|
| Atlantic | Thermostat Navilink Connect |
| Atlantic | Loria Duo 6006 |

**Capabilities:** thermostat mode, target temperature, current temperature, away mode.

### Air Conditioners

| Brand | Model |
|-------|-------|
| Atlantic / Thermor | Takao M3 / Naviclim |

**Capabilities:** thermostat mode (off / auto / heat / cool), target temperature, current temperature, fan mode (low / medium / high / auto), swing mode, energy consumption (kWh).

### Towel Racks

| Brand | Model |
|-------|-------|
| Atlantic | KELUD 1750W (Blanc / Anthracite) |
| Atlantic | Doris Etroit 1500W |
| Atlantic | Asama Connecte II Ventilo 1500W / 1750W (Blanc / Anthracite / Noir) |
| Thermor | Riva 5 |

**Capabilities:** on/off, current temperature.

## Flow Cards

### Conditions (AND)

- **Boost mode is on/off** — Check if boost mode is active on a water heater

### Actions (THEN)

- **Set heating mode** — Set heating mode to Manual, Eco+, or Program (water heater / boiler)
- **Toggle boost mode** — Enable or disable boost mode (water heater)
- **Toggle away mode** — Enable or disable away mode (boiler)

## Polling

The app polls your devices every 60 seconds for status updates. After any command (e.g., changing temperature or mode), an immediate poll is triggered so the device tile updates right away.

## My Device Is Not Listed

The app supports a wide range of Cozytouch-connected devices. If your specific model is not in the list above, it may still work — the app will attempt to pair it with default settings. If you have a device that doesn't work or is missing features, please [open an issue](https://github.com/WebBuildsNL/cozytouch-homey/issues) with your device model and we'll look into adding support.

## Feedback & Support

Found a bug or have a feature request? Please [open an issue on GitHub](https://github.com/WebBuildsNL/cozytouch-homey/issues).
