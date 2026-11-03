import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCredentialStore} from '../src/frontend/store.ts';
import {normalizePreferences,resolveForHost} from '../src/frontend/preferences.ts';
import {defaultsFor,serializePart} from '../src/frontend/appearance.ts';

const deferred=()=>{let resolve;let reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};};
test('account change invalidates pending credential requests and clears prior metadata',async()=>{
 const first=deferred(),second=deferred();
 let count=0;
 const store=createCredentialStore(()=>++count===1?first.promise:second.promise);
 const pending=store.refresh();
 store.reset();
 assert.equal(store.get().loaded,false);
 const newPending=store.refresh();
 first.resolve([{id:1,name:'owner-account-key',authType:'key'}]);
 await pending;
 assert.equal(store.get().byId.size,0);
 second.resolve([{id:1,name:'recipient-account-password',authType:'password'}]);
 await newPending;
 assert.equal(store.get().byId.get('1').authType,'password');
});
test('metadata retrieval failure clears earlier result and does not expose stale credential names',async()=>{
 let count=0;
 const store=createCredentialStore(async()=>{if(++count===1)return [{id:1,name:'secret-label',authType:'key'}];throw new Error('permission changed');});
 await store.refresh();assert.equal(store.get().byId.get('1').name,undefined);assert.equal(store.get().byId.get('1').authType,'key');
 await store.refresh();assert.equal(store.get().error,true);assert.equal(store.get().byId.size,0);
});
test('host, folder, user and server effective settings remain field-separated and do not mutate defaults',()=>{
 const user=normalizePreferences({position:'after',layoutVariant:'bare',palettePreset:'ocean'});
 const source={...defaultsFor('source'),showLabel:false};
 const method={...defaultsFor('method'),labels:{key:'SSHKEY'}};
 const resolved=resolveForHost(user,{
  compositionOverride:JSON.stringify({layoutVariant:'joined-flat',textSize:120}),
  sourceOverride:serializePart(source,'source'),
  methodOverride:serializePart(method,'method')
 });
 assert.equal(resolved.layoutVariant,'joined-flat');
 assert.equal(resolved.textSize,120);
 assert.equal(resolved.iconSize,100);
 assert.equal(resolved.sourceConfig.showLabel,false);
 assert.equal(resolved.methodConfig.labels.key,'SSHKEY');
 assert.equal(user.layoutVariant,'bare');
 assert.equal(user.sourceConfig.showLabel,true);
});
test('personal user defaults differ while owner-controlled host overrides stay shared',()=>{
 const owner=normalizePreferences({palettePreset:'ocean'});
 const viewer=normalizePreferences({palettePreset:'forest'});
 assert.equal(resolveForHost(owner,{}).palettePreset,'ocean');
 assert.equal(resolveForHost(viewer,{}).palettePreset,'forest');
 const shared={compositionOverride:JSON.stringify({palettePreset:'signature',layoutVariant:'joined-flat'})};
 assert.equal(resolveForHost(owner,shared).palettePreset,'signature');
 assert.equal(resolveForHost(viewer,shared).palettePreset,'signature');
 assert.equal(resolveForHost(viewer,shared).layoutVariant,'joined-flat');
});

test('effective palette is identical in global, host, and folder views; explicit custom colors survive',async()=>{
 const {effectiveColor,PALETTE_PRESETS,PALETTES}=await import('../src/frontend/design.ts');
 for(const palette of PALETTE_PRESETS){
  const global=normalizePreferences({palettePreset:palette});
  const host=resolveForHost(global,{});
  const folder=resolveForHost(global,{compositionOverride:JSON.stringify({palettePreset:palette})});
  for(const kind of ['source','method'])for(const [key,expected] of Object.entries(PALETTES[palette][kind])){
   const property=kind==='source'?'sourceConfig':'methodConfig';
   const color=preferences=>effectiveColor(preferences.palettePreset,kind,key,preferences[property].colors[key]);
   assert.equal(color(global),expected,`${palette}/${kind}/${key}: global`);
   assert.equal(color(host),expected,`${palette}/${kind}/${key}: host`);
   assert.equal(color(folder),expected,`${palette}/${kind}/${key}: folder`);
  }
 }
 const customSource={...defaultsFor('source'),colors:{...defaultsFor('source').colors,credential:'#123456'}};
 const base=normalizePreferences({palettePreset:'gruvbox'});
 const override=resolveForHost(base,{sourceOverride:serializePart(customSource,'source')});
 assert.equal(effectiveColor(override.palettePreset,'source','credential',override.sourceConfig.colors.credential),'#123456');
 assert.equal(effectiveColor(override.palettePreset,'source','host',override.sourceConfig.colors.host),PALETTES.gruvbox.source.host);
 assert.equal(effectiveColor(base.palettePreset,'source','credential',base.sourceConfig.colors.credential),PALETTES.gruvbox.source.credential);
});


test('credential metadata is tagged with the current user and never displayed under another account',async()=>{
 let current=[{id:1,name:'alice-private',authType:'key'}];
 const store=createCredentialStore(async()=>current);
 store.reset('alice');
 await store.refresh();
 assert.equal(store.get().userId,'alice');
 assert.equal(store.get().byId.get('1').authType,'key');
 // A HostBadge for Bob compares this snapshot's owner to useCurrentUser().userId.
 assert.notEqual(store.get().userId,'bob');
 store.reset('bob');
 assert.equal(store.get().userId,'bob');
 assert.equal(store.get().byId.size,0);
 current=[{id:1,name:'bob-private',authType:'password'}];
 await store.refresh();
 assert.equal(store.get().userId,'bob');
 assert.equal(store.get().byId.get('1').authType,'password');
});


test('frontend metadata subscriptions bind to user identity before showing credential details',()=>{
 const index=readFileSync(new URL('../src/frontend/index.tsx',import.meta.url),'utf8');
 assert.match(index,/credentials\.reset\(userId\)/);
 assert.match(index,/creds\.userId === currentUserId \? creds\.byId : EMPTY_CREDENTIALS/);
 assert.match(index,/\[loaded, key, userId\]/);
});
