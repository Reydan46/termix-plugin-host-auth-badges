import { useTranslation } from '@termix-ssh/plugin-sdk/frontend';
import { AuthBadgeView } from './view';
import type { DisplayPreferences } from './preferences';
import type { AuthInfo } from './classify';

const PREVIEW_HOSTS: readonly {name:string; info:AuthInfo}[] = [
  {name:'server-01',info:{source:'credential',method:'key',uncertain:false,reason:'preview'}},
  {name:'server-02',info:{source:'credential',method:'password',uncertain:false,reason:'preview'}},
  {name:'workstation-01',info:{source:'host',method:'key',uncertain:false,reason:'preview'}},
  {name:'nas-01',info:{source:'host',method:'password',uncertain:false,reason:'preview'}},
  {name:'database-01',info:{source:'credential',method:'both',uncertain:false,reason:'preview'}},
  {name:'gateway-01',info:{source:'host',method:'agent',uncertain:false,reason:'preview'}},
  {name:'service-01',info:{source:'plugin',method:'custom',uncertain:false,reason:'preview'}},
  {name:'test-server',info:{source:'host',method:'none',uncertain:false,reason:'preview'}},
  {name:'unknown-host',info:{source:'unknown',method:'unknown',uncertain:true,reason:'preview'}},
];

/** Renders every synthetic example host with the shared host-row renderer. */
export function BadgePreview({preferences}: {preferences: DisplayPreferences}) {
  const {t}=useTranslation();
  // Preview shares the exact host-row renderer, but intentionally ignores Enabled.
  const demoPrefs = { ...preferences, enabled: true };
  return <div className="ha-preview" data-host-auth-preview-panel="">
    <div className="ha-preview-grid">{PREVIEW_HOSTS.map(sample=><div className="ha-preview-case" key={sample.name}>
      {preferences.position==='before' && <AuthBadgeView info={sample.info} preferences={demoPrefs} t={t} preview/>}
      <span className="ha-preview-name">{sample.name}</span>
      {preferences.position==='after' && <AuthBadgeView info={sample.info} preferences={demoPrefs} t={t} preview/>}
    </div>)}</div>
  </div>;
}

export function LayoutSample({prefs,style}:{prefs:DisplayPreferences;style:DisplayPreferences['layoutVariant']}){
  const {t}=useTranslation();
  const example=PREVIEW_HOSTS[0]!;
  return <span className="ha-layout-sample"><AuthBadgeView info={example.info} preferences={{...prefs,enabled:true,layoutVariant:style}} t={t} preview/></span>;
}
