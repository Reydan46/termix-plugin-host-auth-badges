import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAYOUT_VARIANTS} from '../src/frontend/design.ts';
const source=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const css=source('src/frontend/badge.css');
const preview=source('src/frontend/preview.tsx');
const designer=source('src/frontend/designer.tsx');
const view=source('src/frontend/view.tsx');
const index=source('src/frontend/index.tsx');
const visibility=source('src/frontend/visibility.ts');

test('every layout variant has a stylesheet rule and is rendered through data-ha-variant',()=>{
 assert.match(view,/data-ha-variant=\{preferences\.layoutVariant\}/);
 for(const variant of LAYOUT_VARIANTS)assert.ok(css.includes(`data-ha-variant="${variant}"`),`missing ${variant}`);
});

test('preview uses neutral synthetic hosts, ignores Enabled and shares the host-row renderer',()=>{
 assert.equal((preview.match(/name:'/g)||[]).length,9);
 assert.match(preview,/const demoPrefs = \{ \.\.\.preferences, enabled: true \}/);
 assert.match(preview,/<AuthBadgeView info=\{sample\.info\} preferences=\{demoPrefs\}/);
 assert.match(index,/<AuthBadgeView info=\{info\}/);
});

test('host and folder settings use one composition editor',()=>{
 assert.match(index,/registerSettingsComponent\("auth-badge-composition-override"/);
 assert.equal((index.match(/registerSettingsComponent\(/g)||[]).length,2);
 assert.match(designer,/const prefs=resolveForHost\(base,values\)/);
});

test('host composition merges rapid edits and keeps Source/Method overrides',()=>{
 assert.match(designer,/const pending=useRef<Record<string,unknown>>\(values\)/);
 assert.match(designer,/const composition=\{\.\.\.parseRecord\(/);
 assert.match(designer,/for\(const \[key,value\] of changes\) composition\[key\]=value/);
 assert.match(designer,/setValue\('compositionOverride',serialized\)/);
 assert.match(designer,/setValue\(key,pending\.current\[key\]\)/);
});

test('user edits reach host badges through an in-memory draft; the unsaved diff uses the saved baseline from the store',()=>{
 assert.match(index,/onLiveChange=\{preferences\.setDraft\}/);
 assert.match(index,/preferences\.setSaved\(normalizePreferences/);
 assert.match(index,/preferences\.clearDraft\(\)/);
 assert.match(index,/savedPreferences=\{previewState\.saved\}/);
 assert.match(designer,/diffAppearance\(savedPreferences,currentPreferences \?\? prefs\)/);
 assert.doesNotMatch(designer,/\.save\(|fetch\(|axios|document\.querySelector\(/);
});

test('icon dialog keeps its focus and Escape effect stable across parent renders',()=>{
 assert.match(designer,/const closeRef=useRef\(onClose\);\s+closeRef\.current=onClose;/);
 assert.match(designer,/closeRef\.current\(\)/);
 assert.match(designer,/grid\.scrollTop \+= activeBounds\.top/);
 assert.doesNotMatch(designer,/scrollIntoView/);
});

test('wheel pickers and size sliders use native non-passive handlers that stop page scrolling',()=>{
 assert.match(designer,/useWheelPicker\(LAYOUT_VARIANTS,prefs\.layoutVariant/);
 assert.match(designer,/useWheelPicker\(PALETTE_PRESETS,value/);
 assert.match(designer,/addEventListener\('wheel',wheel,\{passive:false\}\)/);
 assert.match(designer,/const result=stepRange\(/);
 assert.doesNotMatch(designer,/onWheel=\{/);
});

test('both text and icon size sliders feed the same bounded badge sizing',()=>{
 assert.match(designer,/onChange=\{value=>set\('textSize',value\)\}/);
 assert.match(designer,/onChange=\{value=>set\('iconSize',value\)\}/);
 assert.match(view,/compactBadgePixels\(preferences\.textSize, preferences\.iconSize\)/);
});

test('Monochrome overrides custom colors in the renderer',()=>{
 assert.match(view,/"--ha-text-color": accent/);
 assert.match(view,/"--ha-icon-color": accent/);
 assert.match(css,/data-ha-palette="monochrome"/);
});

test('multi-field edits are coalesced into a single redraw',()=>{
 assert.match(designer,/const putMany=\(changes:/);
 assert.match(designer,/onLiveChange\?\.\(normalizePreferences\(next\)\)/);
 assert.match(designer,/const resetAll=\(\)=>putMany\(\[/);
});

test('label editing preserves the whole part state',()=>{
 assert.match(designer,/const pendingPart=useRef\(config\)/);
 assert.match(designer,/withUpdatedLabel\(pendingPart\.current,kind,key,label\)/);
 assert.match(designer,/resetIcon\(pendingPart\.current,key\)/);
 assert.match(designer,/resetColor\(pendingPart\.current,key\)/);
});

test('viewport gating uses one shared IntersectionObserver and no DOM queries of Termix',()=>{
 assert.match(index,/useVisibleSnapshot\(preferences,near\)/);
 assert.match(index,/useVisibleSnapshot\(credentials,needsCredentials\)/);
 assert.match(visibility,/IntersectionObserver/);
 assert.match(visibility,/rootMargin:'160px 0px'/);
 assert.doesNotMatch(visibility,/document\.querySelector|localStorage|fetch\(/);
});

test('styles use theme tokens and no global Termix selectors',()=>{
 assert.match(css,/var\(--foreground/);
 assert.match(css,/var\(--background/);
 assert.doesNotMatch(css,/\.termix-host-row|\.host-list-row/);
});
