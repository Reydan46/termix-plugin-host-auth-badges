import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePreferences, resolveForHost} from '../src/frontend/preferences.ts';
import {defaultsFor, serializePart, readPart} from '../src/frontend/appearance.ts';
import {LAYOUT_VARIANTS, PALETTE_PRESETS} from '../src/frontend/design.ts';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('12 layouts and 18 palettes are offered',()=>{
 assert.equal(LAYOUT_VARIANTS.length,12);
 assert.equal(PALETTE_PRESETS.length,18);
});
test('current user appearance stays identical after normalization',()=>{
 const source={...defaultsFor('source'),showIcon:true,showLabel:true,labels:{credential:'LOGIN'},icons:{...defaultsFor('source').icons,credential:'server'}};
 const method={...defaultsFor('method'),showIcon:false,labels:{key:'SSHKEY'}};
 const prefs=normalizePreferences({
  enabled:true,position:'before',layoutVariant:'joined-flat',palettePreset:'retro',textSize:90,iconSize:145,
  sourceConfig:serializePart(source,'source'),methodConfig:serializePart(method,'method'),
 });
 assert.equal(prefs.position,'before');
 assert.equal(prefs.layoutVariant,'joined-flat');
 assert.equal(prefs.palettePreset,'retro');
 assert.equal(prefs.textSize,90);assert.equal(prefs.iconSize,145);
 assert.equal(prefs.sourceConfig.showIcon,true);
 assert.equal(prefs.sourceConfig.labels.credential,'LOGIN');
 assert.equal(prefs.sourceConfig.icons.credential,'server');
 assert.equal(prefs.methodConfig.showIcon,false);
 assert.equal(prefs.methodConfig.labels.key,'SSHKEY');
});
test('source/method overrides inherit independently and serialized values are stable',()=>{
 const base=normalizePreferences({palettePreset:'tokyo',sourceConfig:serializePart({...defaultsFor('source'),showIcon:true},'source')});
 const override={sourceOverride:serializePart({...base.sourceConfig,showLabel:false},'source')};
 const first=resolveForHost(base,override);
 assert.equal(first.sourceConfig.showLabel,false);
 assert.equal(first.methodConfig.showLabel,true);
 assert.equal(first.palettePreset,'tokyo');
 const snapshot=serializePart(first.sourceConfig,'source');
 const second=readPart(snapshot,'source');
 assert.equal(serializePart(second,'source'),snapshot);
 assert.equal(base.sourceConfig.showLabel,true);
});
test('reset values remain the requested simple default without altering enabled state',()=>{
 const prefs=normalizePreferences({});
 assert.equal(prefs.layoutVariant,'bare');
 assert.equal(prefs.palettePreset,'catppuccin');
 assert.equal(prefs.position,'after');
 assert.equal(prefs.sourceConfig.showIcon,false);
 assert.equal(prefs.sourceConfig.showLabel,true);
 assert.equal(prefs.methodConfig.showIcon,true);
 assert.equal(prefs.methodConfig.showLabel,true);
 assert.equal(prefs.textSize,100);
 assert.equal(prefs.iconSize,100);
});
test('unknown layout falls back to the default',()=>{
 assert.equal(normalizePreferences({layoutVariant:'no-such-layout'}).layoutVariant,'bare');
});
test('unconfigured hosts share the global preferences object, avoiding unnecessary decoding',()=>{
 const prefs=normalizePreferences({});
 for(const value of [undefined,null,{}, {sourceOverride:'',methodOverride:'',compositionOverride:''}]){
   assert.strictEqual(resolveForHost(prefs,value),prefs);
 }
});
test('only changed host override group is parsed and other parts retain references',()=>{
 const prefs=normalizePreferences({});
 const result=resolveForHost(prefs,{compositionOverride:JSON.stringify({layoutVariant:'flow'})});
 assert.equal(result.layoutVariant,'flow');
 assert.strictEqual(result.sourceConfig,prefs.sourceConfig);
 assert.strictEqual(result.methodConfig,prefs.methodConfig);
 const sourceOnly=resolveForHost(prefs,{sourceOverride:JSON.stringify({showIcon:true})});
 assert.notStrictEqual(sourceOnly.sourceConfig,prefs.sourceConfig);
 assert.strictEqual(sourceOnly.methodConfig,prefs.methodConfig);
 assert.equal(sourceOnly.sourceConfig.showIcon,true);
});
test('host renderer re-evaluates current authentication and effective settings on every core host update',()=>{
 const frontend=read('src/frontend/index.tsx');
 for(const value of ['host.pluginSettings','resolveForHost(userPrefs, ownHostSettings)','classifyHost(host, visibleCredentials','AuthBadgeView info={info}'])
   assert.ok(frontend.includes(value),`missing correctness path ${value}`);
 assert.doesNotMatch(frontend,/useMemo\(/);
});
test('compact sizing is calculated once per badge; parts share one result',()=>{
 const view=read('src/frontend/view.tsx');
 assert.equal((view.match(/const pixels = compactBadgePixels\(/g)||[]).length,1);
 assert.match(view,/compactBadgePixels\(preferences\.textSize, preferences\.iconSize\)/);
 assert.doesNotMatch(view,/compactBadgePixels\([^)]*,[^)]*,[^)]*\)/);
 assert.match(view,/pixels=\{pixels\}/);
});
