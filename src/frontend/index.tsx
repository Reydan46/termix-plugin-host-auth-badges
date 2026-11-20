import { useEffect, useSyncExternalStore } from "react";
import {
  listCredentials, useCurrentUser, useSettings, useSshAuthTypes, useTranslation,
  type DataResult, type DataValue, type PluginHostRecord, type SettingsComponentProps, type TermixApp,
} from "@termix-ssh/plugin-sdk/frontend";
import { classifyHost, type CredentialIndex } from "./classify";
import { createCredentialStore } from "./store";
import { createPreferenceStore, normalizePreferences, resolveForHost } from "./preferences";
import { listBadgeTexts } from "./presentation";
import { BadgeDesigner, CompositionHostOverride } from "./designer";
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
    // This frame has its own stores: the saved values come from the settings it reads.
    const { values, loaded } = useSettings("user");
    const key = loaded ? JSON.stringify(values) : "";
    useEffect(() => { preferences.setSaved(normalizePreferences(loaded ? values : {})); }, [loaded, key]);
    useEffect(() => () => preferences.clearDraft(), []);
    return <BadgeDesigner {...props} onLiveChange={preferences.setDraft} liveDirty={previewState.dirty} savedPreferences={previewState.saved} currentPreferences={previewState.preferences}/>;
  }
  /** Runs once per visible row in the background frame; the shell draws the result. */
  function useAuthBadges(host: PluginHostRecord): DataResult {
    const { t } = useTranslation();
    const currentUserId = useCurrentUser()?.userId ?? "";
    const { types: registeredProviders, loaded: providersLoaded } = useSshAuthTypes();
    const userPrefs = useSyncExternalStore(preferences.subscribe, preferences.get, preferences.get);
    const effective = resolveForHost(userPrefs, host.pluginSettings?.["host-auth-badges"]);
    const creds = useSyncExternalStore(credentials.subscribe, credentials.get, credentials.get);
    const visibleCredentials = effective.enabled && creds.userId === currentUserId ? creds.byId : EMPTY_CREDENTIALS;
    if (!effective.enabled) return null;
    const info = classifyHost(host, visibleCredentials, providersLoaded ? registeredProviders : undefined);
    const texts = listBadgeTexts(info, effective);
    if (texts.length === 0) return null;
    const method = info.method === "custom" && info.customType ? info.customType : t(`method.full.${info.method}`);
    const tooltip = [
      `${t("tooltip.source")}: ${t(`source.${info.source}`)}`,
      `${t("tooltip.method")}: ${method}`,
      ...(info.uncertain ? [t("tooltip.uncertain")] : []),
    ].join(" · ");
    const parts: DataValue[] = texts.map(({ kind, text }) => ({
      shape: "badge", label: text, tone: kind === "source" ? "default" : "muted", tooltip,
    }));
    return parts;
  }
  app.registerSettingsComponent("auth-badge-designer", LiveBadgeDesigner);
  app.registerSettingsComponent("auth-badge-composition-override", CompositionHostOverride);
  app.registerSlotContribution("shell.overlay", {
    actionId: "host-auth-badges.metadata-sync", titleKey: "plugin.name",
    kind: "component", component: MetadataSync,
  });
  app.registerHostBadge({ id: "auth-summary", when: () => true, useValue: useAuthBadges, order: 80 });
}
