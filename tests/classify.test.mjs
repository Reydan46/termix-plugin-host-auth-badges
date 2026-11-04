import test from "node:test";
import assert from "node:assert/strict";
import { classifyHost, indexCredentials, methodFromAuthType } from "../src/frontend/classify.ts";

const credentialMap = indexCredentials([
  { id: 1, name: "prod-key", authType: "key" },
  { id: 2, name: "other-pass", authType: "password" },
  { id: 3, name: "two-methods", authType: "both" },
]);
const h = (overrides) => ({ id: "h1", name: "example", ip: "10.0.0.1", port: 22, connectionType: "ssh", ...overrides });

test("saved key credential", () => {
  assert.deepEqual(classifyHost(h({ authType: "credential", credentialId: 1 }), credentialMap), {
    source: "credential", method: "key", customType: undefined,
    uncertain: false, reason: "saved-credential",
  });
});
test("saved password credential", () => {
  assert.equal(classifyHost(h({ authType: "credential", credentialId: 2 }), credentialMap).method, "password");
});
test("direct host password and key", () => {
  assert.equal(classifyHost(h({ authType: "password" }), credentialMap).source, "host");
  assert.equal(classifyHost(h({ authType: "key" }), credentialMap).method, "key");
});
test("key passphrase is not treated as password auth", () => {
  assert.equal(methodFromAuthType("key"), "key");
});
test("stored credential with both", () => {
  assert.equal(classifyHost(h({ authType: "credential", credentialId: 3 }), credentialMap).method, "both");
});
test("credential missing or inaccessible is NOT guessed", () => {
  assert.equal(classifyHost(h({ authType: "credential", credentialId: 99 }), credentialMap).method, "unknown");
  assert.equal(classifyHost(h({ authType: "credential" }), credentialMap).reason, "credential-id-unavailable");
});
test("host defaults may yield credential id without explicit authType", () => {
  assert.equal(classifyHost(h({ credentialId: 1 }), credentialMap).source, "credential");
});
test("SSH auth agent, none, custom provider", () => {
  assert.equal(classifyHost(h({ authType: "agent" }), credentialMap).method, "agent");
  assert.equal(classifyHost(h({ authType: "none" }), credentialMap).method, "none");
  assert.equal(classifyHost(h({ authType: "my-vault-cert" }), credentialMap).source, "unknown");
});
test("shared host recipient-specific credential takes priority", () => {
  const result = classifyHost(h({ authType: "password", isShared: true, authOverrides: { ssh: { credentialId: 1, required: true, ownerAuthShared: false } } }), credentialMap);
  assert.equal(result.method, "key");
  assert.equal(result.reason, "shared-recipient-credential");
});
test("shared credential required but not selected -> unknown", () => {
  const result = classifyHost(h({ authType: "key", isShared: true, authOverrides: { ssh: { required: true, ownerAuthShared: false } } }), credentialMap);
  assert.equal(result.method, "unknown");
});
test("shared owner auth not provided -> unknown", () => {
  const result = classifyHost(h({ authType: "key", isShared: true, authOverrides: { ssh: { required: false, ownerAuthShared: false } } }), credentialMap);
  assert.equal(result.source, "unknown");
});
test("host with SSH off uses protocol login for the source", () => {
  const cred = classifyHost(h({ enableSsh: false, authType: "password", protocolAuth: { rdp: { authType: "credential", credentialId: 2 } } }), credentialMap);
  assert.equal(cred.source, "credential");
  assert.equal(cred.method, "password");
  const direct = classifyHost(h({ enableSsh: false, protocolAuth: { rdp: { authType: "direct" } } }), credentialMap);
  assert.equal(direct.source, "host");
});
test("shared host with SSH off prefers recipient credential; none is host/none", () => {
  const shared = classifyHost(h({ enableSsh: false, isShared: true, protocolAuth: { rdp: { authType: "credential" } }, authOverrides: { rdp: { credentialId: 2, required: true, ownerAuthShared: false } } }), credentialMap);
  assert.deepEqual([shared.source, shared.method], ["credential", "password"]);
  const none = classifyHost(h({ enableSsh: false, protocolAuth: { rdp: { authType: "none" } } }), credentialMap);
  assert.deepEqual([none.source, none.method], ["host", "none"]);
});
test("foreign credential ids are never looked up locally", () => {
  // id 1 exists locally; it must not be applied to another server's / owner's credential
  for (const extra of [{ sharedCopy: true }, { isShared: true }]) {
    const r = classifyHost(h({ authType: "credential", credentialId: 1, ...extra }), credentialMap);
    assert.deepEqual([r.source, r.method, r.uncertain], ["credential", "unknown", true], JSON.stringify(extra));
  }
  const rdp = classifyHost(h({ enableSsh: false, sharedCopy: true, protocolAuth: { rdp: { authType: "credential", credentialId: 1 } } }), credentialMap);
  assert.equal(rdp.method, "unknown");
  const recipient = classifyHost(h({ authType: "credential", credentialId: 9, isShared: true, authOverrides: { ssh: { credentialId: 2, required: true, ownerAuthShared: true } } }), credentialMap);
  assert.equal(recipient.method, "password");
  // connectionOrigin only says where the connection starts; ids stay local
  for (const connectionOrigin of ["local", "remote", null]) {
    const own = classifyHost(h({ authType: "credential", credentialId: 1, connectionOrigin }), credentialMap);
    assert.notEqual(own.method, "unknown", String(connectionOrigin));
  }
});
test("protocol logins follow the main protocol and shared metadata", () => {
  const pa = { vnc: { authType: "credential", credentialId: 3 }, rdp: { authType: "direct" } };
  assert.deepEqual(classifyHost(h({ connectionType: "rdp", protocolAuth: pa }), credentialMap).source, "host");
  const notShared = classifyHost(h({ connectionType: "rdp", isShared: true, protocolAuth: { rdp: { authType: "direct" } }, authOverrides: { rdp: { required: false, ownerAuthShared: false } } }), credentialMap);
  assert.equal(notShared.reason, "shared-owner-auth-not-provided");
  const overrideOnly = classifyHost(h({ connectionType: "rdp", isShared: true, authOverrides: { rdp: { credentialId: 2, required: true, ownerAuthShared: false } } }), credentialMap);
  assert.deepEqual([overrideOnly.source, overrideOnly.method], ["credential", "password"]);
  const qc = classifyHost(h({ connectionType: "rdp", quickConnectLogin: { protocol: "rdp", password: "x" } }), credentialMap);
  assert.equal(qc.source, "host");
  const sharedNoOverride = classifyHost(h({ isShared: true, authType: "password" }), credentialMap);
  assert.deepEqual([sharedNoOverride.source, sharedNoOverride.uncertain], ["host", true]);
});
test("shared recipient with a folder credential is CRED, not unknown", () => {
  const r = classifyHost(h({ authType: "key", isShared: true, authOverrides: { ssh: { required: false, ownerAuthShared: false, folderCredentialId: 2 } } }), credentialMap);
  assert.deepEqual([r.source, r.method], ["credential", "password"]);
});
test("shared secretless host keeps agent/none, hidden owner login stays unknown", () => {
  const ov = { ssh: { required: false, ownerAuthShared: false } };
  assert.equal(classifyHost(h({ authType: "agent", isShared: true, authOverrides: ov }), credentialMap).method, "agent");
  assert.equal(classifyHost(h({ authType: "key", isShared: true, authOverrides: ov }), credentialMap).source, "unknown");
});
test("protocol credential without an id inherits the folder/user default credential", () => {
  const r = classifyHost(h({ enableSsh: false, authType: "credential", credentialId: 2, protocolAuth: { rdp: { authType: "credential", credentialId: null } } }), credentialMap);
  assert.deepEqual([r.source, r.method], ["credential", "password"]);
  const none = classifyHost(h({ enableSsh: false, authType: "password", protocolAuth: { rdp: { authType: "credential", credentialId: null } } }), credentialMap);
  assert.equal(none.reason, "credential-id-unavailable");
});
test("non SSH host is excluded", () => {
  assert.equal(classifyHost(h({ connectionType: "rdp", enableSsh: false }), credentialMap).reason, "non-ssh-host");
  assert.equal(classifyHost(h({ connectionType: "rdp", enableSsh: true, authType: "key" }), credentialMap).method, "key");
});


