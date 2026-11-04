/** Pure classification of safe Termix metadata. No secret material is used. */
import type {
  HostAuthOverrideSummary,
  PluginCredentialSummary,
  PluginHostRecord,
  SshAuthTypeInfo,
} from "@termix-ssh/plugin-sdk/frontend";

export type Source = "credential" | "host" | "plugin" | "unknown";
export type Method =
  | "password"
  | "key"
  | "both"
  | "agent"
  | "none"
  | "custom"
  | "unknown";
export interface AuthInfo {
  source: Source;
  method: Method;
  customType?: string;
  /** Confidence refers to metadata, NOT whether login will succeed. */
  uncertain: boolean;
  reason: string;
}
export type CredentialIndex = ReadonlyMap<string, Readonly<Pick<PluginCredentialSummary, "authType">>>;

export function indexCredentials(items: readonly PluginCredentialSummary[]): CredentialIndex {
  return new Map(items.map((item) => [String(item.id), { authType: item.authType }]));
}

/** Never infer an SSH key from a key passphrase (which is not SSH password auth). */
export function methodFromAuthType(value: unknown): Method {
  if (typeof value !== "string") return "unknown";
  switch (value.trim().toLowerCase()) {
    case "password": case "pass": case "direct": return "password";
    case "key": case "privatekey": case "private-key": case "publickey": case "public-key": return "key";
    case "both": case "mixed": case "key+password": return "both";
    case "agent": case "ssh-agent": return "agent";
    case "none": return "none";
    case "": case "credential": return "unknown";
    default: return "custom";
  }
}

/**
 * Credential ids are only meaningful in the backend that owns them. The host
 * list and listCredentials() both come from the same (local) backend, so a
 * synced host or one that merely connects through the remote server
 * (connectionOrigin) is safe. Core already blanks the owner's credentialId for
 * a shared recipient; as a safeguard an id on a shared host or a read-only
 * shared copy (overrides live on the linked server) is never looked up
 * locally: ids are small integers and could hit an unrelated credential.
 */
const FOREIGN = "credential-foreign-id";
function isForeignServer(host: PluginHostRecord): boolean {
  return host.sharedCopy === true;
}
function fromCredential(
  id: string | number | null | undefined,
  credentials: CredentialIndex,
  reason: string,
  trusted = true,
): AuthInfo {
  if (id === null || id === undefined || String(id) === "") {
    return { source: "credential", method: "unknown", uncertain: true, reason: "credential-id-unavailable" };
  }
  if (!trusted) return { source: "credential", method: "unknown", uncertain: true, reason: FOREIGN };
  const credential = credentials.get(String(id));
  if (!credential) {
    return { source: "credential", method: "unknown", uncertain: true, reason: "credential-metadata-unavailable" };
  }
  const method = methodFromAuthType(credential.authType);
  return {
    source: "credential", method,
    customType: method === "custom" ? credential.authType : undefined,
    uncertain: method === "unknown", reason: method === "unknown" ? "credential-type-unavailable" : reason,
  };
}

/** A recipient's SSH override; core adds folder fields the SDK type does not list. */
type SharedOverride = HostAuthOverrideSummary & { folderCredentialId?: number | string | null };
function sharedOverride(host: PluginHostRecord): SharedOverride | undefined {
  return host.authOverrides?.ssh;
}

function classifyProtocolAuth(host: PluginHostRecord, credentials: CredentialIndex): AuthInfo {
  const foreign = isForeignServer(host);
  const all = host.protocolAuth ?? {};
  // The main protocol decides when it is known; with SSH merely switched off
  // on an "ssh" host every declared protocol is a candidate.
  const main = host.connectionType && host.connectionType !== "ssh" ? host.connectionType : undefined;
  const ids = new Set<string>(main ? [main] : Object.keys(all));
  if (!main && host.isShared) {
    for (const id of Object.keys(host.authOverrides ?? {})) if (id !== "ssh") ids.add(id);
  }
  const entries = [...ids].map((id) => [id, all[id], host.authOverrides?.[id]] as const);
  if (host.isShared) {
    // A shared recipient's own credential for a protocol wins over the owner's.
    for (const [, , override] of entries) {
      if (override?.credentialId !== null && override?.credentialId !== undefined) {
        return fromCredential(override.credentialId, credentials, "shared-recipient-credential", !foreign);
      }
    }
    if (entries.some(([, , o]) => o?.required)) {
      return { source: "credential", method: "unknown", uncertain: true, reason: "shared-credential-required" };
    }
    if (entries.length > 0 && entries.every(([, , o]) => o && !o.ownerAuthShared)) {
      return { source: "unknown", method: "unknown", uncertain: true, reason: "shared-owner-auth-not-provided" };
    }
  }
  const present = entries.filter((e): e is readonly [string, NonNullable<typeof e[1]>, typeof e[2]] => !!e[1]);
  const saved = present.find(([, e]) => e.authType === "credential");
  if (saved) {
    // A protocol login set to "credential" with none picked inherits the
    // credential of the folder or user default. Core materializes that default
    // into the host's own authType/credentialId, so read it from there.
    const inherited = saved[1].credentialId == null && (host.authType ?? "").trim().toLowerCase() === "credential"
      ? host.credentialId : undefined;
    return fromCredential(saved[1].credentialId ?? inherited, credentials, "protocol-credential", !foreign && !host.isShared);
  }
  if (present.some(([, e]) => e.authType === "direct")) {
    return { source: "host", method: "password", uncertain: false, reason: "protocol-direct" };
  }
  if (present.some(([, e]) => e.authType === "none")) {
    return { source: "host", method: "none", uncertain: false, reason: "protocol-none" };
  }
  return { source: "unknown", method: "unknown", uncertain: true, reason: "non-ssh-host" };
}

