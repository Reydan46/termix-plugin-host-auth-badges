# Host Auth Badges

**English** · [Русский](README.ru.md)

Shows two short, configurable badges beside SSH hosts in the [Termix](https://github.com/Termix-SSH/Termix) host list:

- **SOURCE** shows where the login settings come from: `CRED`, `HOST`, `EXT`, `?`.
- **METHOD** shows the configured login method: `PASS`, `KEY`, `BOTH`, `AGENT`, `NONE`, `OTHER`, `?`.

The badges summarize the authentication configuration Termix reports. They do not test logins, read SSH secrets or assess the security of a host. The plugin requests only the `ui:surface` capability.

## What you can do

- 12 single-line layouts and 18 palettes (the default is Unframed with Catppuccin).
- A separate icon, label and color for every SOURCE and METHOD category, each with its own reset. A reset color returns to the current palette.
- 104 searchable Lucide icons in seven groups. The picker and the host badges use the same icon catalog.
- Independent text and icon sizes (60-220% and 60-260%). Pickers and sliders respond to the mouse wheel.
- Live preview with nine synthetic example hosts. The preview shows badges even when the plugin is disabled.
- English and Russian interface.

## Install

Open Plugins in Termix, turn on the community registry (admins), find Host Auth Badges and install it. Then open the **Host Auth Badges** settings.

Changes in the user settings appear immediately on the mounted host badges through an in-memory draft. The native Termix **Save** button is still required to persist them, and closing without saving drops the draft.

## Settings

User settings: `enabled`, `position`, `textSize`, `iconSize`, `sourceConfig`, `methodConfig`, `layoutVariant`, `palettePreset`, plus the custom editor.

Host and folder settings are three independently inherited JSON fields: `compositionOverride` (layout, palette, sizes, position and enabled), `sourceOverride` and `methodOverride`. The last two are hidden fields edited through the single host and folder editor. The inheritance order is Host, nearest folder, parent folders, user, server, then the factory defaults.

The editor can ask Termix to clear a field with `setValue(field, null)`, per group or for all three with **Reset all overrides**; Save still persists the result. The public SDK does not document this as an inherit action, so verify it in your Termix version before relying on it (see [docs/setup.md](docs/setup.md)). The editor compares values with the user preferences, not with the real parent folder or server.

Host and folder edits update the editor preview at once. Real host badges change after Save, when Termix publishes the new effective `pluginSettings`, because the settings form does not say which host or folder is being edited.

## Performance and privacy

- Termix decides which host rows are mounted. Mounted badges use one shared `IntersectionObserver` with a 160px margin and unsubscribe from the plugin's preference and credential stores while offscreen.
- Credential metadata is fetched once per account and refreshed on a timer, on focus and on visibility. Only `authType` is kept; credential names, passwords and keys are not stored. Snapshots are tied to the account, so a switch never shows the previous account's data.
- The plugin has no network access of its own, telemetry, background SSH connections or extra capabilities.

## Limits

If SOURCE is hidden and METHOD shows only an icon, badges can look the same on different hosts. The editor warns about this combination. **Reset appearance** restores the defaults.

## Development

Node 22.12 or newer is required.

```bash
npm install
npm test
npm run test:sdk
npm run typecheck
npm run validate
npm run pack
```

Setting keys and icon IDs are stable. See [docs/setup.md](docs/setup.md) and [docs/publishing.md](docs/publishing.md).

[Architecture](docs/index.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md)

Licensed under MIT.
