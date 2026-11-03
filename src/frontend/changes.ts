import type { DisplayPreferences } from './preferences.ts';
import type { PartAppearance } from './appearance.ts';
export type AppearanceChange = Readonly<{path:string;before:string;after:string}>;
const display=(value:unknown):string=>{
  if(typeof value==='boolean')return value?'on':'off';
  if(typeof value==='number')return String(value);
  if(typeof value==='string')return value.slice(0,44);
  return value==null?'-':'changed';
};
export function diffAppearance(saved:DisplayPreferences,draft:DisplayPreferences):AppearanceChange[]{
  const changes:AppearanceChange[]=[];
  const add=(path:string,a:unknown,b:unknown)=>{if(a!==b)changes.push({path,before:display(a),after:display(b)});};
  for(const key of ['enabled','position','layoutVariant','palettePreset','textSize','iconSize'] as const)
    add(key,saved[key],draft[key]);
  for(const kind of ['sourceConfig','methodConfig'] as const){
    const before:PartAppearance=saved[kind],after:PartAppearance=draft[kind];
    for(const key of ['enabled','showIcon','showLabel'] as const)add(`${kind}.${key}`,before[key],after[key]);
    for(const recordKey of ['icons','labels','colors'] as const){
      const keys=new Set([...Object.keys(before[recordKey]),...Object.keys(after[recordKey])]);
      for(const key of [...keys].sort())add(`${kind}.${recordKey}.${key}`,before[recordKey][key],after[recordKey][key]);
    }
  }
  return changes;
}
