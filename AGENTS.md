# AGENTS.md

This repo is a [Termix](https://github.com/Termix-SSH/Termix) plugin. These notes are for AI coding tools.

## Read first

Before changing anything, read `node_modules/@termix-ssh/plugin-sdk/PLUGIN-GUIDE.md`. It covers the
manifest, frontend, UI, testing, releasing and submitting to the community registry, and it matches the
SDK version installed here. If it is missing, run `npm install`. If the guide and the SDK's TypeScript
types disagree, the types are right.

## Commands

```bash
npm run build        # bundle into dist/
npm test             # node tests (also run through the SDK runner by `npm run test:sdk`)
npm run test:sdk     # termix-plugin test, what CI runs
npm run typecheck    # type check
npm run validate     # build + check manifest.json
npm run pack         # write <id>-<version>.tmxplug
```

Don't run Prettier over `src/` or `tests/`: several tests match the source text.

## Done means

- `npm test`, `npm run test:sdk`, `npm run typecheck`, `npm run validate` and `npm run pack` pass
- New UI text is in both `locales/en.json` and `locales/translated/ru_RU.json`, with no unused keys
- `docs/` and the README still match what the plugin does
- User facing changes are in `CHANGELOG.md` under the version they ship in

## Branches

`main` is the GitHub default and the only branch kept there. Work happens on a local `dev`; a release is cut
from a temporary `dev-X.Y.Z` with the Release workflow, which merges it into `main` and deletes it.

## Maintainer notes — Termix Host Auth Badges

Version 1.0.0 is the first public release. Treat setting keys and icon IDs as stable compatibility contracts.

Development priorities: correctness, safe native Termix settings, compact UI, no credential secrets, and minimizing rerenders in the mounted host list. Prefer current canonical `appearance.ts`, `preferences.ts`, `design.ts` types; do not introduce a second settings/credential backend.

Run `npm test`, `npm run typecheck`, `npm run validate`, and `npm run pack` under the supported SDK before PR. CI and clean npm install use the committed `package-lock.json`; regenerate it with a real `npm install`, never by hand. Hidden manifest settings still require localized non-empty `labelKey`. Test Host → Folder → User → Server inheritance and shared-host behavior in the real application; unit tests cannot validate all SDK semantics.

Viewport optimization only gates our shared snapshot-store subscriptions. Termix itself decides which row components exist; avoid querying or mutating its internal DOM to emulate virtualization.

Do not claim successful real SDK typecheck, production load tests or installed-Termix integration until executed.

## Release readiness

See `docs/publishing.md` for the release process. Do not commit fake npm lockfiles or claim SDK tests without installing the real dependencies. The 104 icon definitions live only in `src/frontend/icons.ts`; the picker, persisted values and renderer must all refer to it.
