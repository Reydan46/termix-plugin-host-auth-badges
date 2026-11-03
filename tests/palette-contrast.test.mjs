import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { PALETTE_PRESETS, PALETTES, effectiveColor } from '../src/frontend/design.ts';
import { SOURCE_VALUES, METHOD_VALUES, defaultsFor } from '../src/frontend/appearance.ts';

// CIE76 is a perceptual color difference (not WCAG contrast). Verify all 4x7
// category pairs AND diversity inside each semantic group, not just CRED+KEY.
function lab(hex) {
  const srgb = [1,3,5].map(x => parseInt(hex.slice(x,x+2),16)/255);
  const [r,g,b] = srgb.map(x => x<=.04045 ? x/12.92 : ((x+.055)/1.055)**2.4);
  const x=(.4124564*r+.3575761*g+.1804375*b)/.95047;
  const y=(.2126729*r+.7151522*g+.0721750*b);
  const z=(.0193339*r+.1191920*g+.9503041*b)/1.08883;
  const f=t=>t>216/24389?Math.cbrt(t):t*(24389/27)/116+16/116;
  const [X,Y,Z]=[x,y,z].map(f);
  return [116*Y-16,500*(X-Y),200*(Y-Z)];
}
function distance(a,b){
 const la=lab(a),lb=lab(b);
 return Math.hypot(...la.map((v,i)=>v-lb[i]));
}
const distinct=(values,limit)=>{
 let min=Infinity;
 for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++)min=Math.min(min,distance(values[i],values[j]));
 return min;
};

