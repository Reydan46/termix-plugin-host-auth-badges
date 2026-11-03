import type { Method, Source } from "./classify.ts";

import { isIconName, type IconName } from "./icons.ts";
export type { IconName } from "./icons.ts";
export type PartKind = "source" | "method";
export const SOURCE_VALUES: readonly Source[] = ["credential", "host", "plugin", "unknown"];
export const METHOD_VALUES: readonly Method[] = ["password", "key", "both", "agent", "none", "custom", "unknown"];

/** `colors` contains only manually overridden colors; an absent key uses the selected palette.
 * `icons` likewise contains only overrides. An explicit `none` hides the icon for that category.
 * Blank labels are intentional and must not affect any other category.
 */
export interface PartAppearance {
  enabled: boolean;
  showIcon: boolean;
  showLabel: boolean;
  icons: Record<string, IconName>;
  labels: Record<string, string>;
  colors: Record<string, string>;
}
const SOURCE_ICONS: Record<Source, IconName> = {
  credential: "user-round", host: "monitor-cog", plugin: "plug-zap", unknown: "circle-help",
};
const METHOD_ICONS: Record<Method, IconName> = {
  password: "lock-keyhole", key: "key-round", both: "shield-check", agent: "user-cog",
  none: "ban", custom: "fingerprint", unknown: "circle-help",
};
export function defaultIcon(kind: PartKind, key: string): IconName {
  return kind === "source" ? (SOURCE_ICONS[key as Source] ?? "circle-help") : (METHOD_ICONS[key as Method] ?? "circle-help");
}
export function iconFor(config: PartAppearance, kind: PartKind, key: string): IconName {
  return config.icons[key] ?? defaultIcon(kind,key);
}
export function defaultsFor(kind: PartKind): PartAppearance {
  return {enabled:true,showIcon:kind === "method",showLabel:true,icons:{},labels:{},colors:{}};
}
export function validHex(value: unknown): string {
  return typeof value === "string" && /^#[\da-fA-F]{6}$/.test(value.trim()) ? value.trim().toLowerCase() : "";
}
function record(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
}
export function parseRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    if (raw.length > 16000) return {};
    try { return record(JSON.parse(raw)); } catch { return {}; }
  }
  return record(raw);
}
/** Parse a JSON object setting; invalid or oversized input yields an empty record. */
export function readPart(raw: unknown, kind: PartKind, fallback: PartAppearance = defaultsFor(kind)): PartAppearance {
  const input=parseRecord(raw);
  const keys=kind==="source"?SOURCE_VALUES:METHOD_VALUES;
  const rawIcons=record(input.icons), rawLabels=record(input.labels), rawColors=record(input.colors);
  const icons:Record<string,IconName>={...fallback.icons};
  const labels:Record<string,string>={...fallback.labels};
  const colors:Record<string,string>={...fallback.colors};
  for(const key of keys){
    if(typeof rawIcons[key]==="string" && isIconName(rawIcons[key])) icons[key]=rawIcons[key];
    if(typeof rawLabels[key]==="string") labels[key]=rawLabels[key].slice(0,32).replace(/[\x00-\x1f\x7f]/g,'');
    if(Object.hasOwn(rawColors,key)){
      const color=validHex(rawColors[key]);
      if(color) colors[key]=color;
      else delete colors[key];
    }
  }
  return {
    enabled:typeof input.enabled==="boolean"?input.enabled:fallback.enabled,
    showIcon:typeof input.showIcon==="boolean"?input.showIcon:fallback.showIcon,
    showLabel:typeof input.showLabel==="boolean"?input.showLabel:fallback.showLabel,
    icons,labels,colors,
  };
}
export function serializePart(input: unknown, kind: PartKind): string {
  return JSON.stringify(readPart(input,kind));
}
export function resolvePart(kind:PartKind,userValue:unknown,hostValue:unknown):PartAppearance {
  const user=readPart(userValue,kind);
  return hostValue == null || hostValue==="" ? user : readPart(hostValue,kind,user);
}
export function isIconModified(config:PartAppearance,kind:PartKind,key:string):boolean {
  return iconFor(config,kind,key)!==defaultIcon(kind,key);
}
export function resetIcon(config:PartAppearance,key:string):PartAppearance {
  const icons={...config.icons};delete icons[key];return {...config,icons};
}
export function isColorModified(config:PartAppearance,key:string):boolean {
  return Object.hasOwn(config.colors,key);
}
export function resetColor(config:PartAppearance,key:string):PartAppearance {
  const colors={...config.colors};delete colors[key];return {...config,colors};
}
