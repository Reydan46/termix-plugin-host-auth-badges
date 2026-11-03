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

function fromCredential(
  id: string | number | null | undefined,
  credentials: CredentialIndex,
  reason: string,
): AuthInfo {
  if (id === null || id === undefined || String(id) === "") {
    return { source: "credential", method: "unknown", uncertain: true, reason: "credential-id-unavailable" };
  }
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

function sharedOverride(host: PluginHostRecord): HostAuthOverrideSummary | undefined {
  return host.authOverrides?.ssh;
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
  // A non-SSH main protocol can have SSH enabled separately.
  if (host.connectionType && host.connectionType !== "ssh" && host.enableSsh !== true) {
    return { source: "unknown", method: "unknown", uncertain: true, reason: "non-ssh-host" };
  }
  const shared = sharedOverride(host);
  if (host.isShared && shared) {
    if (shared.credentialId !== null && shared.credentialId !== undefined) {
      return fromCredential(shared.credentialId, credentials, "shared-recipient-credential");
    }
    if (shared.required) {
      return { source: "credential", method: "unknown", uncertain: true, reason: "shared-credential-required" };
    }
    if (!shared.ownerAuthShared) {
      return { source: "unknown", method: "unknown", uncertain: true, reason: "shared-owner-auth-not-provided" };
    }
    // The owner's auth may be shared without exposing their credential metadata.
  }
  const auth = (host.authType ?? "").trim().toLowerCase();
  if (auth === "credential" || (auth === "" && host.credentialId != null)) {
    return fromCredential(host.credentialId, credentials, "saved-credential");
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
