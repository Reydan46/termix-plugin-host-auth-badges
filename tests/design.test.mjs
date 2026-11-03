import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PALETTE_PRESETS, PALETTES, LAYOUT_VARIANTS, effectiveColor, normalizedLayout, normalizedPalette, SHORT_LABELS, editableLabel, withUpdatedLabel, withDefaultLabels, isLabelModified, hasModifiedLabels} from '../src/frontend/design.ts';
import {defaultsFor, readPart, serializePart, defaultIcon, iconFor, resetIcon, resetColor, isIconModified, isColorModified, validHex} from '../src/frontend/appearance.ts';
import {normalizePreferences, resolveForHost} from '../src/frontend/preferences.ts';

test('all supported layout IDs are distinct; Unframed is first',()=>{
 assert.equal(LAYOUT_VARIANTS.length,12);assert.equal(LAYOUT_VARIANTS[0],'bare');
 assert.equal(new Set(LAYOUT_VARIANTS).size,LAYOUT_VARIANTS.length);
 assert.equal(normalizedLayout('unsupported'),'bare');
});
test('18 palettes cover every SOURCE/METHOD category',()=>{
 assert.equal(PALETTE_PRESETS.length,18);
 for(const name of PALETTE_PRESETS){
  assert.deepEqual(Object.keys(PALETTES[name].source).sort(),Object.keys(SHORT_LABELS.source).sort());
  assert.deepEqual(Object.keys(PALETTES[name].method).sort(),Object.keys(SHORT_LABELS.method).sort());
 }
 assert.equal(normalizedPalette('unsupported'),'catppuccin');
});
test('changing palette changes all non-overridden colors, custom overrides are respected',()=>{
 for(const kind of ['source','method'])for(const key of Object.keys(SHORT_LABELS[kind])){
  assert.equal(effectiveColor('ocean',kind,key,undefined),PALETTES.ocean[kind][key]);
  assert.equal(effectiveColor('gruvbox',kind,key,'#123456'),'#123456');
  assert.equal(effectiveColor('monochrome',kind,key,'#123456'),PALETTES.monochrome[kind][key]);
 }
});
test('Source text-only, Method icon+text and Catppuccin at 100% are defaults',()=>{
 const d=normalizePreferences({});
 assert.equal(d.sourceConfig.showIcon,false);assert.equal(d.sourceConfig.showLabel,true);
 assert.equal(d.methodConfig.showIcon,true);assert.equal(d.methodConfig.showLabel,true);
 assert.equal(d.layoutVariant,'bare');assert.equal(d.palettePreset,'catppuccin');
 assert.equal(d.textSize,100);assert.equal(d.iconSize,100);
});
test('icons are sparse overrides, reset icon restores the category-specific default',()=>{
 const base=defaultsFor('source');
 const changed=readPart({icons:{credential:'key',host:'none'}},'source');
 assert.equal(iconFor(base,'source','credential'),defaultIcon('source','credential'));
 assert.equal(isIconModified(changed,'source','credential'),true);
 assert.equal(isIconModified(changed,'source','host'),true);
 const reset=resetIcon(changed,'credential');
 assert.equal(iconFor(reset,'source','credential'),defaultIcon('source','credential'));
 assert.equal(iconFor(reset,'source','host'),'none');
 assert.equal(isIconModified(reset,'source','credential'),false);
 assert.equal(changed.icons.credential,'key','reset does not mutate original');
});
test('colors are sparse overrides and reset follows selected palette',()=>{
 const changed=readPart({colors:{credential:'#123456',host:'#112233'}},'source');
 assert.equal(isColorModified(changed,'credential'),true);
 const reset=resetColor(changed,'credential');
 assert.equal(isColorModified(reset,'credential'),false);
 assert.equal(reset.colors.host,'#112233');
 assert.equal(effectiveColor('nord','source','credential',reset.colors.credential),PALETTES.nord.source.credential);
 assert.equal(effectiveColor('retro','source','credential',reset.colors.credential),PALETTES.retro.source.credential);
});
test('label changes never alter other labels and reset can be per-field',()=>{
 let part=defaultsFor('method');
 part=withUpdatedLabel(part,'method','key','MYKEY');
 part=withUpdatedLabel(part,'method','password','MYPASS');
 assert.equal(editableLabel(part,'method','key'),'MYKEY');
 assert.equal(editableLabel(part,'method','password'),'MYPASS');
 assert.equal(editableLabel(part,'method','agent'),'AGENT');
 const reset=withDefaultLabels(part,'method','key');
 assert.equal(editableLabel(reset,'method','key'),'KEY');
 assert.equal(editableLabel(reset,'method','password'),'MYPASS');
 assert.equal(hasModifiedLabels(reset,'method'),true);
 const all=withDefaultLabels(reset,'method');
 assert.equal(hasModifiedLabels(all,'method'),false);
 assert.equal(isLabelModified(all,'method','password'),false);
});
test('blank label is intentional and does not wipe any other category',()=>{
 const part=withUpdatedLabel(defaultsFor('source'),'source','host','');
 assert.equal(part.labels.host,'');
 assert.equal(editableLabel(part,'source','credential'),'CRED');
});
test('parsing rejects untrusted icons, styles, invalid colors and unsafe labels',()=>{
 const p=readPart({icons:{credential:'<script>',host:'key'},colors:{host:'url(foo)',plugin:'#ABCDEF'},labels:{host:'A'.repeat(90)+'\0'}},'source');
 assert.equal(iconFor(p,'source','credential'),defaultIcon('source','credential'));
 assert.equal(iconFor(p,'source','host'),'key');
 assert.equal(p.colors.host,undefined);
 assert.equal(p.colors.plugin,'#abcdef');
 assert.equal(p.labels.host.length,32);
 assert.equal(validHex('red'),'');
});
test('unrecognized or oversized config input falls back safely',()=>{
 const p=normalizePreferences({layoutVariant:'unsupported',palettePreset:'unsupported',iconSize:'big',textSize:9999,unknownField:1});
 assert.equal(p.layoutVariant,'bare');assert.equal(p.palettePreset,'catppuccin');
 assert.equal(p.iconSize,100);assert.equal(p.textSize,220);
 assert.ok(!Object.hasOwn(p,'unknownField'));
 assert.deepEqual(readPart('{'.repeat(17000),'source'),defaultsFor('source'));
});
test('serialization keeps only known current fields and inherited values are not mutated',()=>{
 const base=normalizePreferences({sourceConfig:serializePart(readPart({colors:{host:'#123456'}},'source'),'source')});
 const overridden=resolveForHost(base,{sourceOverride:JSON.stringify({labels:{host:'THEHOST'}}),compositionOverride:JSON.stringify({iconSize:145})});
 assert.equal(overridden.sourceConfig.colors.host,'#123456');
 assert.equal(overridden.sourceConfig.labels.host,'THEHOST');
 assert.equal(base.sourceConfig.labels.host,undefined);
 assert.equal(overridden.iconSize,145);
 assert.equal(base.iconSize,100);
 assert.deepEqual(Object.keys(readPart(JSON.stringify({unknownField:'pill'}),'source')).sort(),Object.keys(defaultsFor('source')).sort());
});
test('different host and folder overrides remain independent',()=>{
 const base=normalizePreferences({layoutVariant:'bare',palettePreset:'forest'});
 const inherited=resolveForHost(base,{sourceOverride:JSON.stringify({icons:{credential:'key'}})});
 assert.equal(inherited.layoutVariant,'bare');assert.equal(inherited.palettePreset,'forest');
 assert.equal(iconFor(inherited.sourceConfig,'source','credential'),'key');
 assert.equal(iconFor(inherited.methodConfig,'method','password'),defaultIcon('method','password'));
});
