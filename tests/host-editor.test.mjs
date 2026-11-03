import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePreferences,resolveForHost} from '../src/frontend/preferences.ts';
import {defaultsFor,serializePart} from '../src/frontend/appearance.ts';
const raw=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url),'utf8'));
const source=readFileSync(new URL('../src/frontend/designer.tsx',import.meta.url),'utf8');

test('host/folder data survives unified editor and each group can inherit independently',()=>{
 const user=normalizePreferences({layoutVariant:'flow',palettePreset:'gruvbox',textSize:120});
 const sourcePart={...defaultsFor('source'),showIcon:true};
 const methodPart={...defaultsFor('method'),showLabel:false};
 const saved={
  compositionOverride:JSON.stringify({palettePreset:'nord'}),
  sourceOverride:serializePart(sourcePart,'source'),
  methodOverride:serializePart(methodPart,'method'),
 };
 const actual=resolveForHost(user,saved);
 assert.equal(actual.layoutVariant,'flow'); // No explicit host layout -> inherit user value
 assert.equal(actual.palettePreset,'nord');
 assert.equal(actual.sourceConfig.showIcon,true);
 assert.equal(actual.methodConfig.showLabel,false);
 assert.equal(actual.textSize,120);
 const sourceOnly=resolveForHost(user,{sourceOverride:saved.sourceOverride});
 assert.equal(sourceOnly.palettePreset,'gruvbox');
 assert.equal(sourceOnly.methodConfig.showLabel,true);
});

test('host form only exposes one custom editor but keeps all 3 defaultable JSON fields',()=>{
 const fields=raw.contributes.settings.host.fields;
 assert.equal(fields.length,3);
 assert.equal(fields.filter(field=>!field.hidden).length,1);
 assert.equal(fields[0].type,'custom');
 for(const field of fields.slice(1)){
  assert.equal(field.type,'string');
  assert.equal(field.hidden,true);
  assert.equal(field.default,'');
 }
 assert.match(source,/setValue\('compositionOverride',serialized\)/);
 assert.match(source,/setValue\(key,pending.current\[key\]\)/);
 assert.match(source,/const prefs=resolveForHost\(base,values\)/);
});
