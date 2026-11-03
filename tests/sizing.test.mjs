import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { badgePixels, compactBadgePixels, MAX_ROW_TEXT_PX, MAX_ROW_ICON_PX, BASE_TEXT_PX, BASE_ICON_PX } from '../src/frontend/badgeSizing.ts';
import { normalizePreferences, resolveForHost } from '../src/frontend/preferences.ts';

const file = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('100% renders smaller defaults', () => {
 assert.equal(BASE_TEXT_PX, 9.5);
 assert.equal(BASE_ICON_PX, 12.67875);
 assert.deepEqual(badgePixels(100, 100), { textPx: 9.5, iconPx: 12.68 });
});

test('text slider changes text only, not icon size', () => {
 assert.deepEqual(badgePixels(60, 100), { textPx: 5.7, iconPx: 12.68 });
 assert.deepEqual(badgePixels(200, 100), { textPx: 19, iconPx: 12.68 });
});

test('icon slider changes icon only, not text size', () => {
 assert.deepEqual(badgePixels(100, 60), { textPx: 9.5, iconPx: 7.61 });
 assert.deepEqual(badgePixels(100, 200), { textPx: 9.5, iconPx: 25.36 });
});

test('host overrides only active independent text/icon size settings',()=>{
 const base=normalizePreferences({});
 const changed=resolveForHost(base,{compositionOverride:JSON.stringify({textSize:90,iconSize:150})});
 assert.equal(changed.textSize,90);assert.equal(changed.iconSize,150);
});

test('each text slider writes once; no stale second size update', () => {
 const designer=file('src/frontend/designer.tsx');
 assert.match(designer,/onChange=\{value=>set\('textSize',value\)\}/);
 assert.match(designer,/const set=\(key:string,value:unknown\)=>onChange\(\[\[key,value\]\]\)/);
});

test('both real host badges and preview use the same pixel sizing', () => {
 const view=file('src/frontend/view.tsx');
 const css=file('src/frontend/badge.css');
 assert.match(view,/compactBadgePixels\(preferences\.textSize, preferences\.iconSize\)/);
 assert.match(view,/fontSize: `\$\{pixels.textPx\}px`/);
 assert.equal((view.match(/const pixels = compactBadgePixels\(/g)||[]).length,1);
 assert.match(view,/"--ha-icon-px": `\$\{pixels.iconPx\}px`/);
 assert.match(css,/width: var\(--ha-icon-px, 12.68px\)/);
 assert.doesNotMatch(css,/font-size: calc\(11px \* var\(--ha-text-scale/);
});

test('large user scales and current sizes never exceed row rendering ceiling',()=>{
 for(const text of [60,100,175,220])for(const icon of [60,100,175,260]){
  const pixels=compactBadgePixels(text,icon);
  assert.ok(pixels.textPx<=MAX_ROW_TEXT_PX+0.01,`text ${text}/${icon}`);
  assert.ok(pixels.iconPx<=MAX_ROW_ICON_PX+0.01,`icon ${text}/${icon}`);
 }
});
test('clamping one oversized dimension never changes the other setting',()=>{
 const base=compactBadgePixels(100,100);
 const raisedIcon=compactBadgePixels(100,260);
 assert.equal(raisedIcon.textPx,base.textPx);
 assert.equal(raisedIcon.iconPx,MAX_ROW_ICON_PX);
 const raisedText=compactBadgePixels(220,100);
 assert.equal(raisedText.iconPx,base.iconPx);
 assert.equal(raisedText.textPx,MAX_ROW_TEXT_PX);
});
test('host badge layout width does not cause row height growth',()=>{
 const css=file('src/frontend/badge.css');
 assert.match(css,/\[data-host-auth-badge\] \{[^}]*height: 18px; max-height: 18px/);
 assert.match(css,/\[data-host-auth-badge\] \.ha-composition \{[^}]*height: 18px/);
 assert.match(css,/\[data-host-auth-badge\] \.ha-part \{[^}]*height:16px; min-height:16px; max-height:16px/);
});

test('source and method are forced into the same fixed-height box even with different icons or backgrounds',()=>{
 const css=file('src/frontend/badge.css');
 assert.match(css,/\[data-host-auth-badge\] \.ha-item \{[^}]*height:16px; min-height:16px; max-height:16px/);
 assert.match(css,/\[data-host-auth-badge\] \.ha-part \{[^}]*height:16px; min-height:16px; max-height:16px/);
});
