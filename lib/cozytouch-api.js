'use strict';

const https = require('https');
const querystring = require('querystring');

const COZYTOUCH_ATLANTIC_API = 'https://apis.groupe-atlantic.com';
const COZYTOUCH_CLIENT_ID = 'Q3RfMUpWeVRtSUxYOEllZkE3YVVOQmpGblpVYToyRWNORHpfZHkzNDJVSnFvMlo3cFNKTnZVdjBh';

class CozytouchApi {

  constructor({ username, password, log }) {
    this._username = username;
    this._password = password;
    this._accessToken = null;
    this._log = log || (() => {});
  }

  /**
   * Perform an HTTPS request and return parsed JSON.
   */
  _request({
    method, path, headers = {}, body = null,
  }) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, COZYTOUCH_ATLANTIC_API);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: { ...headers },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : null);
            } catch {
              // Some endpoints return plain text (e.g., executionId)
              resolve(data);
            }
          } else if (res.statusCode === 401) {
            reject(new Error('Authentication failed (401). Please check your credentials.'));
          } else {
            reject(new Error(`API request failed: ${res.statusCode} ${res.statusMessage} - ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy(new Error('Request timed out'));
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  /**
   * Authenticate with the Atlantic Groupe API using password grant.
   */
  async authenticate() {
    const body = querystring.stringify({
      grant_type: 'password',
      scope: 'openid',
      username: `GA-PRIVATEPERSON/${this._username}`,
      password: this._password,
    });

    const response = await this._request({
      method: 'POST',
      path: '/users/token',
      headers: {
        Authorization: `Basic ${COZYTOUCH_CLIENT_ID}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (response.error === 'invalid_grant') {
      throw new Error('Invalid credentials. Please check your email and password.');
    }

    if (!response.token_type || !response.access_token) {
      throw new Error('Authentication failed: unexpected response from server.');
    }

    this._accessToken = response.access_token;
    this._log('Cozytouch API authenticated successfully');
  }

  /**
   * Get authorized headers for API calls.
   */
  _authHeaders() {
    if (!this._accessToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }
    return {
      Authorization: `Bearer ${this._accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch the full device setup (devices, zones, setup metadata).
   */
  async getSetup() {
    const response = await this._request({
      method: 'GET',
      path: '/magellan/cozytouch/setupviewv2',
      headers: this._authHeaders(),
    });

    if (!Array.isArray(response) || response.length === 0) {
      throw new Error('Unexpected setup response format');
    }

    const setup = response[0];
    const devices = setup.devices || [];

    return {
      id: setup.id,
      name: setup.name,
      address: setup.address,
      devices,
      zones: setup.zones || [],
    };
  }

  /**
   * Fetch current capabilities for a device.
   */
  async getCapabilities(deviceId) {
    const response = await this._request({
      method: 'GET',
      path: `/magellan/capabilities/?deviceId=${deviceId}`,
      headers: this._authHeaders(),
    });

    if (!Array.isArray(response)) {
      throw new Error(`Unexpected capabilities response for device ${deviceId}`);
    }

    return response;
  }

  /**
   * Write a capability value and wait for execution to complete.
   * Throws when Cozytouch does not confirm the execution, so callers never
   * report a value the device did not accept.
   */
  async setCapability(deviceId, capabilityId, value) {
    const body = JSON.stringify({
      capabilityId,
      deviceId,
      value,
    });

    const response = await this._request({
      method: 'POST',
      path: '/magellan/executions/writecapability',
      headers: this._authHeaders(),
      body,
    });

    // Response body is the executionId (may be string or number)
    const executionId = typeof response === 'string' ? response.trim() : response;
    if (!executionId) {
      throw new Error('No execution ID returned from command');
    }

    const completed = await this._waitForExecution(executionId);
    if (!completed) {
      const err = new Error(`Cozytouch did not confirm the command (execution ${executionId})`);
      err.code = 'EXECUTION_NOT_CONFIRMED';
      throw err;
    }
  }

  /**
   * Poll execution status until complete or timeout.
   * State: 1=waiting, 2=in progress, 3=completed
   */
  async _waitForExecution(executionId) {
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
      await this._sleep(1000);

      try {
        const status = await this._request({
          method: 'GET',
          path: `/magellan/executions/${executionId}`,
          headers: this._authHeaders(),
        });

        if (status.state === 3) {
          return true;
        }
        if (status.state !== 1 && status.state !== 2) {
          this._log(`Execution ${executionId} failed with state: ${status.state}`);
          return false;
        }
      } catch (err) {
        this._log(`Error polling execution ${executionId}: ${err.message}`);
        return false;
      }
    }

    this._log(`Execution ${executionId} timed out`);
    return false;
  }

  /**
   * Set away mode timestamps on the setup.
   */
  async setAwayMode(setupId, setupData, startTimestamp, endTimestamp) {
    const payload = { ...setupData };

    if (startTimestamp && endTimestamp) {
      payload.absence = {
        startDate: startTimestamp,
        endDate: endTimestamp,
      };
    } else {
      payload.absence = {};
    }

    await this._request({
      method: 'PUT',
      path: `/magellan/v2/setups/${setupId}`,
      headers: this._authHeaders(),
      body: JSON.stringify(payload),
    });
  }

  /**
   * Test the connection by authenticating and fetching setup.
   */
  async testConnection() {
    await this.authenticate();
    const setup = await this.getSetup();
    return setup;
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms)); // eslint-disable-line homey-app/global-timers
  }

}

module.exports = CozytouchApi;
