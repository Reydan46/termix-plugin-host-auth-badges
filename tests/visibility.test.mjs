import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(`../src/frontend/${name}`,import.meta.url),'utf8');

test('viewport gating uses one shared observer, not one observer per host badge',()=>{
 const source=read('visibility.ts');
 assert.match(source,/let sharedObserver: IntersectionObserver \| null = null/);
 assert.equal((source.match(/new IntersectionObserver\(/g)||[]).length,1);
 assert.match(source,/const observed = new Map/);
 assert.match(source,/sharedObserver\?\.unobserve\(element\)/);
 assert.match(source,/if\(observed\.size===0\)/);
 assert.match(source,/rootMargin:'160px 0px'/);
});
test('offscreen subscriptions to our stores stop and resume on reentry',()=>{
 const source=read('visibility.ts');
 const frontend=read('index.tsx');
 assert.match(source,/near\?store\.subscribe\(listener\):\(\)=>\{\}/);
 assert.match(source,/if\(near\)last\.current=store\.get\(\)/);
 assert.match(frontend,/useVisibleSnapshot\(credentials,needsCredentials\)/);
 assert.match(frontend,/useVisibleSnapshot\(preferences,near\)/);
 assert.match(frontend,/badgeRef=\{badgeRef\}/);
});
test('credential index retains authType only, not names or secrets',()=>{
 const classifier=read('classify.ts');
 assert.match(classifier,/\{ authType: item\.authType \}/);
 assert.doesNotMatch(classifier,/name: item\.name|password: item\.password|privateKey: item\.privateKey/);
});

test('unmounting a hidden/disabled badge re-enables appearance subscription for future enable changes',()=>{
 const visibility=read('visibility.ts');
 assert.match(visibility,/if\(!element\)setNear\(true\)/);
 const frontend=read('index.tsx');
 assert.match(frontend,/const needsCredentials = near && effective.enabled;/);
 assert.match(frontend,/useVisibleSnapshot\(credentials,needsCredentials\)/);
 assert.match(frontend,/useVisibleSnapshot\(preferences,near\)/);
});
