# Architecture

All code is in `src/frontend/`.

- `classify.ts`: turns the host record Termix gives the plugin into SOURCE and METHOD. It handles SSH hosts, hosts whose SSH is off (RDP and similar, through `protocolAuth`), shared hosts and Quick Connect. It reads only the credential type, never secrets.
- `store.ts`: one shared, account-bound cache of credential types.
- `index.tsx`: registers the host badge and the settings editors.
- `preferences.ts`, `appearance.ts`, `design.ts`: settings, per-value icon/label/color and layouts/palettes, with Host, folder, user and server inheritance.
- `icons.ts`: the only catalog of the 104 icons.
- `designer.tsx`, `preview.tsx`, `view.tsx`, `presentation.ts`, `badgeSizing.ts`: editor, preview and the badge renderer.
- `visibility.ts`: badges outside the viewport stop listening to the plugin's stores.

## Rules for credential ids

Credential ids only make sense in the backend that owns them. The host list and the credential list come from the same backend, so a host's own or inherited credential is looked up normally, including hosts that connect through the remote server. An id on a shared host or a read-only shared copy is never looked up. It shows `CRED` with an unknown method.

## Reference

- https://docs.termix.site/develop/frontend/
- https://docs.termix.site/develop/settings/
- https://docs.termix.site/guide/host-defaults/

Releasing: [publishing](publishing.md).
