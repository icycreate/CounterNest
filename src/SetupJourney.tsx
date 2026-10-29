import {saveRegisteredDrafts} from './appNavigation'
import {SetupPreferences} from './SetupPreferences'
import {useEffect,useState} from 'react'
import {Button} from './Button'
import {Card} from './Surface'
import {BrandLogo} from './BrandLogo'
import {CatalogueSettingsEditors} from './CatalogueContentEditors'
import {tr,trError,useUiLanguage} from './i18n'
import {supabase} from './lib/supabase'
import type {PageKey} from './types'

const stages=[
 {title:'Welcome to CounterNest',body:'Set up your profile, products and public catalogue. Optional steps can be completed later.',key:null,page:null},
 {title:'Business Profile',body:'Review your business name, contact details, logo, currency, timezone and language in Settings.',key:'profile',page:'settings'},
 {title:'Catalogue Setup',body:'Create a category and your first product using Products. Add its description, price and photograph; use existing stock controls.',key:'catalogue',page:'products'},
 {title:'Business Presentation',body:'Home Page, Categories and About Us have separate drafts and publication controls.',key:'presentation',page:null},
 {title:'Payment Configuration',body:'Cash, Card and QR use the existing checkout. Card and QR confirmation does not charge an external provider. Review your terminal before trading.',key:'payments',page:'hardware'},
 {title:'Staff and Permissions',body:'Add staff using the existing Staff screen. Review Permission Presets before granting access. This step is optional for a sole owner.',key:'staff',page:'staff'},
 {title:'Review & Finish',body:'Review the checklist. Optional steps may remain unfinished; completing this guide never publishes content or creates a sale.',key:null,page:null}
] as const
type State={step:number;reviewed:string[];finished:boolean;revision:number;checks:Record<string,boolean>}
export function SetupJourney({onNavigate}:{onNavigate:(p:PageKey)=>void}){
 useUiLanguage();const[data,setData]=useState<State|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function load(){setError('');const r=await supabase?.rpc('business_setup_state');if(r?.error)setError(r.error.message);else if(r?.data)setData(r.data)}
 useEffect(()=>{void load()},[])
 async function save(step:number,review:string|null=null,finish=false,exit=false){if(!data||!supabase||busy)return false;setBusy(true);setError('');try{if((step!==data.step||exit||finish)&&!await saveRegisteredDrafts())throw Error('Draft could not be saved. Stay here and resolve the error.');const r=await supabase.rpc('business_setup_state',{p_step:step,p_review:review,p_finish:finish,p_revision:data.revision});if(r.error)throw r.error;setData(r.data);if(exit||finish)onNavigate('dashboard');return true}catch(e){setError((e as Error).message);return false}finally{setBusy(false)}}
 const stage=stages[data?.step??0]
 return <Card className="panel setup-journey"><BrandLogo mode="platform" variant="horizontal" size={180}/><h2>{tr('Business Setup')}</h2>{error&&<p role="alert">{trError(error)}</p>}{!data?<Button onClick={()=>void load()}>{tr('Reload')}</Button>:<><progress aria-label={tr('Setup progress')} value={data.step+1} max={7}/><p>{data.step+1} / 7 · {tr(data.finished?'Completed':'Setup in progress')}</p><nav className="report-actions" aria-label={tr('Setup steps')}>{stages.map((s,i)=><Button key={s.title} disabled={busy} aria-current={i===data.step?'step':undefined} onClick={()=>void save(i)}>{i+1}. {tr(s.title)}</Button>)}</nav><h3>{tr(stage.title)}</h3><p>{tr(stage.body)}</p>{stage.page&&<Button disabled={busy} onClick={async()=>{if(await save(data.step))onNavigate(stage.page!)}}>{tr('Open')} {tr(stage.title)}</Button>}{(data.step===1||data.step===4)&&<SetupPreferences/>}{data.step===3&&<CatalogueSettingsEditors/>}{data.step===6&&<ul>{Object.entries(data.checks).map(([k,v])=><li key={k}>{tr(({profile:'Business Profile',logo:'Business logo',category:'First category',product:'First product'} as Record<string,string>)[k])}: {tr(v?'Completed':'Optional / pending')}</li>)}{['presentation','payments','staff'].map(k=><li key={k}>{tr(({presentation:'Business Presentation',payments:'Payment Configuration',staff:'Staff and Permissions'} as Record<string,string>)[k])}: {tr(data.reviewed.includes(k)?'Reviewed':'Optional / pending')}</li>)}</ul>}<div className="report-actions"><Button disabled={busy||data.step===0} onClick={()=>void save(data.step-1)}>{tr('Back')}</Button><Button disabled={busy} onClick={()=>void save(data.step,null,false,true)}>{tr('Save & Exit')}</Button>{data.step<6?<Button variant="primary" disabled={busy} onClick={()=>void save(data.step+1,stage.key)}>{tr('Continue')}</Button>:<Button variant="primary" disabled={busy||!data.checks.profile} onClick={()=>void save(6,null,true)}>{tr('Finish setup')}</Button>}</div><p className="muted">{tr('Reopen Workspace → Business Setup to resume. Opening a step does not mark it complete.')}</p></>}</Card>
}
