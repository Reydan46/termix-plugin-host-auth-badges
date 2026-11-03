import { normalizedLayout, normalizedPalette, type LayoutVariant, type PalettePreset } from "./design.ts";
import { parseRecord, readPart, resolvePart, type PartAppearance } from "./appearance.ts";

type Position = "after" | "before";
export interface DisplayPreferences {
  enabled: boolean;
  position: Position;
  textSize: number;
  iconSize: number;
  layoutVariant: LayoutVariant;
  palettePreset: PalettePreset;
  sourceConfig: PartAppearance;
  methodConfig: PartAppearance;
}
const bound = (value:unknown,min:number,max:number,fallback:number):number =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max,Math.max(min,Math.round(value))) : fallback;
export function normalizePreferences(values:Record<string,unknown>):DisplayPreferences {
  return {
    enabled:values.enabled!==false,
    position:values.position==="before"?"before":"after",
    textSize:bound(values.textSize,60,220,100),
    iconSize:bound(values.iconSize,60,260,100),
    layoutVariant:normalizedLayout(values.layoutVariant),
    palettePreset:normalizedPalette(values.palettePreset),
    sourceConfig:resolvePart("source",values.sourceConfig,undefined),
    methodConfig:resolvePart("method",values.methodConfig,undefined),
  };
}
/** Detect when SOURCE is hidden and METHOD shows only an icon.
 * Warn without silently altering valid user choices. */
export function isMethodIconOnly(prefs:DisplayPreferences):boolean {
  const source=prefs.sourceConfig,method=prefs.methodConfig;
  return (!source.enabled || (!source.showIcon && !source.showLabel))
    && method.enabled && method.showIcon && !method.showLabel;
}
export function mergeDraftValues(values:Record<string,unknown>,key:string,value:unknown):Record<string,unknown> {
  return {...values,[key]:value};
}
/** Native Termix Save persists; this store only previews unsaved user appearance changes. */
export function createPreferenceStore(){
  let saved:DisplayPreferences=normalizePreferences({});
  let draft:DisplayPreferences|null=null;
  let snapshot:Readonly<{preferences:DisplayPreferences;saved:DisplayPreferences;dirty:boolean}>={preferences:saved,saved,dirty:false};
  const listeners=new Set<()=>void>();
  const equal=(a:DisplayPreferences,b:DisplayPreferences)=>JSON.stringify(a)===JSON.stringify(b);
  const publish=()=>{
    const preferences=draft??saved,dirty=draft!==null;
    if(snapshot.dirty===dirty&&equal(snapshot.preferences,preferences)&&equal(snapshot.saved,saved))return;
    snapshot={preferences,saved,dirty};
    for(const listener of listeners)listener();
  };
  return {
    get:()=>snapshot.preferences,getSnapshot:()=>snapshot,
    subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
    setSaved(next:DisplayPreferences){saved=next;if(draft!==null&&equal(draft,saved))draft=null;publish();},
    setDraft(next:DisplayPreferences){draft=equal(next,saved)?null:next;publish();},
    clearDraft(){draft=null;publish();},
  };
}
/** Termix resolves Host/Folder/User/Server defaults for each declared host setting. */
export function resolveForHost(base:DisplayPreferences,pluginSettings:unknown):DisplayPreferences {
  if(!pluginSettings||typeof pluginSettings!=="object")return base;
  const input=pluginSettings as Record<string,unknown>;
  const hasSource=input.sourceOverride!==null && input.sourceOverride!==undefined && input.sourceOverride!=="";
  const hasMethod=input.methodOverride!==null && input.methodOverride!==undefined && input.methodOverride!=="";
  const hasComposition=typeof input.compositionOverride==="string" && input.compositionOverride.length>0;
  // Most hosts inherit global defaults. Reuse those exact objects instead of
  // parsing/cloning both part configs on every host-row render.
  if(!hasComposition&&!hasSource&&!hasMethod)return base;
  const composition=hasComposition?parseRecord(input.compositionOverride):{};
  return {
    ...base,
    enabled:typeof composition.enabled==="boolean"?composition.enabled:base.enabled,
    position:composition.position==="before"?"before":composition.position==="after"?"after":base.position,
    textSize:bound(composition.textSize,60,220,base.textSize),
    iconSize:bound(composition.iconSize,60,260,base.iconSize),
    layoutVariant:composition.layoutVariant===undefined?base.layoutVariant:normalizedLayout(composition.layoutVariant),
    palettePreset:composition.palettePreset===undefined?base.palettePreset:normalizedPalette(composition.palettePreset),
    sourceConfig:hasSource?readPart(input.sourceOverride,"source",base.sourceConfig):base.sourceConfig,
    methodConfig:hasMethod?readPart(input.methodOverride,"method",base.methodConfig):base.methodConfig,
  };
}
