import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizedPalette } from '../src/frontend/design.ts';
import { normalizePreferences, resolveForHost } from '../src/frontend/preferences.ts';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url),'utf8');
const manifest = JSON.parse(read('manifest.json'));

test('Catppuccin is the default on every factory path', () => {
 assert.equal(manifest.contributes.settings.user.find(f=>f.key==='palettePreset').default, 'catppuccin');
 assert.equal(normalizedPalette(undefined),'catppuccin');
 assert.equal(normalizedPalette('unknown'),'catppuccin');
 assert.equal(normalizePreferences({}).palettePreset,'catppuccin');
 assert.equal(resolveForHost(normalizePreferences({}),{}).palettePreset,'catppuccin');
 assert.equal(resolveForHost(normalizePreferences({}),{compositionOverride:'{}'}).palettePreset,'catppuccin');
 assert.match(read('src/frontend/designer.tsx'),/\['palettePreset','catppuccin'\]/);
 assert.equal(normalizePreferences({palettePreset:'gruvbox'}).palettePreset,'gruvbox', 'a saved choice must survive changing the default');
});
