import { SHORT_LABELS } from './design.ts';
import { iconFor,type PartAppearance,type PartKind } from './appearance.ts';
import type { IconName } from './icons.ts';
import type { AuthInfo,Source,Method } from './classify.ts';
import type { DisplayPreferences } from './preferences.ts';
export type Translator=(key:string)=>string;
export interface PartDisplay {value:string;icon:IconName;text:string;color:string;}
export function displayPart(kind:PartKind,value:Source|Method,config:PartAppearance):PartDisplay|null {
  if(!config.enabled)return null;
  const text=config.labels[value]??SHORT_LABELS[kind][value]??'?';
  const icon=config.showIcon?iconFor(config,kind,value):'none';
  if(icon==='none'&&(!config.showLabel||!text))return null;
  return {value,icon,text:config.showLabel?text:'',color:config.colors[value]??''};
}
export function badgeLabels(info:AuthInfo,prefs:DisplayPreferences){
  if(!prefs.enabled||info.reason==='non-ssh-host')return null;
  const source=displayPart('source',info.source,prefs.sourceConfig);
  const method=displayPart('method',info.method,prefs.methodConfig);
  if(!source&&!method)return null;
  return {source,method};
}

/** Host list badge texts. The shell draws text only, so a part shows when it is enabled and its Text toggle is on. */
export function listBadgeTexts(info:AuthInfo,prefs:DisplayPreferences){
  if(!prefs.enabled||info.reason==='non-ssh-host')return [];
  const out:{kind:PartKind;value:string;text:string}[]=[];
  for(const [kind,value,config] of [['source',info.source,prefs.sourceConfig],['method',info.method,prefs.methodConfig]] as const){
    if(!config.enabled||!config.showLabel)continue;
    const text=config.labels[value]??SHORT_LABELS[kind][value]??'?';
    if(text)out.push({kind,value,text});
  }
  return out;
}
