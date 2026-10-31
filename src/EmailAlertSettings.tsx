import {useEffect,useRef,useState} from 'react'
import {Button} from './Button'
import {Card} from './Surface'
import {Toggle} from './Fields'
import {supabase} from './lib/supabase'
import {tr,useUiLanguage,getUiLocale} from './i18n'
import {randomId} from './id'
import type {Role} from './types'
type EmailSettings={configured:boolean;recipient:string;enabled:boolean;new_preorder:boolean;revision:number;last_test?:{state:string;created_at:string};recent:{id:string;kind:string;state:string;attempts:number;created_at:string}[]}
const states:Record<string,string>={pending:'Queued',processing:'Processing',retry:'Retry scheduled',submitted:'Submitted to email provider',failed:'Email failed',unknown:'Email needs reconciliation',cancelled:'Cancelled'}
export function EmailAlertSettings({role}:{role:Role}){
 useUiLanguage();const[data,setData]=useState<EmailSettings|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);const key=useRef<string|null>(null),mounted=useRef(true)
 const dirty=useRef(false)
 async function load(){if(!supabase)return;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await supabase.rpc('get_preorder_email_settings').abortSignal(controller.signal);if(r.error)throw r.error;if(mounted.current){setData(previous=>dirty.current&&previous?{...r.data,enabled:previous.enabled,new_preorder:previous.new_preorder,revision:previous.revision}:r.data);setFailed(false)}}catch{if(mounted.current){setFailed(true);setMessage('Email settings could not be loaded.')}}finally{clearTimeout(timer)}}
 useEffect(()=>{mounted.current=true;if(role==='admin')void load();return()=>{mounted.current=false}},[role])
 useEffect(()=>{if(!['pending','processing','retry'].includes(data?.last_test?.state??''))return;const timer=setInterval(()=>{if(document.visibilityState==='visible')void load()},10000);return()=>clearInterval(timer)},[data?.last_test?.state])
 if(role!=='admin')return null
 async function save(){if(!supabase||!data||busy)return;setBusy(true);setMessage('');try{const r=await supabase.rpc('save_preorder_email_settings',{p_revision:data.revision,p_enabled:data.enabled,p_new_preorder:data.new_preorder});if(r.error)throw r.error;dirty.current=false;setData(r.data);setMessage('Email preferences saved.')}catch{setMessage('Email settings changed or could not be saved. Reload and retry.')}finally{setBusy(false)}}
 async function test(){if(!supabase||busy)return;key.current??=randomId();setBusy(true);setMessage('');try{const r=await supabase.rpc('request_preorder_test_email',{p_key:key.current});if(r.error)throw r.error;key.current=null;setMessage('Test email queued. Check the result below.');await supabase.functions.invoke('preorder-email-admin',{body:{job_id:r.data}});await load()}catch(e){setMessage((e as Error).message==='Email test limit reached. Try again later.'?'Email test limit reached. Try again later.':'Test email could not be queued. Retry safely.')}finally{setBusy(false)}}
 async function recover(){if(!supabase||busy)return;setBusy(true);try{const result=await supabase.functions.invoke('preorder-email-admin',{body:{}});if(result.error)throw result.error;await load()}catch{setMessage('Email processing could not be started. The saved order is safe.')}finally{setBusy(false)}}
 return <Card className="panel email-alert-settings"><h2>{tr('Email Alerts')}</h2><p>{tr('Automatic pre-order emails are sent by the server. Closing the catalogue does not cancel them.')}</p><p>{tr('Disabling email cancels unsent alerts. An email already handed to the provider cannot be recalled.')}</p>
 {failed&&<p role="alert">{tr('Email settings could not be loaded.')}</p>}
 {data&&<><p><strong>{tr('Configured recipient')}</strong><br/><span className="email-recipient">{data.recipient||tr('Not configured')}</span></p><p>{tr(data.configured?'Recipient configured. Worker and provider setup are required.':'Ask the administrator to provision an authorized recipient for this company.')}</p>
 <fieldset disabled={busy||!data.configured}><legend>{tr('New Pre-order Email Notifications')}</legend><Toggle label={tr('Enable email notifications')} checked={data.enabled} onChange={e=>{dirty.current=true;setData({...data,enabled:e.target.checked})}}/><Toggle label={tr('Email new pre-orders')} checked={data.new_preorder} onChange={e=>{dirty.current=true;setData({...data,new_preorder:e.target.checked})}}/><div className="report-actions"><Button variant="primary" onClick={()=>void save()}>{tr('Save preferences')}</Button><Button disabled={dirty.current||!data.enabled} onClick={()=>void test()}>{tr('Send Test Email')}</Button></div></fieldset>
 <p>{tr('Test emails are limited to one every two minutes and five per day per company.')}</p>
 {data.last_test&&<p role="status">{tr('Last email test')}: {tr(states[data.last_test.state]??'Email needs reconciliation')} · {new Date(data.last_test.created_at).toLocaleString(getUiLocale())}</p>}
 <p className="muted">{tr('Submitted to provider does not confirm inbox delivery.')}</p>
 {data.recent?.length>0&&<details><summary>{tr('Recent email attempts')}</summary><ul>{data.recent.map(j=><li key={j.id}>{new Date(j.created_at).toLocaleString(getUiLocale())} · {tr(j.kind==='test'?'Test email':'New Pre-order')} · {tr(states[j.state]??'Email needs reconciliation')} ({j.attempts})</li>)}</ul></details>}</>}
 {data?.configured&&<Button disabled={busy||dirty.current||!data.enabled} onClick={()=>void recover()}>{tr('Retry pending emails')}</Button>}<Button disabled={busy} onClick={()=>{dirty.current=false;void load()}}>{tr('Refresh')}</Button>{message&&<p role="status">{tr(message)}</p>}</Card>
}
