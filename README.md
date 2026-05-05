# Translator Agent

Translator agent workspace containing a web translator UI and browser-extension workspace.

## Current Layout

```text
extension/
web/
  src/
  public/
  package.json
  vite.config.js
```

## Web App

The `web/` folder is a React/Vite translator interface.

Run locally:

```bash
cd web
npm install
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Extension Workspace

The `extension/` folder is reserved for the translator extension side of the project. Keep extension-specific manifests, content scripts, and browser assets there.

## Repository Boundary

This repo is for translator UI/agent work only. Book translation API, orchestration backend, and deployment configs are maintained separately.
