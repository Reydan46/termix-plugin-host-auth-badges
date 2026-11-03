import type { PluginContext } from "@termix-ssh/plugin-sdk/backend";

/** The plugin has no server-side features; the manifest build still expects a backend entry. */
export function activate(_ctx: PluginContext): void {
  // No routes, database or secret access.
}
