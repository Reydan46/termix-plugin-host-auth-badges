import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const load=x=>JSON.parse(readFileSync(resolve(root,x),'utf8'));
const manifest=load('manifest.json'),pkg=load('package.json'),en=load('locales/en.json'),ru=load('locales/translated/ru_RU.json');
const lookup=(o,key)=>key.split('.').reduce((value,name)=>value?.[name],o);
const userKeys=['designer','enabled','position','textSize','iconSize','sourceConfig','methodConfig','layoutVariant','palettePreset'];
test('version and minimal permissions/capabilities agree',()=>{
 assert.equal(manifest.version,'1.0.0');assert.equal(manifest.version,pkg.version);
 assert.deepEqual(manifest.capabilities,['ui:surface']);assert.deepEqual(manifest.env,[]);
});
test('manifest declares exactly the user settings the UI uses',()=>{
 assert.deepEqual(manifest.contributes.settings.user.map(x=>x.key),userKeys);
});
test('host/folder inherit three independent fields with only one visible panel',()=>{
 const fields=manifest.contributes.settings.host.fields;
 assert.deepEqual(fields.map(f=>f.key),['compositionOverride','sourceOverride','methodOverride']);
 assert.equal(fields.filter(f=>f.type==='custom'&&!f.hidden).length,1);
 for(const f of fields){assert.equal(f.defaultable,true);assert.deepEqual(f.defaultLevels,['admin','user','folder']);}
});
test('all native user and host fields have localized nonempty labelKey even hidden',()=>{
 const fields=[...manifest.contributes.settings.user.filter(f=>f.type!=='custom'),...manifest.contributes.settings.host.fields];
 for(const f of fields){assert.ok(f.labelKey?.trim(),f.key);for(const lang of [en,ru])assert.ok(lookup(lang,f.labelKey)?.trim(),f.labelKey);}
});
test('all palette and layout names are localized',async()=>{
 const {LAYOUT_VARIANTS,PALETTE_PRESETS}=await import('../src/frontend/design.ts');
 for(const name of LAYOUT_VARIANTS)for(const lang of [en,ru])assert.ok(lookup(lang,`ui.layout.${name}`));
 for(const name of PALETTE_PRESETS)for(const lang of [en,ru])assert.ok(lookup(lang,`ui.palettes.${name}`));
});
test('newest changelog section matches the manifest version',()=>{
 const content=readFileSync(resolve(root,'CHANGELOG.md'),'utf8');
 assert.ok(content.includes(`## ${manifest.version}`));
 assert.match(content,/### (Added|Changed|Fixed|Removed)/);
});
test('locales have identical non-empty keys and match the manifest name and description',()=>{
 const flat=(node,prefix='')=>Object.entries(node).flatMap(([k,v])=>typeof v==='string'?[[prefix+k,v]]:flat(v,`${prefix}${k}.`));
 const enEntries=flat(en),ruEntries=flat(ru);
 assert.deepEqual(ruEntries.map(([k])=>k),enEntries.map(([k])=>k));
 for(const [key,value] of [...enEntries,...ruEntries])assert.ok(value.trim(),key);
 assert.equal(en.plugin.name,manifest.name);
 assert.equal(en.plugin.description,manifest.description);
});
