import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HOST_GROUP_KEYS,hostFieldPresence,clearHostGroups,inheritanceSummary} from '../src/frontend/inheritance.ts';
import {normalizePreferences,resolveForHost,isMethodIconOnly} from '../src/frontend/preferences.ts';
import {classifyHost} from '../src/frontend/classify.ts';

const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');

test('inheritance clearing is field-specific and never mutates other host settings',()=>{
 const first={compositionOverride:'{"palettePreset":"forest"}',sourceOverride:'{"showIcon":true}',methodOverride:'{"showLabel":false}',otherPlugin:'keep'};
 const cleared=clearHostGroups(first,['sourceOverride']);
 assert.equal(cleared.sourceOverride,null);
 assert.equal(cleared.compositionOverride,first.compositionOverride);
 assert.equal(cleared.methodOverride,first.methodOverride);
 assert.equal(cleared.otherPlugin,'keep');
 assert.equal(first.sourceOverride,'{"showIcon":true}');
});
test('reset-all clears exactly the 3 own host defaults fields',()=>{
 const first={compositionOverride:'some',sourceOverride:'some',methodOverride:'some',unrelated:'preserve'};
 const next=clearHostGroups(first);
 assert.deepEqual(HOST_GROUP_KEYS,['compositionOverride','sourceOverride','methodOverride']);
 for(const key of HOST_GROUP_KEYS)assert.equal(next[key],null);
 assert.equal(next.unrelated,'preserve');
});
test('effective values cannot be mistaken for local override provenance',()=>{
 const effective={compositionOverride:'{"layoutVariant":"joined"}',sourceOverride:'',methodOverride:null};
 assert.deepEqual(inheritanceSummary(effective),[
   {key:'compositionOverride',present:true},
   {key:'sourceOverride',present:false},
   {key:'methodOverride',present:false}
 ]);
 assert.equal(hostFieldPresence(effective,'compositionOverride'),'effective');
 // Source metadata offers no `isLocallyOverridden`, parent path or scope identity.
 assert.doesNotMatch(read('src/frontend/designer.tsx'),/hostId=\{(?:values|props)/);
});
test('after clearing all groups the plugin-side fallback is user preferences',()=>{
 const prefs=normalizePreferences({layoutVariant:'flow',palettePreset:'dracula'});
 const overridden={compositionOverride:'{"layoutVariant":"pill"}',sourceOverride:'{"showIcon":true}',methodOverride:'{"showLabel":false}'};
 const cleared=clearHostGroups(overridden);
 const effective=resolveForHost(prefs,cleared);
 assert.equal(effective.layoutVariant,'flow');
 assert.equal(effective.palettePreset,'dracula');
 assert.strictEqual(effective,prefs);
});
test('reset all is guarded by an explicit confirmation dialog and never calls Save itself',()=>{
 const designer=read('src/frontend/designer.tsx');
 assert.match(designer,/setConfirmAll\(true\)/);
 assert.match(designer,/role="dialog" aria-modal="true"/);
 assert.match(designer,/dialogRef/);
 assert.match(designer,/onClear\(HOST_GROUP_KEYS\)/);
 assert.match(designer,/for\(const key of keys\)setValue\(key,null\)/);
 assert.doesNotMatch(designer,/useSettings\('host'/);
});
test('source/method truth is determined by current host, not cached auth from a sibling',()=>{
 const creds=new Map([['1',{authType:'password'}],['2',{authType:'key'}]]);
 const host={id:'A',connectionType:'ssh',authType:'credential',credentialId:'1'};
 assert.equal(classifyHost(host,creds).method,'password');
 host.credentialId='2';
 assert.equal(classifyHost(host,creds).method,'key');
 host.authType='agent';
 assert.equal(classifyHost(host,creds).method,'agent');
 host.authType='none';
 assert.equal(classifyHost(host,creds).method,'none');
});
test('reset UI localization covers both languages',()=>{
 const en=JSON.parse(read('locales/en.json'));
 const ru=JSON.parse(read('locales/translated/ru_RU.json'));
 for(const key of ['inheritHeading','inheritResetAll','inheritLimit','inheritComposition','inheritSource','inheritMethod','inheritSingle','inheritConfirm','inheritCancel','inheritParentUnknown']){
  assert.ok(en.ui[key]&&ru.ui[key],key);
 }
});

test('method-icon-only configuration is detected, not overwritten',()=>{
 const prefs=normalizePreferences({sourceConfig:JSON.stringify({showLabel:false}),methodConfig:JSON.stringify({showIcon:true,showLabel:false})});
 assert.equal(isMethodIconOnly(prefs),true);
 assert.equal(prefs.sourceConfig.showLabel,false);
 assert.equal(normalizePreferences({}).sourceConfig.showLabel,true);
 assert.equal(isMethodIconOnly(normalizePreferences({})),false);
});
