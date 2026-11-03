import { useEffect, useLayoutEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useSettings, useTranslation, type SettingsComponentProps } from '@termix-ssh/plugin-sdk/frontend';
import {
  defaultsFor, iconFor, isIconModified, parseRecord, isColorModified, resetIcon, resetColor, METHOD_VALUES, serializePart, SOURCE_VALUES,
  type PartAppearance, type PartKind,
} from './appearance';
import {
  effectiveColor, LAYOUT_VARIANTS, PALETTE_PRESETS, PALETTES, editableLabel,
  hasModifiedLabels, isLabelModified, withDefaultLabels, withUpdatedLabel,
  type LayoutVariant, type PalettePreset,
} from './design';
import { BadgePreview, LayoutSample } from './preview';
import { BadgeIcon } from './view';
import { ICON_GROUPS, searchIcons, type IconDefinition, type IconName } from './icons.ts';
import { mergeDraftValues, normalizePreferences, resolveForHost, isMethodIconOnly, type DisplayPreferences } from './preferences';
import { INITIAL_WHEEL_STATE, wheelPixels, stepSelection, stepRange } from './wheel';
import { diffAppearance, type AppearanceChange } from './changes';
import {HOST_GROUP_KEYS, GROUP_LABEL_KEYS, inheritanceSummary, clearHostGroups, type HostGroupKey} from './inheritance';

const PART_FIELDS={source:'sourceConfig',method:'methodConfig'} as const;
const HOST_FIELDS={source:'sourceOverride',method:'methodOverride'} as const;

function Toggle({value,onChange,children,disabled=false,title}:{value:boolean;onChange:(v:boolean)=>void;children:ReactNode;disabled?:boolean;title?:string}){
  return <button type="button" className="ha-segment" aria-pressed={value} disabled={disabled} title={title} onClick={()=>onChange(!value)}>{children}</button>;
}
/** One non-passive listener on the rail: wheel over any child cycles once per notch.
 * Avoid child+parent event duplication and vertical scrolling that moves the settings page.
 */
function useWheelPicker<T extends string>(options: readonly T[], current: T, choose: (value:T)=>void, disabled=false) {
  const element = useRef<HTMLDivElement>(null);
  const latest = useRef({options,current,choose,disabled});
  latest.current = {options,current,choose,disabled};
  const state = useRef({...INITIAL_WHEEL_STATE});
  const virtualSelection = useRef(current);
  // Clicks/keyboard changes should also update the wheel's starting point.
  useEffect(()=>{virtualSelection.current=current;},[current]);
  useEffect(()=>{
    const root=element.current;
    if(!root)return;
    const wheel=(event:WheelEvent)=>{
      if(latest.current.disabled) return;
      const delta=wheelPixels(event.deltaX,event.deltaY,event.deltaMode,root.clientWidth);
      if(!delta)return;
      // React's delegated wheel listeners can be passive in modern Chromium.
      event.preventDefault();
      const result=stepSelection(latest.current.options,virtualSelection.current,delta,Date.now(),state.current);
      state.current=result.state;
      if(result.changed){
        virtualSelection.current=result.value;
        latest.current.choose(result.value);
      }
    };
    root.addEventListener('wheel',wheel,{passive:false});
    return ()=>root.removeEventListener('wheel',wheel);
  },[]);
  // Termix can mount a settings panel while its animation has width 0.
  // Measure again once the rail actually becomes visible. No page scrolling.
  useLayoutEffect(()=>{
    const root=element.current;
    if(!root)return;
    let frame=0;
    const centerSelected=()=>{
      if(root.clientWidth===0)return;
      const active=Array.from(root.querySelectorAll<HTMLElement>('[data-ha-picker-item]'))
        .find(item=>item.dataset.haPickerItem===current);
      if(!active)return;
      const railRect=root.getBoundingClientRect();
      const itemRect=active.getBoundingClientRect();
      // Client rects use one coordinate space even inside nested host/folder forms.
      root.scrollLeft += itemRect.left + itemRect.width/2 - railRect.left - railRect.width/2;
    };
    centerSelected();
    frame=requestAnimationFrame(centerSelected);
    const observer=typeof ResizeObserver !== 'undefined' ? new ResizeObserver(centerSelected) : null;
    observer?.observe(root);
    return()=>{cancelAnimationFrame(frame);observer?.disconnect();};
  },[current]);
  return element;
}
/** Both secondary panels share the same accessible collapsible control. */
function Disclosure({title,summary,open,onToggle,children}:{
  title:string;summary:string;open:boolean;onToggle:()=>void;children:ReactNode;
}){
  const contentId=useId();
  return <section className="ha-disclosure" aria-label={title}>
    <button type="button" className="ha-disclosure-toggle" aria-expanded={open}
      aria-controls={open?contentId:undefined} onClick={onToggle}>
      <strong className="ha-disclosure-title">{title}</strong>
      <span className="ha-disclosure-summary">{summary}</span>
      <span className="ha-disclosure-chevron" aria-hidden="true">▾</span>
    </button>
    {open && <div className="ha-disclosure-content" id={contentId}>{children}</div>}
  </section>;
}

