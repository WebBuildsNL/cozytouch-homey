'use strict';

const js = require('@eslint/js');
const globals = require('globals');
const homeyApp = require('eslint-plugin-homey-app');

module.exports = [
  {
    ignores: ['.homeybuild/'],
  },
  js.configs.recommended,
  homeyApp.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
