import {useEffect,useState,type FormEvent} from 'react'
import {Card} from './Surface'
import {Button} from './Button'
import {FormField,SelectField,Toggle} from './Fields'
import {PhoneInput} from './PhoneInput'
import {isValidPhone} from './phone'
import {supabase} from './lib/supabase'
import {tr,trError,useUiLanguage,languageOptions} from './i18n'
import type {Role} from './types'
const initial={enabled:false,recipient:'',preorder:true,catalogue:true,include_summary:true,include_contact:false,language:'en'}
export function WhatsAppOrderSettings({role}:{role:Role}){
 useUiLanguage();const[p,setP]=useState(initial),[consent,setConsent]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{let live=true;if(role==='admin')void supabase?.rpc('get_whatsapp_order_preferences').then(r=>{if(!live)return;if(r.error)setMessage(trError(r.error.message));else{if(r.data)setP(Object.fromEntries(Object.keys(initial).map(k=>[k,r.data[k]])) as typeof initial);setReady(true)}});return()=>{live=false}},[role])
 if(role!=='admin')return null
 async function save(e:FormEvent){e.preventDefault();if(!supabase||busy)return;if(p.recipient&&!isValidPhone(p.recipient)){setMessage(tr('Invalid Phone Number'));return}if(p.enabled&&!consent){setMessage(tr('Recipient consent is required'));return}setBusy(true);try{const r=await supabase.rpc('save_whatsapp_order_preferences',{p_values:p,p_consent:consent});if(r.error)throw r.error;setMessage(tr('Saved.'));setConsent(false)}catch(e){setMessage(trError((e as Error).message))}finally{setBusy(false)}}
 return <Card className="panel whatsapp-alert-settings"><h2>{tr('WhatsApp Order Alerts')}</h2><p>{tr('Automatic WhatsApp alerts require Meta setup and an approved template. Saving preferences does not send a message.')}</p><form onSubmit={e=>void save(e)}><Toggle label={tr('Enable WhatsApp order alerts')} checked={p.enabled} onChange={e=>setP({...p,enabled:e.target.checked})}/><FormField label={tr('Notification Recipient')}><PhoneInput required={p.enabled} value={p.recipient} onChange={recipient=>{setP({...p,recipient});setConsent(false)}}/></FormField>{([['preorder','New Pre-Order alerts'],['catalogue','New Catalogue order alerts'],['include_summary','Include order summary'],['include_contact','Include customer contact']] as const).map(([key,label])=><Toggle key={key} label={tr(label)} checked={p[key]} onChange={e=>setP({...p,[key]:e.target.checked})}/>)}<FormField label={tr('Notification language')}><SelectField value={p.language} onChange={e=>setP({...p,language:e.target.value})}>{languageOptions.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}</SelectField></FormField><Toggle label={tr('I confirm the recipient has opted in to these business order alerts.')} checked={consent} onChange={e=>setConsent(e.target.checked)}/><Button type="submit" variant="primary" disabled={!ready||busy||p.enabled&&!consent}>{tr('Save preferences')}</Button>{message&&<p role="status">{message}</p>}</form></Card>
}
