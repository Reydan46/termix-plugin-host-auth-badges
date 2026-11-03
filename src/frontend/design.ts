/** Safe visual presets and short labels; no host secrets. */
import type { PartKind, PartAppearance } from './appearance.ts';

/** Supported layouts; first choice is the default. */
export const LAYOUT_VARIANTS = [
  'bare', 'separate', 'joined', 'joined-flat', 'unified', 'outline', 'pill',
  'duotone', 'flow', 'emblem', 'tagged', 'focus',
] as const;
export type LayoutVariant = (typeof LAYOUT_VARIANTS)[number];
export function normalizedLayout(value:unknown):LayoutVariant {
  return LAYOUT_VARIANTS.includes(value as LayoutVariant)?value as LayoutVariant:'bare';
}

export const PALETTE_PRESETS = [
  'signature', 'neon', 'ocean', 'forest', 'sunset', 'retro', 'pastel',
  'catppuccin', 'nord', 'gruvbox', 'dracula', 'tokyo', 'solarized',
  'industrial', 'terminal', 'ember', 'aurora', 'monochrome',
] as const;
export type PalettePreset = (typeof PALETTE_PRESETS)[number];
export const SHORT_LABELS: Record<PartKind, Record<string,string>> = {
  source: {credential:'CRED',host:'HOST',plugin:'EXT',unknown:'?'},
  method: {password:'PASS',key:'KEY',both:'BOTH',agent:'AGENT',none:'NONE',custom:'OTHER',unknown:'?'},
};
/** Per-theme accents: four distinct SOURCE and seven distinct METHOD shades.
 * Monochrome is the luminance-only exception. Contrast and pairwise color
 * distance are checked in tests/palette-contrast.test.mjs.
 */