/**
 * Determine the SSH login recorded by Termix. Never claim to know the method
 * if a shared host/credential doesn't expose sufficient metadata.
 */
export function classifyHost(
  host: PluginHostRecord,
  credentials: CredentialIndex,
  providers?: readonly SshAuthTypeInfo[],
): AuthInfo {
  const info = classifyHostInner(host, credentials, providers);
  // A shared host without SSH override metadata: the owner's login may not be
  // what the recipient connects with, so never present it as certain.
  const noOverride = host.isShared && !host.authOverrides?.ssh && info.reason !== "non-ssh-host"
    && !info.reason.startsWith("protocol-") && info.reason !== "quick-connect";
  return noOverride && !info.uncertain ? { ...info, uncertain: true } : info;
}

function classifyHostInner(
  host: PluginHostRecord,
  credentials: CredentialIndex,
  providers?: readonly SshAuthTypeInfo[],
): AuthInfo {
  // Quick Connect hosts are never saved and carry their login in plain text.
  if (host.quickConnectLogin?.password) {
    return { source: "host", method: "password", uncertain: false, reason: "quick-connect" };
  }
  // SSH is off (non-SSH main protocol or enableSsh=false): the login lives in
  // protocolAuth of the plugin protocols (RDP, VNC, ...), not in host.authType.
  const sshOff = host.enableSsh === false
    || (!!host.connectionType && host.connectionType !== "ssh" && host.enableSsh !== true);
  if (sshOff) return classifyProtocolAuth(host, credentials);
  const foreign = isForeignServer(host);
  const shared = sharedOverride(host);
  if (host.isShared && shared) {
    if (shared.credentialId !== null && shared.credentialId !== undefined) {
      return fromCredential(shared.credentialId, credentials, "shared-recipient-credential", !foreign);
    }
    // The recipient's own credential applied through a folder default.
    if (shared.folderCredentialId !== null && shared.folderCredentialId !== undefined) {
      return fromCredential(shared.folderCredentialId, credentials, "shared-folder-credential", !foreign);
    }
    if (shared.required) {
      return { source: "credential", method: "unknown", uncertain: true, reason: "shared-credential-required" };
    }
    // A host without any secret (agent, none) is shown as it is even though
    // the owner shares nothing; otherwise the owner's login is hidden.
    const secretless = ["agent", "none"].includes((host.authType ?? "").trim().toLowerCase());
    if (!shared.ownerAuthShared && !secretless) {
      return { source: "unknown", method: "unknown", uncertain: true, reason: "shared-owner-auth-not-provided" };
    }
    // The owner's auth may be shared without exposing their credential metadata.
  }
  const auth = (host.authType ?? "").trim().toLowerCase();
  if (auth === "credential" || (auth === "" && host.credentialId != null)) {
    // On a shared host host.credentialId is the owner's, not the recipient's.
    return fromCredential(host.credentialId, credentials, "saved-credential", !foreign && !host.isShared);
  }
  const method = methodFromAuthType(auth);
  if (method === "custom") {
    // Termix allows arbitrary SSH auth providers. Recognize currently registered
    // types instead of pretending all unknown strings are known plugins.
    if (!providers) {
      return { source: "unknown", method: "unknown", uncertain: true, reason: "ssh-provider-registry-not-loaded" };
    }
    const registered = providers.some(p => p.type.toLowerCase() === auth);
    if (!registered) {
      return { source: "unknown", method: "unknown", uncertain: true, reason: "unrecognized-ssh-auth-type" };
    }
    return { source: "plugin", method, customType: host.authType, uncertain: false, reason: "plugin-auth-type" };
  }
  if (method === "unknown") {
    return { source: "unknown", method, uncertain: true, reason: "host-auth-type-unavailable" };
  }
  return { source: "host", method, uncertain: false, reason: "host-auth-type" };
}
