import test from 'node:test';import assert from 'node:assert/strict';
import {normalizePreferences,resolveForHost} from '../src/frontend/preferences.ts';
import {badgeLabels,displayPart} from '../src/frontend/presentation.ts';
import {defaultsFor,readPart,serializePart} from '../src/frontend/appearance.ts';
const info={source:'credential',method:'key',uncertain:false,reason:'saved-credential'};
test('source and method render independently',()=>{
 const prefs=normalizePreferences({});
 const content=badgeLabels(info,prefs);
 assert.equal(content.source.text,'CRED');assert.equal(content.source.icon,'none');
 assert.equal(content.method.text,'KEY');assert.equal(content.method.icon,'key-round');
});
test('one changed label never clears the others',()=>{
 const p=normalizePreferences({sourceConfig:serializePart({...defaultsFor('source'),labels:{credential:'LOGIN'}},'source')});
 assert.equal(badgeLabels(info,p).source.text,'LOGIN');
 assert.equal(displayPart('source','host',p.sourceConfig).text,'HOST');
});
test('empty labels are permitted, and icons-only is readable',()=>{
 const part={...defaultsFor('method'),showIcon:true,showLabel:false};
 const display=displayPart('method','key',part);
 assert.equal(display.text,'');assert.equal(display.icon,'key-round');
 const hidden={...part,showIcon:false};assert.equal(displayPart('method','key',hidden),null);
});
test('non-SSH host suppresses badge; unknown categories still display',()=>{
 const p=normalizePreferences({});
 assert.equal(badgeLabels({...info,reason:'non-ssh-host'},p),null);
 assert.ok(badgeLabels({...info,source:'unknown',method:'unknown'},p));
});
test('host overrides apply composition + source + method without changing user defaults',()=>{
 const base=normalizePreferences({});
 const prefs=resolveForHost(base,{compositionOverride:JSON.stringify({layoutVariant:'joined',textSize:115}),sourceOverride:JSON.stringify({showIcon:true}),methodOverride:JSON.stringify({labels:{key:'SSH_KEY'}})});
 assert.equal(prefs.layoutVariant,'joined');assert.equal(prefs.textSize,115);
 assert.equal(prefs.sourceConfig.showIcon,true);assert.equal(prefs.methodConfig.labels.key,'SSH_KEY');
 assert.equal(base.sourceConfig.showIcon,false);
});
test('malformed or oversized JSON does not crash the app',()=>{
 const p=readPart('{broken','source');assert.deepEqual(p,defaultsFor('source'));
 const q=readPart('['.repeat(17000),'method');assert.deepEqual(q,defaultsFor('method'));
});