export const PALETTES: Record<PalettePreset, Record<PartKind, Record<string,string>>> = {
  signature: {
    source: {credential:'#c278b1', host:'#8ea3eb', plugin:'#ce7765', unknown:'#cb9d5a'},
    method: {password:'#b8c074', key:'#1f89ba', both:'#89dda9', agent:'#45a078', none:'#48cac6', custom:'#868b62', unknown:'#2cc1f2'},
  },
  sunset: {
    source: {credential:'#b16fac', host:'#f196a8', plugin:'#c68057', unknown:'#b8ab5f'},
    method: {password:'#8bc489', key:'#7481c1', both:'#65d4cb', agent:'#1699a3', none:'#52b6ef', custom:'#648a6f', unknown:'#c0b2f1'},
  },
  gruvbox: {
    source: {credential:'#ce6f90', host:'#ed977f', plugin:'#a68843', unknown:'#9aba6f'},
    method: {password:'#57ccaf', key:'#dfb0d5', both:'#22cbed', agent:'#528bc8', none:'#b1c1e1', custom:'#947aba', unknown:'#1d8e94'},
  },
  catppuccin: {
    source: {credential:'#9883cb', host:'#11b4dc', plugin:'#ce7078', unknown:'#d09b64'},
    method: {password:'#8eac58', key:'#159387', both:'#d5ca7a', agent:'#638c62', none:'#8ed999', custom:'#8a844d', unknown:'#7bb7a5'},
  },
  aurora: {
    source: {credential:'#81994c', host:'#cda562', plugin:'#11ae95', unknown:'#44b1ed'},
    method: {password:'#a8a7e6', key:'#f2a287', both:'#ecb4f0', agent:'#c482aa', none:'#f2adb9', custom:'#c47876', unknown:'#8a78b3'},
  },
  neon: {
    source: {credential:'#d06b7f', host:'#e89c77', plugin:'#9e9c4f', unknown:'#5dba8e'},
    method: {password:'#18c1cb', key:'#f2afc8', both:'#8fc3f2', agent:'#817fbd', none:'#c2b5ee', custom:'#a7999f', unknown:'#498fad'},
  },
  retro: {
    source: {credential:'#d27087', host:'#e69976', plugin:'#a48e44', unknown:'#88b973'},
    method: {password:'#54d4c2', key:'#e2add2', both:'#46c4f2', agent:'#598bc7', none:'#b5c0dd', custom:'#987bba', unknown:'#19919a'},
  },
  dracula: {
    source: {credential:'#9883cb', host:'#11b9e6', plugin:'#d3717f', unknown:'#da9265'},
    method: {password:'#cbb26a', key:'#4dd4cd', both:'#b3ca7b', agent:'#4fa193', none:'#7bcd9f', custom:'#668f60', unknown:'#99895d'},
  },
  industrial: {
    source: {credential:'#d06c86', host:'#e69b75', plugin:'#a38e43', unknown:'#86b771'},
    method: {password:'#4bcbb8', key:'#e8afd5', both:'#38bbf1', agent:'#5981c1', none:'#adbbf2', custom:'#9979af', unknown:'#1a9098'},
  },
  monochrome: {
    source: {credential:'#929292', host:'#b3b3b3', plugin:'#d2d2d2', unknown:'#f0f0f0'},
    method: {password:'#ebebeb', key:'#858585', both:'#c2c2c2', agent:'#aeaeae', none:'#ffffff', custom:'#d6d6d6', unknown:'#999999'},
  },
  ocean: {
    source: {credential:'#53975b', host:'#bab869', plugin:'#11adaa', unknown:'#7ea4eb'},
    method: {password:'#c6a2e0', key:'#e5ad7a', both:'#d3bebe', agent:'#ca7a99', none:'#f0978c', custom:'#ad7a5d', unknown:'#8c9993'},
  },
  pastel: {
    source: {credential:'#877fc8', host:'#e69ad2', plugin:'#d47970', unknown:'#be9755'},
    method: {password:'#b3bf75', key:'#128ebe', both:'#7bd7a4', agent:'#648d87', none:'#5ec6c6', custom:'#758e58', unknown:'#74c3f1'},
  },
  tokyo: {
    source: {credential:'#11aaae', host:'#d7728e', plugin:'#7288d2', unknown:'#d5a5ed'},
    method: {password:'#f2a391', key:'#79d7ad', both:'#dab276', agent:'#928456', none:'#acbd74', custom:'#6a9673', unknown:'#a37e71'},
  },
  terminal: {
    source: {credential:'#ac944a', host:'#dd8671', plugin:'#69a76b', unknown:'#11bdcf'},
    method: {password:'#b9bae3', key:'#b46c88', both:'#8dbef2', agent:'#a98ac2', none:'#ecb3f2', custom:'#758cc7', unknown:'#ec93b2'},
  },
  forest: {
    source: {credential:'#a8964a', host:'#dc8c6d', plugin:'#60a46b', unknown:'#11bece'},
    method: {password:'#89b8ee', key:'#b96e8f', both:'#c5c0ed', agent:'#a082c2', none:'#e09ccf', custom:'#6b89bb', unknown:'#ddb7bc'},
  },
  nord: {
    source: {credential:'#36a880', host:'#11bae5', plugin:'#6282cd', unknown:'#c5a7f0'},
    method: {password:'#f29ab9', key:'#b2c47b', both:'#f2a38d', agent:'#be6a6b', none:'#d4ad72', custom:'#8c895c', unknown:'#aa6ea0'},
  },
  solarized: {
    source: {credential:'#d06c83', host:'#e89c77', plugin:'#a39549', unknown:'#78ba7e'},
    method: {password:'#2ac6bd', key:'#edaecd', both:'#65c3f2', agent:'#6a8aca', none:'#b6bcd9', custom:'#a77cb9', unknown:'#1290a2'},
  },
  ember: {
    source: {credential:'#ac6caa', host:'#f198b2', plugin:'#ce8060', unknown:'#b8ab60'},
    method: {password:'#92c990', key:'#7488c0', both:'#51d5cf', agent:'#1e96a2', none:'#52baf2', custom:'#5e8b6c', unknown:'#c7adec'},
  },
};
export function normalizedPalette(value:unknown):PalettePreset {
  return PALETTE_PRESETS.includes(value as PalettePreset)?value as PalettePreset:'catppuccin';
}
function paletteColor(palette:PalettePreset,kind:PartKind,key:string):string {
  return PALETTES[palette][kind][key]??'#94a3b8';
}
/** Explicit colors are the only overrides. Changing palette always updates other swatches. */
export function effectiveColor(palette:PalettePreset,kind:PartKind,key:string,override:unknown):string {
  if(palette==='monochrome')return paletteColor(palette,kind,key);
  return typeof override==='string'&&/^#[0-9a-f]{6}$/i.test(override)?override.toLowerCase():paletteColor(palette,kind,key);
}
export function editableLabel(config:PartAppearance,kind:PartKind,key:string):string {
  return config.labels[key]??SHORT_LABELS[kind][key]??'?';
}
export function isLabelModified(config:PartAppearance,kind:PartKind,key:string):boolean {
  return editableLabel(config,kind,key)!==(SHORT_LABELS[kind][key]??'?');
}
export function hasModifiedLabels(config:PartAppearance,kind:PartKind):boolean {
  return Object.keys(SHORT_LABELS[kind]).some(key=>isLabelModified(config,kind,key));
}
export function withUpdatedLabel(config:PartAppearance,kind:PartKind,key:string,label:string):PartAppearance {
  if(!Object.hasOwn(SHORT_LABELS[kind],key))return config;
  return {...config,labels:{...config.labels,[key]:label},showLabel:true,enabled:true};
}
export function withDefaultLabels(config:PartAppearance,kind:PartKind,key?:string):PartAppearance {
  const labels={...config.labels};
  if(key)delete labels[key];else for(const value of Object.keys(SHORT_LABELS[kind]))delete labels[value];
  return {...config,labels,showLabel:true};
}