/** One native non-passive wheel listener for label, slider and value.
 * Store the most recent wheel value synchronously to prevent lost fast notches.
 */
function SizeControl({label,value,min,max,step=5,disabled=false,onChange}:{
  label:string;value:number;min:number;max:number;step?:number;disabled?:boolean;
  onChange:(next:number)=>void;
}){
  const root=useRef<HTMLLabelElement>(null);
  const latest=useRef({value,min,max,step,disabled,onChange});
  latest.current={value,min,max,step,disabled,onChange};
  const wheelState=useRef({...INITIAL_WHEEL_STATE});
  const lastValue=useRef(value);
  useEffect(()=>{lastValue.current=value;},[value]);
  useEffect(()=>{
    const element=root.current;
    if(!element)return;
    const wheel=(event:WheelEvent)=>{
      if(latest.current.disabled || event.ctrlKey || event.metaKey)return;
      const delta=wheelPixels(event.deltaX,event.deltaY,event.deltaMode,element.clientWidth);
      if(!delta)return;
      event.preventDefault(); // Keep the settings page from scrolling under the cursor.
      const {min,max,step,onChange}=latest.current;
      const result=stepRange(lastValue.current,min,max,step,delta,Date.now(),wheelState.current);
      wheelState.current=result.state;
      if(result.changed){
        lastValue.current=result.value;
        onChange(result.value);
      }
    };
    element.addEventListener('wheel',wheel,{passive:false});
    return()=>element.removeEventListener('wheel',wheel);
  },[]);
  return <label ref={root} className="ha-size" title={label}>
    <strong>{label}</strong>
    <input className="ha-size-range" type="range" min={min} max={max} step={step}
      value={value} disabled={disabled} aria-label={label} onChange={event=>onChange(Number(event.target.value))}/>
    <output className="ha-size-output">{value}%</output>
  </label>;
}

