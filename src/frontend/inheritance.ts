/** Native form-field clearing, not a second inheritance engine.
 * The SettingsComponentProps API gives only effective values and setValue,
 * without host/folder identity, provenance or a dedicated inherit action.
 * Passing null requests removal of the current form-level value. Native Save
 * remains responsible for persistence and recomputation at parent levels.
 */
export const HOST_GROUP_KEYS = ['compositionOverride', 'sourceOverride', 'methodOverride'] as const;
export type HostGroupKey = (typeof HOST_GROUP_KEYS)[number];
export const GROUP_LABEL_KEYS: Readonly<Record<HostGroupKey,string>> = {
  compositionOverride:'ui.inheritComposition',
  sourceOverride:'ui.inheritSource',
  methodOverride:'ui.inheritMethod',
};
/** Never assert that a non-empty effective value is a locally stored override.
 * An inherited folder field can also be non-empty in the custom editor.
 */
export function hostFieldPresence(values: Record<string,unknown>, key: HostGroupKey):'empty'|'effective' {
  const value=values[key];
  return value===null || value===undefined || value===''?'empty':'effective';
}
/** Build one immutable pending form-state update for one or all groups. */
export function clearHostGroups(values:Record<string,unknown>,keys:readonly HostGroupKey[]=HOST_GROUP_KEYS):Record<string,unknown> {
  const next={...values};
  for(const key of keys)next[key]=null;
  return next;
}
export function inheritanceSummary(values:Record<string,unknown>):{key:HostGroupKey;present:boolean}[] {
  return HOST_GROUP_KEYS.map(key=>({key,present:hostFieldPresence(values,key)==='effective'}));
}
