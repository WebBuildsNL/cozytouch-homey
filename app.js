'use strict';

const Homey = require('homey');
const CozytouchApi = require('./lib/cozytouch-api');
const { getModelInfo, isUserFacingDevice } = require('./lib/cozytouch-models');

const POLL_INTERVAL = 60 * 1000; // 60 seconds

module.exports = class CozytouchApp extends Homey.App {

  async onInit() {
    // Every device registers a deviceUpdate listener on this Homey instance;
    // the default limit of 10 would log warnings for larger setups
    this.homey.setMaxListeners(0);

    this._api = null;
    this._pollInterval = null;
    this._setupData = null;
    this._devices = new Map(); // deviceId → device data from setup
    this._connecting = false;

    // Listen for settings changes (credentials updated from settings page)
    this.homey.settings.on('set', (key) => {
      if (key === 'username' || key === 'password') {
        if (!this._connecting) {
          this.log('Credentials changed, reconnecting...');
          this._reconnect().catch((err) => this.error('Reconnect failed:', err.message));
        }
      }
    });

    // Register flow card actions
    this._registerFlowCards();

    // Try to connect if credentials exist
    const username = this.homey.settings.get('username');
    const password = this.homey.settings.get('password');
    if (username && password) {
      await this._connect(username, password);
    } else {
      this.log('No credentials configured. Please set up in app settings.');
    }
  }

  _registerFlowCards() {
    // Actions run through the device capability listeners so API guards,
    // error messages and change triggers behave the same as UI interactions
    this.homey.flow.getActionCard('set-heating-mode')
      .registerRunListener(async (args) => {
        await args.device.triggerCapabilityListener('heating_mode', args.mode);
      });

    this.homey.flow.getActionCard('set-boost-mode')
      .registerRunListener(async (args) => {
        await args.device.triggerCapabilityListener('boost_mode', args.enabled === 'true');
      });

    this.homey.flow.getActionCard('set-away-mode')
      .registerRunListener(async (args) => {
        await args.device.triggerCapabilityListener('away_mode', args.enabled === 'true');
      });

    // Check boost mode condition
    this.homey.flow.getConditionCard('boost-mode-active')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('boost_mode') === true;
      });

    // Hot water threshold trigger: only fire when the value crosses the threshold downwards
    this.homey.flow.getDeviceTriggerCard('hot-water-below')
      .registerRunListener(async (args, state) => {
        return state.previous > args.percentage && state.current <= args.percentage;
      });
  }

  /**
   * Get the API client. Used by drivers.
   */
  getApi() {
    return this._api;
  }

  /**
   * Get cached setup data.
   */
  getSetupData() {
    return this._setupData;
  }

  /**
   * Get all discovered devices.
   */
  getDevices() {
    return this._devices;
  }

  /**
   * Ensure the app is connected and has fetched devices.
   * Called by drivers during pairing to avoid race conditions.
   */
  async ensureSetup(username, password) {
    this._connecting = true;
    try {
      // Store credentials
      this.homey.settings.set('username', username);
      this.homey.settings.set('password', password);

      // Connect directly (don't rely on settings event)
      this._stopPolling();
      await this._connect(username, password);

      this.log(`Setup complete, ${this._devices.size} devices found`);
    } finally {
      this._connecting = false;
    }
  }

  /**
   * Connect to the API with given credentials.
   */
  async _connect(username, password) {
    try {
      this._api = new CozytouchApi({
        username,
        password,
        log: this.log.bind(this),
      });

      await this._api.authenticate();
      await this._fetchSetup();
      this._startPolling();
      this.log('Cozytouch connected and polling started');
    } catch (err) {
      this.error('Failed to connect to Cozytouch:', err.message);
      this._api = null;
    }
  }

  /**
   * Reconnect with current credentials.
   */
  async _reconnect() {
    this._stopPolling();
    this._api = null;

    const username = this.homey.settings.get('username');
    const password = this.homey.settings.get('password');
    if (username && password) {
      await this._connect(username, password);
    }
  }

  /**
   * Fetch the full device setup and populate the devices map.
   */
  async _fetchSetup() {
    const setup = await this._api.getSetup();
    this._setupData = setup;
    this._devices.clear();

    for (const device of setup.devices) {
      const modelInfo = getModelInfo(device.modelId);

      if (isUserFacingDevice(modelInfo.type)) {
        this._devices.set(device.deviceId, {
          ...device,
          modelInfo,
          capabilities: [],
        });
      }
    }

    this.log(`Discovered ${this._devices.size} user-facing devices out of ${setup.devices.length} total`);
  }

  /**
   * Start the centralized polling interval.
   */
  _startPolling() {
    this._stopPolling();
    this._pollInterval = this.homey.setInterval(() => {
      this._pollDevices().catch((err) => this.error('Poll failed:', err.message));
    }, POLL_INTERVAL);
  }

  _stopPolling() {
    if (this._pollInterval) {
      this.homey.clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  /**
   * Poll capabilities for all paired devices.
   */
  async _pollDevices() {
    if (!this._api) {
      // Try to reconnect if we lost the API connection
      this.log('API not connected, attempting reconnect...');
      this._reconnect().catch((err) => this.error('Reconnect failed:', err.message));
      return;
    }

    for (const [deviceId, deviceData] of this._devices) {
      try {
        const capabilities = await this._api.getCapabilities(deviceId);
        deviceData.capabilities = capabilities;
        this.homey.emit(`cozytouch.deviceUpdate.${deviceId}`, capabilities);
      } catch (err) {
        if (err.message.includes('401')) {
          this.log('Token expired, re-authenticating...');
          try {
            await this._api.authenticate();
            const capabilities = await this._api.getCapabilities(deviceId);
            deviceData.capabilities = capabilities;
            this.homey.emit(`cozytouch.deviceUpdate.${deviceId}`, capabilities);
          } catch (authErr) {
            this.error('Re-authentication failed, will retry next poll:', authErr.message);
            this._api = null;
            return;
          }
        } else {
          this.error(`Failed to poll device ${deviceId}:`, err.message);
        }
      }
    }
  }

  /**
   * Manual poll for a specific device (used after commands).
   */
  async pollDevice(deviceId) {
    if (!this._api) return;
    try {
      const capabilities = await this._api.getCapabilities(deviceId);
      const deviceData = this._devices.get(deviceId);
      if (deviceData) {
        deviceData.capabilities = capabilities;
      }
      this.homey.emit(`cozytouch.deviceUpdate.${deviceId}`, capabilities);
    } catch (err) {
      this.error(`Failed to poll device ${deviceId}:`, err.message);
    }
  }

  async onUninit() {
    this._stopPolling();
  }

};
