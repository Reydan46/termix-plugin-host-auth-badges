import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ICON_CATALOG, ICON_GROUPS, getIcon, isIconName, searchIcons } from '../src/frontend/icons.ts';
import { defaultsFor, readPart, defaultIcon, SOURCE_VALUES, METHOD_VALUES } from '../src/frontend/appearance.ts';

const path = url => new URL(url, import.meta.url);
test('a single catalog provides more than 100 searchable icons, grouped for the picker', () => {
 assert.ok(ICON_CATALOG.length >= 100);
 assert.ok(isIconName('none'));
 assert.equal(new Set(ICON_CATALOG.map(icon=>icon.id)).size, ICON_CATALOG.length);
 assert.deepEqual(new Set(ICON_CATALOG.map(icon=>icon.group)), new Set(ICON_GROUPS));
 for (const icon of ICON_CATALOG) {
  assert.equal(getIcon(icon.id),icon);
  assert.ok(isIconName(icon.id));
  assert.match(icon.lucide,/^[A-Z][A-Za-z0-9]*$/);
 }
 assert.equal(getIcon('none'),undefined);
 assert.equal(isIconName('arbitrary-icon-not-listed'),false);
});
test('default, saved and catalog icons resolve from that same catalog', () => {
 for (const [kind, keys] of [['source',SOURCE_VALUES],['method',METHOD_VALUES]]) {
  for (const key of keys) assert.ok(getIcon(defaultIcon(kind,key)));
  const input=readPart({icons:{[keys[0]]:'vault'}},kind);
  assert.equal(input.icons[keys[0]],'vault');
  assert.equal(readPart({icons:{[keys[0]]:'invalid-example'}},kind).icons[keys[0]],undefined);
 }
 assert.ok(getIcon('fingerprint-pattern'));
});
test('icon search uses ID, group, Lucide name and synonyms', () => {
 assert.ok(searchIcons('backup').some(icon=>icon.id==='database-backup'));
 assert.ok(searchIcons('security').some(icon=>icon.id==='key-round'));
 assert.ok(searchIcons('usb').some(icon=>icon.id==='usb'));
 assert.ok(searchIcons('ShieldCheck').some(icon=>icon.id==='shield-check'));
 assert.equal(searchIcons('notarealquerylikethis').length,0);
});
test('renderer and editor import only the one shared icon registry', () => {
 const view=readFileSync(path('../src/frontend/view.tsx'),'utf8');
 const editor=readFileSync(path('../src/frontend/designer.tsx'),'utf8');
 const registry=readFileSync(path('../src/frontend/icons.ts'),'utf8');
 assert.match(view,/getIcon/);
 assert.match(view,/PluginIcon/);
 assert.doesNotMatch(view,/from ["']lucide-react["']/);
 assert.match(editor,/searchIcons/);
 assert.doesNotMatch(editor,/const ICONS\s*=/);
 assert.match(registry,/ICON_CATALOG/);
});
