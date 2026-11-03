import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreferenceStore, mergeDraftValues, normalizePreferences, resolveForHost } from '../src/frontend/preferences.ts';

test('host badges read draft instantly, saved settings remain separate until native Save',()=>{
 const store=createPreferenceStore();
 const initial=normalizePreferences({layoutVariant:'bare',palettePreset:'signature'});
 store.setSaved(initial);
 const before=store.getSnapshot();
 let updates=0;
 const unsubscribe=store.subscribe(()=>updates++);
 const draft=normalizePreferences({layoutVariant:'joined-flat',palettePreset:'ocean'});
 store.setDraft(draft);
 assert.equal(store.get().layoutVariant,'joined-flat');
 assert.equal(store.get().palettePreset,'ocean');
 assert.equal(store.getSnapshot().dirty,true);
 assert.equal(store.getSnapshot().preferences,store.get());
 assert.equal(resolveForHost(store.get(), {}).layoutVariant,'joined-flat');
 assert.ok(updates>=1);
 store.clearDraft();
 assert.equal(store.getSnapshot().dirty,false);
 assert.equal(store.get().layoutVariant,'bare');
 assert.equal(store.get().palettePreset,'signature');
 assert.equal(store.getSnapshot().preferences.layoutVariant,before.preferences.layoutVariant);
 unsubscribe();
});

test('native save notification confirms current draft and removes dirty flag without flicker',()=>{
 const store=createPreferenceStore();
 const draft=normalizePreferences({palettePreset:'forest',textSize:125});
 store.setDraft(draft);
 const snapshot=store.getSnapshot();
 store.setSaved(normalizePreferences({palettePreset:'forest',textSize:125}));
 assert.equal(store.getSnapshot().dirty,false);
 assert.equal(store.get().palettePreset,'forest');
 assert.equal(store.get().textSize,125);
 assert.notEqual(store.getSnapshot(),snapshot);
 // Redundant saved notification is safe (useSyncExternalStore snapshot remains stable).
 const settled=store.getSnapshot();
 store.setSaved(normalizePreferences({palettePreset:'forest',textSize:125}));
 assert.equal(store.getSnapshot(),settled);
});

test('older saved version cannot override an actively edited draft',()=>{
 const store=createPreferenceStore();
 store.setSaved(normalizePreferences({textSize:100}));
 store.setDraft(normalizePreferences({textSize:145}));
 store.setSaved(normalizePreferences({textSize:120}));
 assert.equal(store.get().textSize,145);
 assert.equal(store.getSnapshot().dirty,true);
 store.clearDraft();
 assert.equal(store.get().textSize,120);
});

test('snapshot.saved follows a newer saved value while a draft is active',()=>{
 const store=createPreferenceStore();
 store.setSaved(normalizePreferences({textSize:100}));
 store.setDraft(normalizePreferences({textSize:145}));
 const before=store.getSnapshot();
 store.setSaved(normalizePreferences({textSize:120}));
 const after=store.getSnapshot();
 assert.notEqual(after,before);
 assert.equal(after.saved.textSize,120);
 assert.equal(after.preferences.textSize,145);
});

test('editing back to saved values clears the unsaved reminder',()=>{
 const store=createPreferenceStore();
 store.setSaved(normalizePreferences({iconSize:100}));
 store.setDraft(normalizePreferences({iconSize:150}));
 assert.equal(store.getSnapshot().dirty,true);
 store.setDraft(normalizePreferences({iconSize:100}));
 assert.equal(store.getSnapshot().dirty,false);
 assert.equal(store.get().iconSize,100);
});

test('rapid multi-field changes are merged before normalization',()=>{
 let values={layoutVariant:'joined',textSize:180,palettePreset:'retro'};
 values=mergeDraftValues(values,'layoutVariant','joined-flat');
 values=mergeDraftValues(values,'textSize',125);
 assert.equal(normalizePreferences(values).layoutVariant,'joined-flat');
 assert.equal(normalizePreferences(values).textSize,125);
 for(const [key,value] of Object.entries({layoutVariant:'bare',textSize:100,palettePreset:'gruvbox'}))
  values=mergeDraftValues(values,key,value);
 assert.equal(normalizePreferences(values).layoutVariant,'bare');
 assert.equal(normalizePreferences(values).textSize,100);
});

test('inherited host/folder settings continue to override global local drafts',()=>{
 const store=createPreferenceStore();
 store.setDraft(normalizePreferences({layoutVariant:'bare',palettePreset:'forest'}));
 const ownHost={compositionOverride:JSON.stringify({layoutVariant:'joined',palettePreset:'ocean'})};
 assert.equal(resolveForHost(store.get(),ownHost).palettePreset,'ocean');
 assert.equal(resolveForHost(store.get(),{}).palettePreset,'forest');
 store.clearDraft();
 assert.equal(resolveForHost(store.get(),{}).palettePreset,'catppuccin');
});