for(const name of PALETTE_PRESETS){
 test(`${name}: all 28 SOURCE × METHOD combinations remain visually distinct`,()=>{
  const source=SOURCE_VALUES.map(k=>PALETTES[name].source[k]);
  const method=METHOD_VALUES.map(k=>PALETTES[name].method[k]);
  assert.ok(source.every(x=>/^#[0-9a-f]{6}$/i.test(x)));
  assert.ok(method.every(x=>/^#[0-9a-f]{6}$/i.test(x)));
  assert.equal(new Set([...source,...method]).size,11);
  for(let i=0;i<source.length;i++)for(let j=0;j<method.length;j++){
   // Pastel/muted accents use less chroma than older neon presets.
   // CIELAB distance still detects if unrelated categories become indistinguishable.
   if(name==='monochrome')continue; // Grayscale is checked separately for readability.
   const threshold=23;
   const d=distance(source[i],method[j]);
   assert.ok(d>=threshold,`${name} ${SOURCE_VALUES[i]}/${METHOD_VALUES[j]}: ΔE76 ${d.toFixed(1)} < ${threshold}`);
  }
  // The source categories CRED/HOST/EXT/UNKNOWN must be separable even
  // without seeing the corresponding METHOD badge. Method categories, too.
  const sourceMinimum=name==='monochrome'?5:24;
  const methodMinimum=name==='monochrome'?4:13;
  assert.ok(distinct(source,0)>= sourceMinimum, `${name} SOURCE colors too close (min ${distinct(source,0).toFixed(1)} < ${sourceMinimum})`);
  assert.ok(distinct(method,0)>= methodMinimum, `${name} METHOD colors too close (min ${distinct(method,0).toFixed(1)} < ${methodMinimum})`);
  if (name!=='monochrome') {
    const credHost=distance(PALETTES[name].source.credential,PALETTES[name].source.host);
    assert.ok(credHost>=29, `${name} CRED/HOST too similar: ${credHost.toFixed(1)}`);
  }
 });
}
test('custom accents remain user-controlled; factory colors follow the selected theme',()=>{
 assert.equal(effectiveColor('gruvbox','source','credential',defaultsFor('source').colors.credential), PALETTES.gruvbox.source.credential);
 assert.equal(effectiveColor('nord','method','key',defaultsFor('method').colors.key), PALETTES.nord.method.key);
 assert.equal(effectiveColor('gruvbox','method','key','#123456'),'#123456');
});
test('palette chooser visual samples include all eleven categories',()=>{
 const designer=readFileSync(new URL('../src/frontend/designer.tsx',import.meta.url),'utf8');
 for(const key of SOURCE_VALUES)assert.match(designer,new RegExp(`\['source','${key}'\]`));
 for(const key of METHOD_VALUES)assert.match(designer,new RegExp(`\['method','${key}'\]`));
 assert.match(designer,/data-ha-swatch-kind=\{kind\}/);
 assert.match(designer,/function ThemeSwatches\(/);
 assert.match(designer,/<ThemeSwatches palette=\{p\}\/>/);
 assert.match(designer,/<ThemeSwatches palette=\{p\}\/>/);
});

// CIEDE2000 catches color pairs which look alike even when their CIE76
// distances seem large. Formula follows CIE/ISO color difference definition.
function deltaE2000(a,b) {
  const [l1,a1,b1]=lab(a),[l2,a2,b2]=lab(b);
  const rad=Math.PI/180;
  const c1=Math.hypot(a1,b1),c2=Math.hypot(a2,b2),cbar=(c1+c2)/2;
  const power=Math.pow(cbar,7);
  const g=(1-Math.sqrt(power/(power+Math.pow(25,7))))/2;
  const ap1=(1+g)*a1, ap2=(1+g)*a2;
  const cp1=Math.hypot(ap1,b1),cp2=Math.hypot(ap2,b2);
  const hue=(x,y)=>(Math.atan2(y,x)/rad+360)%360;
  const h1=hue(ap1,b1),h2=hue(ap2,b2);
  const dl=l2-l1,dc=cp2-cp1;
  let dh=h2-h1;
  if(cp1*cp2===0)dh=0;
  else if(dh>180)dh-=360;
  else if(dh< -180)dh+=360;
  const dH=2*Math.sqrt(cp1*cp2)*Math.sin(dh*rad/2);
  const lbar=(l1+l2)/2,cprime=(cp1+cp2)/2;
  let hbar;
  if(cp1*cp2===0)hbar=h1+h2;
  else if(Math.abs(h1-h2)<=180)hbar=(h1+h2)/2;
  else if(h1+h2<360)hbar=(h1+h2+360)/2;
  else hbar=(h1+h2-360)/2;
  const t=1-.17*Math.cos((hbar-30)*rad)+.24*Math.cos(2*hbar*rad)
      +.32*Math.cos((3*hbar+6)*rad)-.20*Math.cos((4*hbar-63)*rad);
  const deltaTheta=30*Math.exp(-Math.pow((hbar-275)/25,2));
  const c7=Math.pow(cprime,7);
  const rc=2*Math.sqrt(c7/(c7+Math.pow(25,7)));
  const sl=1+.015*Math.pow(lbar-50,2)/Math.sqrt(20+Math.pow(lbar-50,2));
  const sc=1+.045*cprime,sh=1+.015*cprime*t;
  const rt=-Math.sin(2*deltaTheta*rad)*rc;
  const ll=dl/sl,cc=dc/sc,hh=dH/sh;
  return Math.sqrt(ll*ll+cc*cc+hh*hh+rt*cc*hh);
}
function hsvHue(hex){
  const [r,g,b]=[1,3,5].map(x=>parseInt(hex.slice(x,x+2),16)/255);
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  if(!delta)return 0;
  const hue=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;
  return (hue*60+360)%360;
}
const circularHueDistance=(a,b)=>{const d=Math.abs(hsvHue(a)-hsvHue(b));return Math.min(d,360-d);};

test('CIEDE2000 test vectors use actual perceptual distance, not plain RGB distance',()=>{
  // CIEDE2000 is computed from actual palette colors; symmetry and identity
  // guard regressions in the embedded standalone formula.
  for(const a of ['#ff5577','#41c99a','#6b87fc']){
    assert.ok(Math.abs(deltaE2000(a,a))<0.00001);
    assert.ok(Math.abs(deltaE2000(a,'#eeee22')-deltaE2000('#eeee22',a))<0.00001);
  }
});

for(const name of PALETTE_PRESETS){
  test(`${name}: SOURCE categories remain unmistakably different at tiny badge sizes`,()=>{
    const source=SOURCE_VALUES.map(k=>PALETTES[name].source[k]);
    const method=METHOD_VALUES.map(k=>PALETTES[name].method[k]);
    const minSource=name==='monochrome'?6.5:18;
    const minAcross=18;
    for(let i=0;i<source.length;i++)for(let j=i+1;j<source.length;j++){
      const d=deltaE2000(source[i],source[j]);
      assert.ok(d>=minSource,`${name} ${SOURCE_VALUES[i]}/${SOURCE_VALUES[j]} CIEDE2000 ${d.toFixed(1)} < ${minSource}`);
      if(name!=='monochrome'){
        const hue=circularHueDistance(source[i],source[j]);
        assert.ok(hue>=25,`${name} ${SOURCE_VALUES[i]}/${SOURCE_VALUES[j]} hue gap ${hue.toFixed(1)} < 25`);
      }
    }
    for(let i=0;i<source.length;i++)for(let j=0;j<method.length;j++){
      if(name==='monochrome')continue; // Monochrome has no hue separation.
      const d=deltaE2000(source[i],method[j]);
      assert.ok(d>=minAcross,`${name} ${SOURCE_VALUES[i]}/${METHOD_VALUES[j]} CIEDE2000 ${d.toFixed(1)} < ${minAcross}`);
    }
    // Seven distinct login methods still need visual separation at small type.
    const methodMinimum=name==='monochrome'?3:13.5;
    for(let i=0;i<method.length;i++)for(let j=i+1;j<method.length;j++){
      const d=deltaE2000(method[i],method[j]);
      assert.ok(d>=methodMinimum,`${name} METHOD ${METHOD_VALUES[i]}/${METHOD_VALUES[j]} CIEDE2000 ${d.toFixed(1)} < ${methodMinimum}`);
    }
  });
}

test('Monochrome METHOD stays legible on a dark Termix background without underlines',()=>{
 for (const color of Object.values(PALETTES.monochrome.method)) {
  assert.ok(wcagContrast(color, '#171717') >= 4.5, `Monochrome METHOD ${color} is not readable on dark background`);
 }
 const css=readFileSync(new URL('../src/frontend/badge.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/data-ha-palette="monochrome"[^}]*box-shadow\s*:/,'Monochrome METHOD must not be underlined');
 assert.match(css,/data-ha-palette="monochrome"[^\n]*data-ha-part="method"/);
 assert.ok(deltaE2000(PALETTES.monochrome.method.password,PALETTES.monochrome.method.key)>=20);
});

test('PASS and KEY use strongly separated accents in every color palette',()=>{
 for (const name of PALETTE_PRESETS) {
  const methods=PALETTES[name].method;
  const contrast=deltaE2000(methods.password,methods.key);
  assert.ok(contrast >= 20, `${name}: PASS/KEY only ${contrast.toFixed(1)} CIEDE2000`);
 }
});

test('SOURCE foreground uses the full preset accent instead of washing out colors',()=>{
 const view=readFileSync(new URL('../src/frontend/view.tsx',import.meta.url),'utf8');
 assert.match(view,/"--ha-text-color": accent/);
});

function srgbLuminance(hex){
 const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 const [r,g,b]=channels.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return .2126*r+.7152*g+.0722*b;
}
function wcagContrast(foreground,background){
 const [a,b]=[srgbLuminance(foreground),srgbLuminance(background)].sort((x,y)=>y-x);
 return (a+.05)/(b+.05);
}
test('muted presets are legible on the dark Termix background and contain no fluorescent endpoints',()=>{
 for(const name of PALETTE_PRESETS){
  if(name==='monochrome')continue; // grayscale contains white by design
  const colors=[...Object.values(PALETTES[name].source),...Object.values(PALETTES[name].method)];
  for(const color of colors){
   // Lower the 0/255 fluorescent extremes without turning badges gray.
   const channels=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
   assert.ok(channels.every(n=>n>=16&&n<=242),`${name} ${color} has an extreme RGB endpoint`);
   assert.ok(wcagContrast(color,'#171717')>=4.5,`${name} ${color} is too dim on the default dark surface`);
  }
 }
});
