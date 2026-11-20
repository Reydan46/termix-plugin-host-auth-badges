# Changelog

## 1.1.0

### Changed

- The plugin now runs on Termix 26.11.2 or newer (plugin API 2), where plugin interfaces run in sandboxed frames. Older Termix versions keep using 1.0.2.
- In the host list the badge is drawn by Termix from plain data, so it shows the short text of the SOURCE and METHOD parts as small labels with a tooltip. Icons, custom colors, layouts, palettes and sizes cannot reach the host list yet, so their settings and the preview are hidden. They are kept in the code and come back when Termix can draw them. Position and size are hidden too, because the shell decides them. Enabled, the Text toggle and the editable labels still apply.
- Hosts that are disabled or off screen no longer need special handling: the shell asks only for rows it draws.

### Fixed

- The unsaved-changes notice no longer says changes are applied to host badges before saving, and the reset-appearance dialog speaks of all overrides instead of "three".

## 1.0.2

### Fixed

- Fixed the SOURCE badge for hosts without SSH (RDP and others) and for shared hosts.

## 1.0.1

### Fixed

- Replaced long dashes in a source comment, documentation and the empty-value placeholder with plain hyphens, as the registry rules require.

## 1.0.0

### Added

- Compact SOURCE and METHOD authentication badges for SSH hosts in Termix.
- Twelve single-line layouts and eighteen palettes, with Catppuccin as the default.
- Custom icons, labels and colors for each authentication source and method, including per-item reset.
- A shared searchable gallery of 104 Lucide icons and accessible previews.
- User, folder and host settings with independent override groups and inheritance controls.
- Viewport-aware subscriptions and read-only SSH authentication metadata classification.
- English and Russian interface translations.
