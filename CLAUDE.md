# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Homey smart home app for Cozytouch integration. Uses Homey App SDK v3 (JavaScript/Node.js), targeting Homey Pro (local platform). App ID: `nl.webbuilds.cozytouch`.

## Commands

- **Lint**: `npm run lint`
- **Validate app**: `homey app validate`
- **Run on Homey (dev)**: `homey app run`
- **Install on Homey**: `homey app install`
- **Build compose files**: `homey app compose` (generates `app.json` from `.homeycompose/`)

## Architecture

This is a Homey Compose project. The key rule: **never edit `app.json` directly** — it is generated from `.homeycompose/app.json` and the compose directory structure.

### Key Files

- `app.js` — App entry point, extends `Homey.App`
- `.homeycompose/app.json` — Main app manifest (edit this, not root `app.json`)
- `.homeychangelog.json` — Version changelog shown in Homey app store

### Homey Compose Structure

All modular definitions live under `.homeycompose/`:

- `drivers/templates/` — Reusable driver templates
- `drivers/settings/` — Driver settings definitions
- `capabilities/` — Custom capability definitions (JSON)
- `discovery/` — Device discovery strategies (JSON)
- `flow/actions/` — Flow card action definitions
- `flow/conditions/` — Flow card condition definitions
- `flow/triggers/` — Flow card trigger definitions
- `locales/` — Additional translation strings (merged into `locales/`)
- `signals/433/`, `signals/868/`, `signals/ir/` — Signal definitions

### Driver Structure

Each driver lives in `drivers/<driver-id>/` and typically contains:
- `driver.js` — Extends `Homey.Driver`, handles pairing
- `device.js` — Extends `Homey.Device`, handles device logic
- `driver.compose.json` — Driver manifest (compose merges this into `app.json`)
- `pair/` — Custom pairing view templates (HTML)
- `assets/` — Driver-specific icons

### ESLint

Uses ESLint 10 flat config (`eslint.config.js`) with `@eslint/js` recommended plus `eslint-plugin-homey-app`. Run `npm run lint` before submitting.