function IconDialog({selected,onSelect,onClose}:{selected:IconName;onSelect:(icon:IconName)=>void;onClose:()=>void}){
  const {t}=useTranslation();
  const [query,setQuery]=useState('');
  const search=useRef<HTMLInputElement>(null);
  const dialog=useRef<HTMLDivElement>(null);
  const iconGrid=useRef<HTMLDivElement>(null);
  const closeRef=useRef(onClose);
  closeRef.current=onClose;
  useLayoutEffect(()=>{
    const grid=iconGrid.current;
    const active=grid?.querySelector<HTMLElement>('[data-selected="true"]');
    if(!grid||!active)return;
    const gridBounds=grid.getBoundingClientRect();
    const activeBounds=active.getBoundingClientRect();
    grid.scrollTop += activeBounds.top - gridBounds.top - (grid.clientHeight - activeBounds.height)/2;
  },[selected]);
  useEffect(()=>{
    search.current?.focus({preventScroll:true});
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();closeRef.current();return;}
      if(event.key==='Tab'){
        const controls=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)');
        if(!controls?.length)return;
        const first=controls[0]!,last=controls[controls.length-1]!;
        if(event.shiftKey&&document.activeElement===first){last.focus();event.preventDefault();}
        else if(!event.shiftKey&&document.activeElement===last){first.focus();event.preventDefault();}
      }
    };
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[]);
  const filtered = searchIcons(query);
  const groups = ICON_GROUPS.map(group => ({
    group,
    items: filtered.filter(icon => icon.group === group),
  })).filter(section => section.items.length > 0);
  const noIconMatches = !query.trim() || "none no icon".includes(query.trim().toLowerCase());
  const tile = (icon: IconDefinition) => <button type="button" className="ha-icon-cell" key={icon.id}
    data-selected={icon.id===selected} title={icon.id} aria-label={icon.id}
    aria-pressed={icon.id===selected} onClick={()=>{onSelect(icon.id);onClose();}}>
    <BadgeIcon name={icon.id}/><span>{icon.id.replaceAll('-', ' ')}</span>
  </button>;
  return <div className="ha-dialog-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div ref={dialog} className="ha-dialog" role="dialog" aria-modal="true" aria-label={t('ui.chooseIcon')}>
      <div className="ha-dialog-head"><strong>{t('ui.chooseIcon')}</strong><button type="button" className="ha-small-button" onClick={onClose} aria-label={t('ui.close')}>×</button></div>
      <input ref={search} className="ha-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('ui.searchIcons')} aria-label={t('ui.searchIcons')}/>
      <div ref={iconGrid} className="ha-icon-grid">
        {noIconMatches && <div className="ha-icon-section"><div className="ha-icon-section-grid"><button type="button" className="ha-icon-cell" data-selected={selected==='none'}
          aria-label={t('ui.noIcon')} aria-pressed={selected==='none'} title={t('ui.noIcon')}
          onClick={()=>{onSelect('none');onClose();}}><span className="ha-none-icon">×</span><span>{t('ui.noIcon')}</span></button></div></div>}
        {groups.map(({group,items})=><section key={group} className="ha-icon-section" aria-label={t(`ui.iconGroups.${group}`)}>
          <strong className="ha-icon-section-title">{t(`ui.iconGroups.${group}`)}</strong>
          <div className="ha-icon-section-grid">{items.map(tile)}</div>
        </section>)}
        {groups.length===0&&!noIconMatches&&<p className="ha-empty">{t('ui.noResults')}</p>}
      </div>
    </div>
  </div>;
}
function LayoutPicker({prefs,onSelect,disabled=false}:{prefs:DisplayPreferences;onSelect:(v:LayoutVariant)=>void;disabled?:boolean}){
  const {t}=useTranslation();
  const rail=useWheelPicker(LAYOUT_VARIANTS,prefs.layoutVariant,onSelect,disabled);
  return <div className="ha-layout-choices ha-choice-rail" ref={rail} role="group" aria-label={t('ui.layouts')}
    onKeyDown={event=>{
      if(disabled||!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();
      const direction=event.key==='ArrowRight'?1:-1;
      const index=Math.max(0,LAYOUT_VARIANTS.indexOf(prefs.layoutVariant));
      onSelect(LAYOUT_VARIANTS[(index+direction+LAYOUT_VARIANTS.length)%LAYOUT_VARIANTS.length]!);
    }}>
    {LAYOUT_VARIANTS.map(variant=><button key={variant} type="button" className="ha-layout-choice" data-active={prefs.layoutVariant===variant}
      data-ha-picker-item={variant} aria-pressed={prefs.layoutVariant===variant} disabled={disabled} onClick={()=>onSelect(variant)}>
      <span className="ha-layout-title">{t(`ui.layout.${variant}`)}</span>
      <LayoutSample prefs={prefs} style={variant}/>
    </button>)}
  </div>;
}
/** The same semantic palette chips are used in normal settings and in every
 * host/folder override. A real host badge uses effectiveColor in the same way.
 */
const THEME_SWATCHES = [
  ['source','credential'],['source','host'],['source','plugin'],['source','unknown'],
  ['method','password'],['method','key'],['method','both'],['method','agent'],
  ['method','none'],['method','custom'],['method','unknown'],
] as const;
function ThemeSwatches({palette}:{palette:PalettePreset}){
  const {t}=useTranslation();
  return <span className="ha-palette-dots">{THEME_SWATCHES.map(([kind,key])=>{
    const color=PALETTES[palette][kind][key];
    return <i key={`${kind}-${key}`} data-ha-swatch-kind={kind}
      title={`${t(kind==='source'?'ui.source':'ui.method')}: ${t(`ui.values.${key}`)}`} style={{background:color}}/>;
  })}</span>;
}
function PalettePicker({value,onSelect,disabled=false}:{value:PalettePreset;onSelect:(v:PalettePreset)=>void;disabled?:boolean}){
  const {t}=useTranslation();
  const rail=useWheelPicker(PALETTE_PRESETS,value,onSelect,disabled);
  return <div className="ha-palette-list ha-choice-rail" ref={rail} role="group" aria-label={t('ui.colors')}>
    {PALETTE_PRESETS.map(p=><button key={p} className="ha-palette-choice" data-ha-picker-item={p}
      aria-pressed={value===p} data-active={value===p} type="button" disabled={disabled} onClick={()=>onSelect(p)}>
      <ThemeSwatches palette={p}/>
      <span className="ha-palette-name">{t(`ui.palettes.${p}`)}</span>
    </button>)}
  </div>;
}
/** Uniform preview disclosure in global settings, host and folder overrides. */
function AppearancePreview({preferences}:{preferences:DisplayPreferences}){
  const {t}=useTranslation();
  const [open,setOpen]=useState(false);
  return <Disclosure title={t('ui.preview')} summary={t('ui.live')}
    open={open} onToggle={()=>setOpen(value=>!value)}>
    <BadgePreview preferences={preferences}/>
  </Disclosure>;
}

/** Icon, short editable label and color are visible in a single row. */
function PartEditor({kind,config,onChange,palette='signature',disabled=false}:{
  kind:PartKind;config:PartAppearance;onChange:(v:PartAppearance)=>void;palette?:PalettePreset;disabled?:boolean;
}):ReactNode{
  const {t}=useTranslation();
  const [iconKey,setIconKey]=useState<string|null>(null);
  const lastIconButton=useRef<HTMLButtonElement|null>(null);
  const values=kind==='source'?SOURCE_VALUES:METHOD_VALUES;
  // Keep the latest user edits across consecutive input events even before Termix
  // sends updated settings props back. A redraw restores the actual native form state.
  const pendingPart=useRef(config);
  pendingPart.current=config;
  const commit=(next:PartAppearance)=>{pendingPart.current=next;onChange(next);};
  const update=(changes:Partial<PartAppearance>)=>commit({...pendingPart.current,...changes});
  function setIcon(key:string,icon:IconName){update({icons:{...pendingPart.current.icons,[key]:icon},showIcon:true,enabled:true});}
  function setLabel(key:string,label:string){commit(withUpdatedLabel(pendingPart.current,kind,key,label));}
  function resetLabel(key:string){commit(withDefaultLabels(pendingPart.current,kind,key));}
  function resetLabels(){commit(withDefaultLabels(pendingPart.current,kind));}
  function setColor(key:string,color:string){update({colors:{...pendingPart.current.colors,[key]:color}});}
  return <section className="ha-part-editor" data-ha-editor-kind={kind}>
    <div className="ha-part-head">
      <strong>{t(kind==='source'?'ui.source':'ui.method')}</strong>
      <div className="ha-part-tools">
        <Toggle value={config.showIcon} disabled={disabled} onChange={showIcon=>update({showIcon})} title={t('ui.toggleIcons')}>{t('ui.icon')}</Toggle>
        <Toggle value={config.showLabel} disabled={disabled} onChange={showLabel=>update({showLabel})} title={t('ui.toggleLabels')}>{t('ui.text')}</Toggle>
        <button type="button" className="ha-small-button ha-reset-labels" data-ha-visible={hasModifiedLabels(config,kind) ? 'true' : 'false'}
          disabled={disabled || !hasModifiedLabels(config,kind)} aria-hidden={!hasModifiedLabels(config,kind)}
          tabIndex={hasModifiedLabels(config,kind) ? 0 : -1} onClick={resetLabels}
          title={t('ui.resetLabels')} aria-label={t('ui.resetLabels')}><span aria-hidden="true">↺</span></button>
      </div>
    </div>
    <div className="ha-part-rows">{values.map(key=>{
      const accent=effectiveColor(palette,kind,key,config.colors[key]);
      const label=editableLabel(config,kind,key);
      const modified=isLabelModified(config,kind,key);
      const iconChanged=isIconModified(config,kind,key);
      const colorChanged=isColorModified(config,key);
      return <div key={key} className="ha-edit-row">
        <span className="ha-value-name">{t(`ui.values.${key}`)}</span>
        <button type="button" className="ha-icon-button" aria-label={`${t('ui.chooseIcon')}: ${t(`ui.values.${key}`)}`} title={t('ui.chooseIcon')}
          disabled={disabled} onClick={event=>{lastIconButton.current=event.currentTarget;setIconKey(key);}} style={{color:accent}}><BadgeIcon name={iconFor(config,kind,key)}/></button>
        <button type="button" className="ha-item-reset" data-ha-visible={iconChanged} disabled={disabled||!iconChanged} tabIndex={iconChanged?0:-1} aria-hidden={!iconChanged} title={t('ui.resetIcon')} aria-label={`${t('ui.resetIcon')}: ${t(`ui.values.${key}`)}`} onClick={()=>commit(resetIcon(pendingPart.current,key))}>↺</button>
        <input className="ha-label-input" type="text" maxLength={32} aria-label={`${t('ui.label')}: ${t(`ui.values.${key}`)}`}
          value={label}
          disabled={disabled} onChange={e=>setLabel(key,e.target.value)}
          title={t('ui.label')}/>
        <button className="ha-item-reset" type="button" data-ha-visible={modified} disabled={disabled||!modified} tabIndex={modified?0:-1} aria-hidden={!modified} onClick={()=>resetLabel(key)} title={t('ui.resetLabel')} aria-label={`${t('ui.resetLabel')}: ${t(`ui.values.${key}`)}`}>↺</button>
        <input className="ha-color" type="color" disabled={disabled||palette==='monochrome'} value={accent} onChange={e=>setColor(key,e.target.value)}
          aria-label={`${t('ui.color')}: ${t(`ui.values.${key}`)}`} title={palette==='monochrome'?t('ui.monoHint'):t('ui.color')}/>
        <button type="button" className="ha-item-reset" data-ha-visible={colorChanged} disabled={disabled||!colorChanged} tabIndex={colorChanged?0:-1} aria-hidden={!colorChanged} title={t('ui.resetColor')} aria-label={`${t('ui.resetColor')}: ${t(`ui.values.${key}`)}`} onClick={()=>commit(resetColor(pendingPart.current,key))}>↺</button>
      </div>;
    })}</div>
    {iconKey!==null&&<IconDialog selected={iconFor(config,kind,iconKey)} onSelect={icon=>setIcon(iconKey,icon)} onClose={()=>{setIconKey(null);lastIconButton.current?.focus();}}/>}
  </section>;
}

/** Same controls for user, host and folder settings, with the same preview and theme renderer.
 * The host editor persists Composition/Source/Method as three independent inherited fields,
 * but exposes only one visible panel in the native Termix settings UI.
 */
function AppearanceSettingsSections({prefs,running,onChange,onPartChange}:{
  prefs:DisplayPreferences;running:boolean;
  onChange:(updates:readonly (readonly [string,unknown])[])=>void;
  onPartChange:(kind:PartKind,value:PartAppearance)=>void;
}){
  const {t}=useTranslation();
  const [advancedOpen,setAdvancedOpen]=useState(false);
  const describe=(config:PartAppearance)=>!config.enabled||(!config.showIcon&&!config.showLabel)
    ?t('ui.hiddenPart'):[config.showIcon&&t('ui.icon'),config.showLabel&&t('ui.text')].filter(Boolean).join(' + ');
  const set=(key:string,value:unknown)=>onChange([[key,value]]);
  return <>
    <AppearancePreview preferences={prefs}/>
    <div className="ha-section-row"><strong>{t('ui.layouts')}</strong>
      <div className="ha-layout-controls">
        <div className="ha-positions" role="group" aria-label={t('ui.position')}>
          {(['after','before'] as const).map(pos=><button type="button" className="ha-segment" aria-pressed={prefs.position===pos}
            key={pos} disabled={!running} onClick={()=>set('position',pos)}>{t(`ui.positions.${pos}`)}</button>)}
        </div>
      </div>
    </div>
    <LayoutPicker prefs={prefs} disabled={!running} onSelect={variant=>onChange([['layoutVariant',variant]])}/>
    <div className="ha-tuning">
      <div className="ha-tuning-head"><strong>{t('ui.colors')}</strong></div>
      <PalettePicker value={prefs.palettePreset} disabled={!running} onSelect={value=>set('palettePreset',value)}/>
      <div className="ha-size-grid">
        <SizeControl label={t('ui.textSize')} value={prefs.textSize} min={60} max={220} disabled={!running}
          onChange={value=>set('textSize',value)}/>
        <SizeControl label={t('ui.iconSize')} value={prefs.iconSize} min={60} max={260} disabled={!running}
          onChange={value=>set('iconSize',value)}/>
      </div>
    </div>
    <Disclosure title={t('ui.advancedTitle')}
      summary={`${t('ui.source')}: ${describe(prefs.sourceConfig)} · ${t('ui.method')}: ${describe(prefs.methodConfig)}`}
      open={advancedOpen} onToggle={()=>setAdvancedOpen(open=>!open)}>
      <div className="ha-part-columns">
        <PartEditor kind="source" config={prefs.sourceConfig} disabled={!running} palette={prefs.palettePreset}
          onChange={value=>onPartChange('source',value)}/>
        <PartEditor kind="method" config={prefs.methodConfig} disabled={!running} palette={prefs.palettePreset}
          onChange={value=>onPartChange('method',value)}/>
      </div>
    </Disclosure>
  </>;
}

/** Main editor: changes are applied locally while Termix still owns Save/Cancel. */
type BadgeDesignerProps = SettingsComponentProps & {
  onLiveChange?: (preferences: DisplayPreferences) => void;
  liveDirty?: boolean;
  savedPreferences?: DisplayPreferences;
  currentPreferences?: DisplayPreferences;
};
export function BadgeDesigner({values,setValue,running,onLiveChange,liveDirty=false,savedPreferences,currentPreferences}:BadgeDesignerProps){
  const {t}=useTranslation();
  const diffTooltipId=useId();
  const pendingValues=useRef<Record<string, unknown>>(values);
  // Several setValue() calls can happen before React renders (e.g. Reset appearance).
  pendingValues.current=values;
  const prefs=normalizePreferences(values);
  // Hiding SOURCE and the METHOD text is valid; warn instead of altering the choice.
  const methodOnly = isMethodIconOnly(prefs);
  const changes=liveDirty && savedPreferences ? diffAppearance(savedPreferences,currentPreferences ?? prefs) : [];
  const PART_FLAG_KEYS:Record<string,string>={enabled:'ui.enabled',showIcon:'ui.toggleIcons',showLabel:'ui.toggleLabels'};
  const labelForChange=(change:AppearanceChange)=>{
    const path=change.path;
    const simple:Record<string,string>={
      enabled:'ui.enabled',position:'ui.position',layoutVariant:'ui.layouts',palettePreset:'ui.colors',
      textSize:'ui.textSize',iconSize:'ui.iconSize',
    };
    if(simple[path])return t(simple[path]);
    const fragments=path.split('.');
    const type=fragments[0]==='sourceConfig' ? t('ui.source') : fragments[0]==='methodConfig' ? t('ui.method') : '';
    if(!type)return path;
    const category=fragments[1]==='icons'?t('ui.icon'):
      fragments[1]==='labels'?t('ui.text'):
      fragments[1]==='colors'?t('ui.color'):t(PART_FLAG_KEYS[fragments[1]!]??'ui.enabled');
    return `${type} · ${category}${fragments[2]?` · ${t(`ui.values.${fragments[2]}`)}`:''}`;
  };
  const formatChangeValue=(path:string,value:string)=>{
    if(value==='on')return t('ui.changeOn');
    if(value==='off')return t('ui.changeOff');
    if(path==='layoutVariant')return t(`ui.layout.${value}`);
    if(path==='palettePreset')return t(`ui.palettes.${value}`);
    if(path==='position')return t(`ui.positions.${value}`);
    if(path==='textSize'||path==='iconSize')return `${value}%`;
    return value||'—';
  };
  // Consolidate multi-key operations so Reset/Joined selection redraw all hosts once.
  const putMany=(changes:readonly (readonly [string,unknown])[])=>{
    let next=pendingValues.current;
    for(const [key,value] of changes){
      next=mergeDraftValues(next,key,value);
      setValue(key,value);
    }
    pendingValues.current=next;
    // In-memory draft only: real host badges render it before native Save.
    onLiveChange?.(normalizePreferences(next));
  };
  const put=(key:string,value:unknown)=>putMany([[key,value]]);
  const updatePart=(kind:PartKind,value:PartAppearance)=>put(PART_FIELDS[kind],serializePart(value,kind));
  const resetAll=()=>putMany([
    ['sourceConfig',serializePart(defaultsFor('source'),'source')],
    ['methodConfig',serializePart(defaultsFor('method'),'method')],
    ['palettePreset','catppuccin'], ['layoutVariant','bare'],
    ['textSize',100], ['iconSize',100],
    ['position','after'],
  ]);
  return <div className="ha-designer ha-editor">
    <div className="ha-titlebar"><strong>{t('ui.title')}</strong>
      <label className="ha-inline-check">
        <input className="ha-switch-input" type="checkbox" checked={prefs.enabled} disabled={!running}
          onChange={e=>put('enabled',e.target.checked)}/>
        <span className="ha-switch-track" aria-hidden="true"/>
        <span>{t('ui.enabled')}</span>
      </label>
    </div>
    <p className="ha-intro">{t('ui.intro')}</p>
    {methodOnly && <p className="ha-method-only-warning" role="status">{t('ui.methodOnlyWarning')}</p>}
    <AppearanceSettingsSections prefs={prefs} running={running} onChange={putMany}
      onPartChange={(kind,value)=>updatePart(kind,value)}/>
    <div className="ha-footer">
      <span className="ha-footer-hint" title={t('ui.hint')} tabIndex={0} aria-label={t('ui.hint')}>
        <span className="ha-footer-info" aria-hidden="true">ⓘ</span>{t('ui.hintShort')}
      </span>
      <div className="ha-footer-actions">
        <div className="ha-unsaved-wrapper">
          <span className="ha-save-indicator" role="status" aria-live="polite"
            tabIndex={liveDirty ? 0 : -1} aria-hidden={!liveDirty}
            aria-describedby={liveDirty ? diffTooltipId : undefined}
            data-ha-dirty={liveDirty ? 'true' : 'false'}>
            <span className="ha-save-dot" aria-hidden="true"/>
            {t('ui.unsavedTitle')}
          </span>
          {liveDirty && <div className="ha-save-tooltip" role="tooltip" id={diffTooltipId}>
            <p className="ha-save-tooltip-title">{t('ui.unsavedHelp')}</p>
            {changes.length>0 && <ul className="ha-save-diff-list">
              {changes.slice(0,12).map(change=><li key={change.path}>
                <span className="ha-save-diff-label">{labelForChange(change)}</span>
                <span className="ha-save-diff-value"><span>{formatChangeValue(change.path,change.before)}</span>
                  {' → '}<strong>{formatChangeValue(change.path,change.after)}</strong></span>
              </li>)}
            </ul>}
            {changes.length>12 && <span>{t('ui.moreChanges')}: +{changes.length-12}</span>}
          </div>}
        </div>
        <button type="button" className="ha-reset-button" disabled={!running} onClick={resetAll}>
          <span className="ha-reset-glyph" aria-hidden="true">↺</span>
          {t('ui.resetAppearance')}
        </button>
      </div>
    </div>
  </div>;
}

/** SettingsComponentProps exposes only effective values, not where they come from,
 * so inherited values are never presented as local. Null asks the native form to
 * clear a field; persistence still requires the Termix Save action.
 */
function HostInheritanceControls({effective,myDefaults,values,running,onClear}: {
  effective:DisplayPreferences;myDefaults:DisplayPreferences;
  values:Record<string,unknown>;running:boolean;
  onClear:(keys:readonly HostGroupKey[])=>void;
}) {
  const {t}=useTranslation();
  const [confirmAll,setConfirmAll]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const effectiveFields=inheritanceSummary(values);
  const dialogId=useId();
  const dialogRef=useRef<HTMLDivElement>(null);
  const summaries:Record<HostGroupKey,string>={
    compositionOverride:`${t(`ui.layout.${effective.layoutVariant}`)} · ${t(`ui.palettes.${effective.palettePreset}`)} · ${effective.textSize}% / ${effective.iconSize}%`,
    sourceOverride:[effective.sourceConfig.showIcon?t('ui.icon'):null,effective.sourceConfig.showLabel?t('ui.text'):null].filter(Boolean).join(' + ') || t('ui.hiddenPart'),
    methodOverride:[effective.methodConfig.showIcon?t('ui.icon'):null,effective.methodConfig.showLabel?t('ui.text'):null].filter(Boolean).join(' + ') || t('ui.hiddenPart'),
  };
  return <section className="ha-inherit-panel">
    <div className="ha-inherit-heading"><strong>{t('ui.inheritHeading')}</strong>
      <button type="button" className="ha-small-button ha-inherit-all" disabled={!running} onClick={()=>setConfirmAll(true)}>{t('ui.inheritResetAll')}</button>
    </div>
    <p className="ha-inherit-note">{t('ui.inheritLimit')}</p>
    <div className="ha-inherit-groups">{HOST_GROUP_KEYS.map(key=><div key={key} className="ha-inherit-group">
      <span className="ha-inherit-group-label">{t(GROUP_LABEL_KEYS[key])}</span>
      <span className="ha-inherit-group-value" title={t('ui.inheritEffectiveInfo')}>{summaries[key]}</span>
      <button type="button" className="ha-small-button ha-inherit-single" disabled={!running} onClick={()=>onClear([key])}
        title={t('ui.inheritSingleHint')}>{t('ui.inheritSingle')}</button>
    </div>)}</div>
    <button type="button" className="ha-inherit-info-toggle" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>
      {t('ui.inheritCompare')} <span aria-hidden="true">{expanded?'▴':'▾'}</span>
    </button>
    {expanded&&<div className="ha-inherit-comparison">
      <span>{t('ui.inheritMyDefaults')}:</span>
      <strong>{t(`ui.layout.${myDefaults.layoutVariant}`)} · {t(`ui.palettes.${myDefaults.palettePreset}`)} · {myDefaults.textSize}% / {myDefaults.iconSize}%</strong>
      <small>{t('ui.inheritParentUnknown')}</small>
    </div>}
    {confirmAll&&<div className="ha-dialog-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setConfirmAll(false)}}>
      <div ref={dialogRef} className="ha-dialog ha-inherit-dialog" role="dialog" aria-modal="true" aria-labelledby={dialogId}
        onKeyDown={event=>{
          if(event.key==='Escape'){event.preventDefault();setConfirmAll(false);return;}
          if(event.key==='Tab'){
            const buttons=dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
            if(!buttons?.length)return;
            const first=buttons[0]!,last=buttons[buttons.length-1]!;
            if(event.shiftKey&&document.activeElement===first){last.focus();event.preventDefault();}
            else if(!event.shiftKey&&document.activeElement===last){first.focus();event.preventDefault();}
          }
        }}>
        <strong id={dialogId}>{t('ui.inheritConfirmTitle')}</strong>
        <p className="ha-inherit-note">{t('ui.inheritConfirmDescription')}</p>
        <ul>{effectiveFields.map(({key,present})=><li key={key}>
          <strong>{t(GROUP_LABEL_KEYS[key])}</strong>: {summaries[key]}
          <span className="ha-inherit-current"> · {present?t('ui.inheritEffective'):t('ui.inheritUnset')}</span>
        </li>)}</ul>
        <p className="ha-inherit-note">{t('ui.inheritAfterSave')}</p>
        <div className="ha-inherit-actions">
          <button type="button" className="ha-small-button" autoFocus onClick={()=>setConfirmAll(false)}>{t('ui.inheritCancel')}</button>
          <button type="button" className="ha-reset-button ha-inherit-confirm" onClick={()=>{onClear(HOST_GROUP_KEYS);setConfirmAll(false)}}>{t('ui.inheritConfirm')}</button>
        </div>
      </div>
    </div>}
  </section>;
}

/** Editor for host, folder, user-default and server-default scopes. Termix passes the
 * already-inherited fields in `values`. Real host badges change only after Save,
 * because the form does not expose which host or folder is being edited.
 */
export function CompositionHostOverride({values,setValue,running}:SettingsComponentProps){
  const {t}=useTranslation();
  const {values:userSettings}=useSettings('user');
  const base=normalizePreferences(userSettings||{});
  // The preview resolves all three host fields together so it matches the real badge.
  const pending=useRef<Record<string,unknown>>(values);
  pending.current=values;
  const prefs=resolveForHost(base,values);
  const apply=(changes:readonly (readonly [string,unknown])[])=>{
    const next={...pending.current};
    const composition={...parseRecord(next.compositionOverride)};
    for(const [key,value] of changes) composition[key]=value;
    const serialized=JSON.stringify(composition);
    next.compositionOverride=serialized;
    pending.current=next;
    setValue('compositionOverride',serialized);
  };
  const changePart=(kind:PartKind,value:PartAppearance)=>{
    const key=HOST_FIELDS[kind];
    pending.current={...pending.current,[key]:serializePart(value,kind)};
    setValue(key,pending.current[key]);
  };
  const clearGroups=(keys:readonly HostGroupKey[])=>{
    pending.current=clearHostGroups(pending.current,keys);
    // Null clears the field instead of storing {} or an empty string.
    for(const key of keys)setValue(key,null);
  };
  return <div className="ha-host-editor ha-editor" data-ha-editor-scope="host-defaultable">
    <div className="ha-titlebar"><strong>{t('ui.title')}</strong>
      <label className="ha-inline-check">
        <input className="ha-switch-input" type="checkbox" checked={prefs.enabled} disabled={!running}
          onChange={e=>apply([['enabled',e.target.checked]])}/>
        <span className="ha-switch-track" aria-hidden="true"/>
        <span>{t('ui.enabled')}</span>
      </label>
    </div>
    <HostInheritanceControls effective={prefs} myDefaults={base} values={values} running={running} onClear={clearGroups}/>
    <AppearanceSettingsSections prefs={prefs} running={running} onChange={apply} onPartChange={changePart}/>
    <p className="ha-host-save-note" title={t('ui.hint')}>{t('ui.hostSaveNote')}</p>
  </div>;
}