test('all documented direct SSH methods and dynamic SSH providers are classified',()=>{
 for(const [authType,method] of [['password','password'],['key','key'],['agent','agent'],['ssh-agent','agent'],['none','none']]){
  const result=classifyHost(h({authType}),credentialMap);
  assert.equal(result.source,'host'); assert.equal(result.method,method);
 }
 const providers=[{type:'vault-sign',labelKey:'vault.label',pluginId:'vault',credentialType:true,supportsBackground:false,quickConnect:true}];
 const awaiting=classifyHost(h({authType:'vault-sign'}),credentialMap);
 assert.equal(awaiting.source,'unknown'); assert.equal(awaiting.reason,'ssh-provider-registry-not-loaded');
 const custom=classifyHost(h({authType:'vault-sign'}),credentialMap,providers);
 assert.equal(custom.source,'plugin');assert.equal(custom.method,'custom');assert.equal(custom.customType,'vault-sign');
 const orphan=classifyHost(h({authType:'not-registered'}),credentialMap,providers);
 assert.equal(orphan.source,'unknown');assert.equal(orphan.method,'unknown');assert.equal(orphan.uncertain,true);
});

test('key passphrase and forwarding options never manufacture another SSH auth kind',()=>{
 const result=classifyHost(h({authType:'key',sshOptions:{agentForwarding:true}}),credentialMap);
 assert.equal(result.method,'key');
});
