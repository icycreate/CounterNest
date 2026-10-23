import {ContactMethodIcon} from './ContactMethodIcon'
import {isValidPhone} from './phone'
import {useDialogFocus} from './useDialogFocus'
import {useEffect,useState} from 'react'
import {Card} from './Surface'
import {Button} from './Button'
import {FormField,InputField,SelectField,Toggle} from './Fields'
import {PhoneInput} from './PhoneInput'
import {tr,trError} from './i18n'
import {supabase} from './lib/supabase'
import type {Role} from './types'
export type BusinessContact={kind:string;label:string;value:string;enabled:boolean;note:string;qr:string;sort:number;preferred:boolean}
const kinds=['whatsapp','phone','sms','email','messenger','line','wechat','other'];
const contactLabel=(kind:string)=>tr(({whatsapp:'WhatsApp',phone:'Phone',sms:'SMS',email:'Email',messenger:'Messenger',line:'LINE',wechat:'WeChat',other:'Other'} as Record<string,string>)[kind]??'Other');
export function contactHref(c:BusinessContact){
 const v=c.value.trim();
 if(['phone','sms','whatsapp'].includes(c.kind)){if(!isValidPhone(v))return '';return c.kind==='whatsapp'?'https://wa.me/'+v.slice(1):(c.kind==='phone'?'tel:':'sms:')+v}
 if(c.kind==='email')return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?'mailto:'+encodeURIComponent(v):'';
 try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}
}
export function BusinessContacts({contacts,sheet=false}:{contacts:BusinessContact[];sheet?:boolean}){
 const[open,setOpen]=useState(false);const visible=contacts.filter(c=>c.enabled&&c.value.trim()).sort((a,b)=>Number(b.preferred)-Number(a.preferred)||a.sort-b.sort);
 if(!visible.length)return null;
 return <Card className="panel business-contacts"><h2>{tr('Contact Business')}</h2><div className="business-contact-icons">{visible.map((c,i)=>{const label=contactLabel(c.kind),href=contactHref(c);const content=<><ContactMethodIcon kind={c.kind}/><span>{label}</span><small className="contact-tooltip" role="tooltip">{label}</small></>;return href?<a key={i} className="business-contact-icon" aria-label={label} href={href} target="_blank" rel="noopener noreferrer">{content}</a>:<Button key={i} className="business-contact-icon" aria-label={label} onClick={()=>setOpen(true)}>{content}</Button>})}</div>{open&&<ContactPanel sheet={sheet} close={()=>setOpen(false)}><h3>{tr('Customer Contact')}</h3><div className="contact-public-list">{visible.filter(c=>!contactHref(c)).map((c,i)=><article key={i}><strong>{c.label||contactLabel(c.kind)}</strong><p>{c.value}</p>{c.note&&<p>{c.note}</p>}{/^https:\/\//.test(c.qr)&&<img loading="lazy" referrerPolicy="no-referrer" width="140" height="140" style={{objectFit:'contain'}} src={c.qr} alt={c.label||contactLabel(c.kind)}/>}</article>)}</div></ContactPanel>}</Card>
}
function ContactPanel({sheet,close,children}:{sheet:boolean;close:()=>void;children:import('react').ReactNode}){const ref=useDialogFocus(close);return sheet?<div className="modal-backdrop store-contact-backdrop"><section ref={ref} className="modal store-contact-sheet" role="dialog" aria-modal="true" aria-label={tr('Customer Contact')}><Button data-back-close="true" onClick={close}>{tr('Close')}</Button>{children}</section></div>:<section aria-label={tr('Customer Contact')}>{children}</section>}
export function BusinessContactSettings({role}:{role:Role}){
 const[contacts,setContacts]=useState<BusinessContact[]>([]),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let live=true;if(role==='admin')void supabase?.rpc('ensure_customer_display_config').then(r=>{if(!live)return;if(r.error)setMessage(r.error.message);else{setContacts(r.data.business_contacts??[]);setLoaded(true)}});return()=>{live=false}},[role]);
 if(role!=='admin')return null;
 const update=(i:number,patch:Partial<BusinessContact>)=>setContacts(old=>old.map((c,n)=>n===i?{...c,...patch}:patch.preferred?{...c,preferred:false}:c));
 async function save(){setBusy(true);try{if(contacts.some(c=>c.enabled&&['phone','sms','whatsapp','email','messenger','line','other'].includes(c.kind)&&!contactHref(c)))throw new Error(tr('Enter a valid international phone, email or HTTPS address.'));const r=await supabase!.rpc('save_business_contacts',{p_contacts:contacts});if(r.error)throw r.error;setMessage(tr('Saved.'));window.dispatchEvent(new CustomEvent('counternest:form-saved',{detail:document.getElementById('business-public-contacts')}))}catch(e){setMessage(trError((e as Error).message))}finally{setBusy(false)}}
 return <Card className="panel" id="business-public-contacts" data-unsaved-scope="public-contacts"><h2>{tr('Customer Contact Methods')}</h2><p>{tr('Only these enabled business contacts are public. Staff details are never copied automatically.')}</p>{contacts.map((c,i)=><fieldset key={i} className="contact-edit"><legend>{c.label||tr('Contact method')}</legend><Toggle label={tr('Enabled')} checked={c.enabled} onChange={e=>update(i,{enabled:e.target.checked})}/><div className="form-grid"><FormField label={tr('Contact method')}><SelectField value={c.kind} onChange={e=>update(i,{kind:e.target.value,value:''})}>{kinds.map(k=><option key={k} value={k}>{contactLabel(k)}</option>)}</SelectField></FormField><FormField label={tr('Label')}><InputField maxLength={80} value={c.label} onChange={e=>update(i,{label:e.target.value})}/></FormField><FormField label={tr('Contact value')}>{['phone','sms','whatsapp'].includes(c.kind)?<PhoneInput value={c.value} onChange={value=>update(i,{value})}/>:<InputField value={c.value} maxLength={500} onChange={e=>update(i,{value:e.target.value})}/>}</FormField><FormField label={tr('Short note')}><InputField value={c.note} maxLength={250} onChange={e=>update(i,{note:e.target.value})}/></FormField><FormField label={tr('QR image URL (optional)')}><InputField type="url" value={c.qr} onChange={e=>update(i,{qr:e.target.value})}/></FormField><FormField label={tr('Sort order')}><InputField type="number" value={c.sort} onChange={e=>update(i,{sort:Number(e.target.value)})}/></FormField></div><Toggle label={tr('Preferred')} checked={c.preferred} onChange={e=>update(i,{preferred:e.target.checked})}/><Button variant="danger" onClick={()=>setContacts(old=>old.filter((_,n)=>i!==n))}>{tr('Remove')}</Button></fieldset>)}<div className="report-actions"><Button disabled={!loaded||contacts.length>=20} onClick={()=>setContacts(old=>[...old,{kind:'whatsapp',label:'',value:'',enabled:false,note:'',qr:'',sort:old.length,preferred:false}])}>{tr('Add contact method')}</Button><Button variant="primary" disabled={!loaded||busy} onClick={()=>void save()}>{tr('Save Changes')}</Button></div>{message&&<p role="status">{message}</p>}</Card>
}
