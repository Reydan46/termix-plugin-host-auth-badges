import test from 'node:test';
import assert from 'node:assert/strict';
import {diffAppearance} from '../src/frontend/changes.ts';
import {normalizePreferences} from '../src/frontend/preferences.ts';
import {defaultsFor,serializePart} from '../src/frontend/appearance.ts';

const kv=(changes,path)=>changes.find(change=>change.path===path);

test('saved vs temporary draft reports old and new values for every visible setting',()=>{
 const saved=normalizePreferences({});
 const draft=normalizePreferences({layoutVariant:'joined-flat',palettePreset:'forest',textSize:105,iconSize:115,enabled:false});
 const changes=diffAppearance(saved,draft);
 assert.deepEqual(kv(changes,'layoutVariant'),{path:'layoutVariant',before:'bare',after:'joined-flat'});
 assert.deepEqual(kv(changes,'palettePreset'),{path:'palettePreset',before:'catppuccin',after:'forest'});
 assert.deepEqual(kv(changes,'textSize'),{path:'textSize',before:'100',after:'105'});
 assert.deepEqual(kv(changes,'iconSize'),{path:'iconSize',before:'100',after:'115'});
 assert.deepEqual(kv(changes,'enabled'),{path:'enabled',before:'on',after:'off'});
});

test('nested Source/Method icon, label, and custom color edits are diffed independently',()=>{
 const saved=normalizePreferences({});
 const from=defaultsFor('source');
 from.showIcon=true;from.labels.credential='My name';from.colors.host='#123456';
 const to=defaultsFor('method');
 to.icons.key='fingerprint';to.colors.password='#654321';
 const draft=normalizePreferences({sourceConfig:serializePart(from,'source'),methodConfig:serializePart(to,'method')});
 const changes=diffAppearance(saved,draft);
 assert.deepEqual(kv(changes,'sourceConfig.showIcon'),{path:'sourceConfig.showIcon',before:'off',after:'on'});
 assert.deepEqual(kv(changes,'sourceConfig.labels.credential'),{path:'sourceConfig.labels.credential',before:'-',after:'My name'});
 assert.equal(kv(changes,'sourceConfig.colors.host').after,'#123456');
 assert.equal(kv(changes,'methodConfig.icons.key').after,'fingerprint');
 assert.equal(kv(changes,'methodConfig.colors.password').after,'#654321');
 assert.equal(diffAppearance(saved,saved).length,0);
});

test('tooltip values are truncated and never contain credentials or SSH secrets',()=>{
 const saved=normalizePreferences({});
 const source=defaultsFor('source');
 source.labels.credential='<img onerror=alert(1)>this label is intentionally longer than the tooltip field';
 const draft=normalizePreferences({sourceConfig:serializePart(source,'source')});
 const changed=kv(diffAppearance(saved,draft),'sourceConfig.labels.credential');
 assert.ok(changed);
 assert.ok(changed.after.length<=44);
 assert.ok(!JSON.stringify(changed).includes('privateKey'));
});
