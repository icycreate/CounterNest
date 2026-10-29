import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'
import {Button} from './Button'
import {tr,trError} from './i18n'
import {contactHref,contactLabel} from './customerLinks'
import {AcceptRequest,DeclineRequest,type Request} from './CataloguePreorders'
import {formatMoney} from './CommercialCatalogue'
import {systemLabel} from './systemLabels'

export function IncomingOrder({id,onDismiss,onAcknowledge,onOpen}:{id:string;onDismiss:()=>void;onAcknowledge:()=>void;onOpen:()=>void}){
 const [request,setRequest]=useState<Request|null>(null),[error,setError]=useState(''),[action,setAction]=useState<'accept'|'decline'|null>(null)
 const [contact,setContact]=useState<{method:string;destination:string;message:string}|null>(null)
 async function load(){const r=await supabase!.rpc('get_order_request_detail',{p_id:id});if(r.error){setRequest(null);setError(trError(r.error.message))}else{setRequest(r.data);setError('')}}
 useEffect(()=>{let active=true;void supabase?.rpc('get_order_request_detail',{p_id:id}).then(r=>{if(!active)return;if(r.error)setError(trError(r.error.message));else setRequest(r.data)});return()=>{active=false}},[id])
 async function prepare(){if(!request)return;const r=await supabase!.rpc('prepare_catalogue_contact',{p_id:id,p_method:request.preferred_method,p_override_reason:null,p_override_destination:null});if(r.error)setError(trError(r.error.message));else setContact(r.data)}
 const snapshot=request?.submission_snapshot,currency=snapshot?.currency||request?.currency||'BZD'
 const lines=snapshot?.items??request?.summary??[]
 const money=(n:number)=>formatMoney(Number(n),currency)
 return <aside className="incoming-order" aria-label={tr('Incoming order')}>
  <div className="panel-title"><h2>{tr('Incoming order')} {request?'#'+request.request_number:''}</h2><Button onClick={onDismiss}>{tr('View later')}</Button></div>
  {error&&<p role="alert">{error}</p>}{!request&&!error&&<p role="status">{tr('Loading…')}</p>}
  {request&&<><p><strong>{request.customer_name}</strong> · {systemLabel(request.status)}</p><p>{contactLabel(request.preferred_method)} · {request.contact_value}</p>{snapshot?.phone&&<p>{tr('Phone number')}: {snapshot.phone}</p>}
  <small>{new Date(snapshot?.submitted_at??request.created_at).toLocaleString()}</small>
  <div className="incoming-order-lines">{lines.map((line,index)=><div key={index}><strong>{line.name}</strong>{line.variant&&<span>{line.variant}</span>}{line.option_label&&<span>{line.option_label}</span>}<span>{line.qty} × {money(line.unit_price)} = {money(line.line_total??line.qty*line.unit_price)}</span></div>)}</div>
  <p>{tr('Estimated subtotal:')} {money(snapshot?.subtotal??request.estimated_subtotal)}</p>{snapshot&&<p><strong>{tr('Estimated total')}: {money(snapshot.total)}</strong></p>}
  {snapshot?.requested_fulfillment_at&&<p>{tr('Requested pickup time (optional)')}: {new Date(snapshot.requested_fulfillment_at).toLocaleString()} · {tr('Awaiting staff confirmation')}</p>}
  {(snapshot?.notes||request.customer_note)&&<p className="incoming-order-note">{tr('Customer notes')}: {snapshot?.notes??request.customer_note}</p>}
  {contact&&<div className="info-box"><p>{tr('No message has been sent. Review the prepared message before opening the contact platform.')}</p><p>{contact.destination}</p><p>{contact.message}</p>{contactHref(contact.method,contact.destination,contact.message)?<a href={contactHref(contact.method,contact.destination,contact.message)} target="_blank" rel="noopener noreferrer">{tr('Open')} {contactLabel(contact.method)}</a>:<Button onClick={()=>void navigator.clipboard.writeText(contact.message).catch(()=>setError(tr('Select and copy the message manually.')))}>{tr('Copy Prepared Message')}</Button>}</div>}
  <div className="report-actions"><Button onClick={()=>void prepare()}>{tr('Contact')}</Button>{!request.scheduled_order_id&&!['declined','cancelled','collected','no_response'].includes(request.status)&&<><Button variant="primary" onClick={()=>setAction('accept')}>{tr('Accept Order')}</Button><Button variant="danger" onClick={()=>setAction('decline')}>{tr('Decline Order')}</Button></>}<Button onClick={onOpen}>{tr('Open record')}</Button><Button onClick={onAcknowledge}>{tr('Acknowledge')}</Button></div></>}
  {action==='accept'&&request&&<AcceptRequest request={request} onClose={()=>setAction(null)} onAccepted={async()=>{setAction(null);await load();window.dispatchEvent(new Event('counternest:workspace-refresh'))}}/>}
  {action==='decline'&&request&&<DeclineRequest request={request} onClose={()=>setAction(null)} onDeclined={async()=>{setAction(null);await load();window.dispatchEvent(new Event('counternest:workspace-refresh'))}}/>}
 </aside>
}
