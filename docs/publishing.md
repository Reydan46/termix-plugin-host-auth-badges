# Publishing Host Auth Badges to the Termix community registry

Repository: `https://github.com/Reydan46/termix-plugin-host-auth-badges`. Keep the stable `id: host-auth-badges`, and keep `author`, `repository` and `docs` in `manifest.json` pointing at it.

## 1. Branches

Set **Settings → Branches → Default branch = main** on GitHub (the manifest `docs` link points at `main`). `main` is the only branch that stays on GitHub. A release is cut from a temporary `dev-X.Y.Z` branch: the Release workflow merges it into `main` and deletes it.

## 2. Checks before a release

```bash
npm ci
npm test
npm run test:sdk           # official Termix Vitest runner, also run by CI
npm run typecheck
npm run validate
npm run pack
```

`package-lock.json` is committed and must be regenerated only by a real `npm install`. The manifest, `package.json`, the newest `CHANGELOG.md` section and the Git tag must all carry the same version.

## 3. Test in installed Termix

Unit tests cannot validate all SDK semantics. Before a release, check in a real Termix:

- `SOURCE` and `METHOD` on password, key, both, agent, custom and unknown SSH hosts.
- Palette swatches against real host badges, and all Layouts in desktop and web.
- Host → Folder → User → Server inheritance, and that Save applies the changes.
- That clearing each override with `setValue(field, null)` restores inheritance. The public custom settings SDK does not document this as a native inherit action, so it must be confirmed, not assumed.
- Host Icons enabled, a shared host with two accounts, and the list scrolled far outside the viewport.
- `Monochrome` in the dark Termix theme, Catppuccin factory and Reset defaults, and `PASS` versus `KEY` in each colored palette.

## 4. Release

Push the first release as one commit to `main` and `dev-1.0.0` (later releases: a commit on top of `origin/main`, pushed only to `dev-X.Y.Z`). Repository **Settings → Actions → General → Workflow permissions** must be **Read and write**. Then start the **Release** workflow by hand from that branch: **dry-run** first, then **stable** (or **beta**). The workflow builds the `.tmxplug`, creates the GitHub release and a build attestation, and prints the SHA-256 in its run summary. No signing key is needed for a community submission. The workflow tags `vX.Y.Z`, squash-merges the branch into `main` and deletes `dev-X.Y.Z`. Do not create a tag by hand.

## 5. Submit to Termix-Registry

After a successful release, fork `https://github.com/Termix-SSH/Termix-Registry` and add `community/plugins/host-auth-badges.json` with the released version and the SHA-256 from that run:

```json
{
  "$schema": "../../community-submission-schema.json",
  "id": "host-auth-badges",
  "repository": "https://github.com/Reydan46/termix-plugin-host-auth-badges",
  "maintainers": ["Reydan46"],
  "versions": [{ "version": "1.0.0", "sha256": "<SHA-256 from the release run>" }]
}
```

The registry checks the artifact and its build provenance, reviews the source, and then adds the reviewed artifact. See https://docs.termix.site/develop/community-registry/ .
