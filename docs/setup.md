# Development and acceptance testing

Node >=22.12 is required.

```bash
npm ci
npm test
npm run test:sdk
npm run typecheck
npm run validate
npm run pack
```

`npm test` covers settings parsing, independent icon/text/color resets, user/folder/host inheritance, non-secret credential classification, metadata cache lifetime, wheel behavior, manifests and UI layout regressions. It does not execute the real Termix UI or replace SDK validation.

## Manual acceptance tests in Termix

1. Install the package into a disposable/test Termix instance, not the production account. Verify badge defaults and all 12 Layout/18 Palette choices in both themes.
2. Edit one label; verify no other labels change. Change an icon/color; reset each independently. Reset appearance, Cancel, Save; verify actual host rows track only saved values after dismissal.
3. On a server default, user default, parent folder, nested folder and individual host, set distinct Source, Method and Composition values. Verify native Reset-to-default independently for all three fields and the resulting effective badge in the real host list.
4. Share a host between two users with different SSH Credentials. Change accounts quickly; verify type badges do not show stale types from the previous user. Check credential revocation and focus/visibility refresh.
5. With Host Icons present and many host rows, scroll while changing a palette. Only near-viewport badge components should subscribe to this plugin's shared stores; no assertion is made about Termix's own row rendering. Confirm no misplaced badges, leaks, blank flashes or excessive CPU.
6. Verify keyboard and accessibility, narrow settings panels, before/after position, disabled state and host/folder Save behavior.
7. Run the release checks in [publishing](publishing.md).

## Test resetting host and folder overrides

The unified host/folder editor shows the three defaultable groups. **Inherit** requests a null value for just that group; **Reset all overrides** asks for confirmation and clears all three current-level form values. Neither action saves immediately. The installed Termix version must support clearing a hidden/custom host-default field through the custom form's `setValue(key, null)`; this behavior is **not guaranteed by the documented SettingsComponentProps contract**. If it rejects Save or fails to follow parents, do not rely on this feature. Restore your test backup and use the native Termix host defaults reset controls instead.

1. In a test folder, set a unique Layout/Palette and SOURCE/METHOD. In a nested child folder and one host, override all three groups and save.
2. Edit the host: compare its effective values with *My user preferences*; do not mistake that baseline for the actual folder source.
3. Click Inherit for SOURCE, then Termix Save. Verify SOURCE follows the immediate folder after reload; METHOD and Composition remain overridden.
4. Click **Reset all overrides**, inspect confirmation, confirm, then Termix Save. Verify all three follow the nearest folder and keep following when that folder changes.
5. Repeat using Folder defaults and a deeper nested folder. Verify no other plugin settings or SSH credentials change.

This is the release's mandatory acceptance gate. Unit tests do not prove the native form's null-clearing behavior.

### Icon picker and monochrome

The picker contains 104 searchable, grouped icons from the shared SDK-backed registry. In Monochrome every METHOD label/icon must remain legible on dark surfaces without an underline.
