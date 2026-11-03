# Architecture

- `classify.ts` reads the SDK's non-secret SSH authentication summary. Credential summaries are reduced to `authType`; unknown/custom provider handling remains conservative.
- `icons.ts` is the *single* catalog of 104 icon IDs and Lucide names, shared by validation, search and SDK `PluginIcon` rendering. The selected icon is stored only by its own stable ID.
- `appearance.ts` holds active Source/Method options only: `enabled`, `showIcon`, `showLabel`, and sparse maps `icons`, `labels`, `colors`. Each map entry can be reset independently. `readPart` rejects malformed input.
- `design.ts` defines 12 single-row layouts and 18 palettes. Only manually overridden colors are stored. An empty custom color map uses the current palette immediately.
- `preferences.ts` normalizes the current user schema, resolves three host/folder override groups, and hosts a memory-only draft for live changes before Termix Save.
- `designer.tsx` provides the same controls for user and host/folder editing. The editor is not a custom server-side persistence system; Termix owns the Save/Cancel/defaults workflow.
- `view.tsx`, `presentation.ts`, `badgeSizing.ts` render one compact Source+Method pair. `preview.tsx` uses the same renderer with synthetic examples.
- `visibility.ts` uses a single shared `IntersectionObserver` with 160px overscan. Offscreen badge components remain mounted if Termix keeps them mounted, but do not subscribe to our two shared stores. They refresh on return. Other SDK hooks are not virtualized by this plugin.
- `index.tsx` registers one host badge, the user editor, the host/folder editor, and a metadata sync overlay. No additional Termix capabilities or secret APIs are requested.

## Termix integration contract

Termix resolves its own host/folder/user/server defaults. `host.pluginSettings['host-auth-badges']` is the effective per-host input. This plugin cannot read the effective settings of Host Icons or override native list virtualization through the public badge API. The host/folder settings editor lacks an object ID in `SettingsComponentProps`; host/folder changes apply to real rows only when Termix updates the host record following Save.

## Reference documentation

- https://docs.termix.site/develop/frontend/
- https://docs.termix.site/develop/reference/manifest/
- https://docs.termix.site/develop/reference/capabilities/
- https://docs.termix.site/develop/settings/
- https://docs.termix.site/guide/host-defaults/
- https://github.com/ZarenOFF/termix-plugin-host-icons

Publication: [release process](publishing.md).
