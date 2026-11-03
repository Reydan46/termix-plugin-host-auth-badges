import type { PluginCredentialSummary } from "@termix-ssh/plugin-sdk/frontend";
import { indexCredentials, type CredentialIndex } from "./classify.ts";

interface CredentialState {
  /** Account whose metadata was fetched; prevents cross-account flash on re-login. */
  readonly userId: string;
  readonly byId: CredentialIndex;
  readonly loaded: boolean;
  readonly error: boolean;
}
interface CredentialStore {
  get: () => CredentialState;
  subscribe: (listener: () => void) => () => void;
  refresh: () => Promise<void>;
  /** Clears metadata when the current account changes or the overlay unmounts. */
  reset: (userId?: string) => void;
}

/** One request shared by the host list; stale results never survive an account change. */
export function createCredentialStore(fetchCredentials: () => Promise<PluginCredentialSummary[]>): CredentialStore {
  let state: CredentialState = { userId: '', byId: new Map(), loaded: false, error: false };
  const listeners = new Set<() => void>();
  let inFlight: Promise<void> | undefined;
  let revision = 0;
  const publish = (next: CredentialState) => {
    state = next;
    for (const listener of listeners) listener();
  };
  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    reset(userId = '') {
      revision++;
      inFlight = undefined;
      publish({ userId, byId: new Map(), loaded: false, error: false });
    },
    refresh() {
      if (inFlight) return inFlight;
      const started = revision;
      const userId = state.userId;
      const request = (async () => {
        try {
          const items = await fetchCredentials();
          if (revision === started) publish({ userId, byId: indexCredentials(items), loaded: true, error: false });
        } catch {
          if (revision === started) publish({ userId, byId: new Map(), loaded: true, error: true });
        }
      })();
      const tracked = request.finally(() => { if (inFlight === tracked) inFlight = undefined; });
      inFlight = tracked;
      return tracked;
    },
  };
}
