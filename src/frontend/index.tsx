import { useEffect, useSyncExternalStore } from "react";
import {
  listCredentials, useCurrentUser, useSettings, useSshAuthTypes, useTranslation,
  type PluginHostRecord, type SettingsComponentProps, type TermixApp,
} from "@termix-ssh/plugin-sdk/frontend";
import { classifyHost, type CredentialIndex } from "./classify";
import { createCredentialStore } from "./store";
import { createPreferenceStore, normalizePreferences, resolveForHost } from "./preferences";
import { AuthBadgeView } from "./view";
import { BadgeDesigner, CompositionHostOverride } from "./designer";
import { useBadgeVisibility,useVisibleSnapshot } from "./visibility";
import "./badge.css";

const CREDENTIAL_REFRESH_MS = 120_000;
const EMPTY_CREDENTIALS: CredentialIndex = new Map();
export function activate(app: TermixApp): void {
  const credentials = createCredentialStore(listCredentials);
  const preferences = createPreferenceStore();
  function MetadataSync() {
    const { values, loaded } = useSettings("user");
    const currentUser = useCurrentUser();
    const userId = currentUser?.userId ?? "";
    const key = loaded ? JSON.stringify(values) : "";
    useEffect(() => { preferences.setSaved(normalizePreferences(loaded ? values : {})); }, [loaded, key, userId]);
    useEffect(() => {
      preferences.clearDraft(); // Never carry unsaved appearance to a different account.
      credentials.reset(userId); // Identity-tag the credential snapshot before a fetch.
      if (!userId) return () => credentials.reset();
      const refresh = () => { void credentials.refresh(); };
      const whenVisible = () => { if (document.visibilityState === "visible") refresh(); };
      refresh();
      const timer = setInterval(refresh, CREDENTIAL_REFRESH_MS);
      window.addEventListener("focus", refresh);
      document.addEventListener("visibilitychange", whenVisible);
      return () => {
        clearInterval(timer);
        window.removeEventListener("focus", refresh);
        document.removeEventListener("visibilitychange", whenVisible);
        credentials.reset();
      };
    }, [userId]);
    return null;
  }
  // The native settings form only exposes setValue(), so it owns Save/Cancel.
  // A temporary in-memory draft updates currently mounted HostBadge instances.
  function LiveBadgeDesigner(props: SettingsComponentProps) {
    const previewState = useSyncExternalStore(preferences.subscribe, preferences.getSnapshot, preferences.getSnapshot);
    useEffect(() => () => preferences.clearDraft(), []);
    return <BadgeDesigner {...props} onLiveChange={preferences.setDraft} liveDirty={previewState.dirty} savedPreferences={previewState.saved} currentPreferences={previewState.preferences}/>;
  }
  function HostBadge({ host }: { host: PluginHostRecord }) {
    const { t } = useTranslation();
    const currentUserId = useCurrentUser()?.userId ?? '';
    const { types: registeredProviders, loaded: providersLoaded } = useSshAuthTypes();
    const {near,badgeRef}=useBadgeVisibility();
    const userPrefs = useVisibleSnapshot(preferences,near);
    const ownHostSettings = host.pluginSettings?.["host-auth-badges"];
    // Resolved on every render: host records can be mutated in place by Termix.
    const effective = resolveForHost(userPrefs, ownHostSettings);
    // Hosts that are disabled or offscreen skip credential updates; appearance
    // stays subscribed so enabling a badge shows it immediately. Non-SSH
    // protocols (RDP, ...) can use saved credentials too.
    const needsCredentials = near && effective.enabled;
    const creds = useVisibleSnapshot(credentials,needsCredentials);
    const visibleCredentials = needsCredentials && creds.userId === currentUserId ? creds.byId : EMPTY_CREDENTIALS;
    const info = classifyHost(host, visibleCredentials, providersLoaded ? registeredProviders : undefined);
    return <AuthBadgeView info={info} preferences={effective} t={t} badgeRef={badgeRef}/>;
  }
  app.registerSettingsComponent("auth-badge-designer", LiveBadgeDesigner);
  app.registerSettingsComponent("auth-badge-composition-override", CompositionHostOverride);
  app.registerSlotContribution("shell.overlay", {
    actionId: "host-auth-badges.metadata-sync", titleKey: "plugin.name",
    kind: "component", component: MetadataSync,
  });
  app.registerHostBadge({ id: "auth-summary", when: () => true, component: HostBadge, order: 80 });
}
