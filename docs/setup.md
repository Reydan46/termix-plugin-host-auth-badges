# Development and testing

Node 22.12 or newer.

```bash
npm ci
npm test
npm run test:sdk
npm run typecheck
npm run validate
npm run pack
```

The tests cover settings, inheritance, host classification and the manifests. They do not run the real Termix UI.

## Check in Termix

Use a test Termix instance.

1. Hosts: SSH with password, key, both, agent and a saved credential; an RDP host with SSH off, with a direct login and with a credential. Check SOURCE and METHOD.
2. Inheritance: set a credential on a user default and on a folder and check hosts below. Check the plugin settings on server, user, folder and host levels.
3. Shared hosts: with two accounts check the recipient's own credential, a folder credential and hosts the owner shares nothing for.
4. Desktop app: check synced hosts and a read-only shared copy.
5. Switch accounts and check that no badge keeps the previous account's data.
6. Check layouts and palettes in both themes, the badge position, a disabled plugin and Save/Cancel.

## Resetting overrides

The host and folder editor can ask Termix to clear a field with `setValue(field, null)`. The public SDK does not promise that this restores inheritance, so check it in your Termix version. If it does not work, use the native Termix reset controls.

1. In a folder set a layout, palette, SOURCE and METHOD. Override all three groups in a child folder and a host, then Save.
2. Click Inherit for one group and Save. Only that group should follow the nearest folder.
3. Click **Reset all overrides**, confirm and Save. All three groups should follow the nearest folder.
