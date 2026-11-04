import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('../', import.meta.url);
const source = path => readFileSync(new URL(path, root),'utf8');
const json = path => JSON.parse(source(path));
const manifest = json('manifest.json');
const en = json('locales/en.json');
const ru = json('locales/translated/ru_RU.json');
const pick = (input,key) => key.split('.').reduce((node,part)=>node?.[part],input);

test('release metadata identifies actual intended maintainer, stable plugin ID and version',()=>{
 assert.equal(manifest.id,'host-auth-badges');
 assert.equal(manifest.version,'1.0.2');
 assert.equal(manifest.author?.name,'Reydan46');
 assert.equal(manifest.author?.url,'https://github.com/Reydan46');
 assert.equal(manifest.repository,'https://github.com/Reydan46/termix-plugin-host-auth-badges');
 assert.equal(manifest.docs,`${manifest.repository}/tree/main/docs`);
 assert.equal(manifest.license,'MIT');
 assert.equal(manifest.version,json('package.json').version);
});
test('grouped picker icons are localized in English and Russian',()=>{
 for(const group of ['identity','security','servers','network','devices','development','status']) {
  for(const translation of [en,ru]) assert.ok(pick(translation,`ui.iconGroups.${group}`)?.trim(),`missing iconGroups ${group}`);
 }
});
test('official shared CI, SDK Vitest adapter and release workflow are prepared',()=>{
 const ci=source('.github/workflows/ci.yml');
 const release=source('.github/workflows/release.yml');
 assert.match(ci,/Termix-SSH\/Termix-Registry\/\.github\/workflows\/plugin-ci\.yml@main/);
 assert.match(release,/Termix-SSH\/Termix-Registry\/\.github\/workflows\/plugin-release\.yml@main/);
 assert.match(release,/id-token:\s*write/);
 assert.match(release,/attestations:\s*write/);
 assert.match(release,/dry-run/);
 assert.match(source('vitest.config.ts'),/pluginVitestConfig\(import\.meta\.url\)/);
 const sdkBridge=source('tests/backend/node-regressions.test.ts');
 assert.match(sdkBridge,/from ['"]vitest['"]/);
 assert.match(sdkBridge,/--experimental-strip-types/);
 const pkg=json('package.json');
 assert.match(pkg.scripts['test:sdk'],/termix-plugin test/);
 assert.ok(pkg.devDependencies.vitest);
});
test('publishing guide covers the release checks and the unverified inheritance reset',()=>{
 const guide=source('docs/publishing.md');
 for(const term of ['package-lock.json','npm ci','npm run typecheck','npm run pack','setValue(field, null)','SHA-256'])
  assert.ok(guide.includes(term),`publish instructions should mention ${term}`);
 assert.ok(existsSync(new URL('LICENSE',root)));
});

test('branch policy: main is the only long-lived branch, dev-X.Y.Z is a temporary release branch',()=>{
 const ci=source('.github/workflows/ci.yml');
 assert.match(ci,/branches: \[main\]/);
 const docs=source('docs/publishing.md');
 assert.match(docs,/Default branch = main/);
 assert.match(source('CONTRIBUTING.md'),/`dev-1\.0\.0`/);
 assert.deepEqual(source('CHANGELOG.md').match(/^## \d+\.\d+\.\d+/gm),['## 1.0.2','## 1.0.1','## 1.0.0']);
});

test('both READMEs describe the same layouts, palettes, icons and settings',()=>{
 for(const file of ['README.md','README.ru.md']){
  const text=source(file);
  for(const count of ['12','18','104'])assert.ok(text.includes(count),`${file} ${count}`);
  for(const field of manifest.contributes.settings.user.filter(f=>f.type!=='custom'))assert.ok(text.includes(`\`${field.key}\``),`${file} ${field.key}`);
  for(const field of manifest.contributes.settings.host.fields)assert.ok(text.includes(`\`${field.key}\``),`${file} ${field.key}`);
 }
});
