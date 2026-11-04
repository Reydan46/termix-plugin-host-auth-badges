# Host Auth Badges

**English** · [Русский](README.ru.md)

Shows two short, configurable badges beside each host in the [Termix](https://github.com/Termix-SSH/Termix) host list. It works for SSH hosts and for hosts that use another protocol, such as RDP.

- **SOURCE**: where the login comes from. `CRED` (saved credential), `HOST` (set on the host), `EXT` (auth plugin), `?` (unknown).
- **METHOD**: how it logs in. `PASS`, `KEY`, `BOTH`, `AGENT`, `NONE`, `OTHER`, `?`.

The badges only summarize what Termix reports. They never test a login, read secrets or judge security. The plugin asks for the `ui:surface` capability only.

## Features

- 12 single-line layouts and 18 palettes.
- Your own icon, label and color for every SOURCE and METHOD value, each with its own reset.
- 104 searchable icons, adjustable text and icon sizes, and a live preview.
- English and Russian interface.

## Install

In Termix open Plugins, find Host Auth Badges in the community registry and install it, then open its settings. Changes show on the host list right away, and the Termix **Save** button keeps them.

## Settings

User settings: `enabled`, `position`, `textSize`, `iconSize`, `sourceConfig`, `methodConfig`, `layoutVariant`, `palettePreset`.

Hosts and folders can override the look with three fields: `compositionOverride` (layout, palette, sizes, position, enabled), `sourceOverride` and `methodOverride`. The order is Host, folder, parent folders, user, server, plugin defaults. Changes on a host or folder reach the real host list after Save.

## How a badge is decided

- Normal SSH hosts use the host's own login type, or the saved credential it points to, including one inherited from a folder or user default.
- If SSH is off, the login of the host's main protocol (RDP and similar) is used.
- On shared hosts the plugin shows only what the owner exposes. Unknown parts are shown as `?`.
- Credential names, passwords and keys are never kept, only the credential type.

## Limits

- The method of a credential that lives on another server (a shared copy on the desktop app) is not available, so it shows `?`.
- If SOURCE is hidden and METHOD shows only an icon, badges can look identical. The editor warns about it.

## Development

Node 22.12 or newer.

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

MIT license.
