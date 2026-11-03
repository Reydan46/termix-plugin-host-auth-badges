# Contributing

The project follows the Termix plugin SDK and stays independent of Termix internals.

## Local setup

Install Node.js 22 or newer, then run:

```bash
npm install
npm test
npm run test:sdk
npm run typecheck
npm run validate
npm run pack
```

## Branches

- `main` is the GitHub default branch and the only long-lived one; it tracks stable releases.
- `dev-1.0.0` is a temporary release branch for the official Release workflow (later `dev-X.Y.Z`); the workflow merges it into `main` and deletes it.

## Pull requests

- Keep `manifest.json` permissions minimal (`ui:surface`) and do not read SSH secrets or issue SSH commands.
- Preserve icon IDs in `src/frontend/icons.ts`, host override field names, the plugin ID and saved Layout/Palette IDs after the first public release.
- Change both `locales/en.json` and `locales/translated/ru_RU.json` for UI text.
- Add regression tests for appearance/inheritance, icon catalog and cross-theme contrast.
- Run `npm test`, `npm run test:sdk`, `npm run typecheck`, `npm run validate` and `npm run pack` with the actual SDK. Browser/SDK integration still requires a real Termix install.
- Explain any changes to host/folder inheritance and the native Save workflow. Avoid relying on private Termix DOM or undocumented SDK APIs.

## Version and release

The manifest, package and newest changelog version must match. Follow `docs/publishing.md` and the shared Termix Release workflow. Do not sign or publish a plugin on someone else's behalf.
