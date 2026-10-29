import {lazy,Suspense,useEffect,useRef,useState} from 'react'
import {Button} from './Button'
import {FormField,InputField,TextAreaField} from './Fields'
import {supabase} from './lib/supabase'
import {tr,trError,useUiLanguage} from './i18n'
import {isValidPhone,normalizePhone} from './phone'
import {randomId} from './id'
import {useDialogFocus} from './useDialogFocus'
import {navigateRoute} from './appNavigation'
import './customerRecognition.css'

const History=lazy(()=>import('./CommercialOperations').then(m=>({default:m.CustomerOrderHistory})))
type Candidate={id:string;name:string;phone:string|null;active:boolean}
type Recognition={request_id:string;status:string;revision:number;linked:Candidate|null;phone:string|null;submitted_phone:string|null;submitted_name:string;candidates:Candidate[];candidate_count:number;review:Candidate[];can_create:boolean;closed:boolean;confirmed_at?:string}
export function CustomerRecognition({requestId,orderId,role,onChanged}:{requestId?:string;orderId?:string;role:string;onChanged?:()=>void}){
 useUiLanguage()
 const[data,setData]=useState<Recognition|null>(null),[open,setOpen]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 const permitted=['admin','cashier'].includes(role)
 async function load(){if(!supabase||!permitted)return;try{const r=orderId?await supabase.rpc('get_order_customer_recognition',{p_order:orderId}):await supabase.rpc('get_customer_recognition',{p_request:requestId});if(r.error)throw r.error;setData(r.data);setError('')}catch(e){setError(trError((e as Error).message))}}
 useEffect(()=>{setData(null);setError('');if(permitted)void load()},[requestId,orderId,permitted])
 if(!permitted)return null
 if(!data&&!error)return null
 return <section className="customer-recognition"><strong>{tr('Customer Recognition')}</strong><span className="badge">{tr(data?.status??'Customer Match Requires Review')}</span>{data?.linked&&<span>{data.linked.name}</span>}
 {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 <Button onClick={()=>{if(data){setOpen(true);setMessage('')}else void load()}}>{tr(data?'Review Match':'Refresh')}</Button>
 {open&&data&&<ReviewMatch initial={data} role={role} onClose={()=>setOpen(false)} onSaved={next=>{setData(next);onChanged?.();setMessage(tr(next.status==='Linked Customer'?'Customer Linked Successfully':'Guest Customer'));setOpen(false)}}/>}</section>
}
function ReviewMatch({initial,role,onClose,onSaved}:{initial:Recognition;role:string;onClose:()=>void;onSaved:(data:Recognition)=>void}){
 const[data,setData]=useState(initial),[selected,setSelected]=useState(initial.linked?.id??''),[query,setQuery]=useState(''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[history,setHistory]=useState<Candidate|null>(null)
 const operation=useRef<{signature:string;key:string}|null>(null),ref=useDialogFocus(()=>{if(!busy)onClose()})
 const candidates=Array.from(new Map([...data.candidates,...data.review,...(data.linked?[data.linked]:[])].map(c=>[c.id,c])).values())
 const chosen=candidates.find(c=>c.id===selected),validPhone=!!data.phone&&isValidPhone(normalizePhone(data.phone))
 async function refresh(){if(!supabase)return;setBusy(true);setError('');try{const r=await supabase.rpc('get_customer_recognition',{p_request:data.request_id,p_query:query});if(r.error)throw r.error;setData(r.data);setConfirmed(false)}catch(e){setError(trError((e as Error).message))}finally{setBusy(false)}}
 async function resolve(action:'link'|'guest'|'create'){
  if(!supabase||busy)return;setBusy(true);setError('')
  const args={p_request:data.request_id,p_revision:data.revision,p_action:action,p_customer:action==='link'?selected:null,p_reason:reason.trim()};const signature=JSON.stringify(args)
  if(operation.current?.signature!==signature)operation.current={signature,key:randomId()}
  try{const r=await supabase.rpc('resolve_customer_recognition',{...args,p_operation:operation.current!.key});if(r.error)throw r.error;onSaved(r.data)}catch(e){setError(trError((e as Error).message))}finally{setBusy(false)}
 }
 async function restore(id:string){if(!supabase||busy||!confirm(tr('Restore Customer')+'?'))return;setBusy(true);setError('');try{const r=await supabase.rpc('restore_archived_customer',{p_id:id});if(r.error)throw r.error;await refresh()}catch(e){setError(trError((e as Error).message))}finally{setBusy(false)}}
 const ready=!busy&&!data.closed&&reason.trim().length>=5
 return <div className="modal-backdrop"><section className="modal recognition-dialog" ref={ref} role="dialog" aria-modal="true" aria-label={tr('Review Match')}><h2>{tr('Review Match')}</h2>
 <p><strong>{data.submitted_name}</strong><br/>{data.submitted_phone??tr('Unmatched')}</p><p>{tr('A phone match is not proof of identity. Confirm with the customer before linking.')}</p>
 <span className="badge">{tr(data.status)}</span>{data.confirmed_at&&<p>{tr('Staff-confirmed association')} · {new Date(data.confirmed_at).toLocaleString()}</p>}
 <form className="recognition-search" onSubmit={e=>{e.preventDefault();void refresh()}}><FormField label={tr('Search Customer List')}><InputField value={query} maxLength={100} onChange={e=>setQuery(e.target.value)} placeholder={tr('Name, Customer ID or international phone')}/></FormField><Button type="submit" disabled={busy}>{tr('Search')}</Button></form>
 <p>{tr('Historical numbers without a reliable country code require staff review.')}</p>
 <div className="recognition-candidates">{candidates.map(c=><article key={c.id}><label><InputField type="radio" name="recognized-customer" checked={selected===c.id} disabled={busy||!c.active||data.closed} onChange={()=>{setSelected(c.id);setConfirmed(false)}}/><span><strong>{c.name}</strong><span>{c.phone||'—'}</span><small>{tr(c.active?'Active':'Archived Customer')}</small></span></label><div className="recognition-actions"><Button disabled={busy} onClick={()=>setHistory(c)}>{tr('View Customer History')}</Button>{!c.active&&role==='admin'&&<Button disabled={busy} onClick={()=>void restore(c.id)}>{tr('Restore Customer')}</Button>}</div></article>)}</div>
 {data.candidate_count>100&&<p>{tr('More matches exist. Search by Customer ID to narrow the results.')}</p>}
 {!candidates.length&&<p>{tr('New / Guest Customer')}</p>}
 <FormField label={tr('Confirmation reason')}><TextAreaField value={reason} disabled={busy||data.closed} minLength={5} maxLength={500} onChange={e=>setReason(e.target.value)}/></FormField>
 <FormField className="recognition-confirmation"><InputField type="checkbox" checked={confirmed} disabled={busy||data.closed} onChange={e=>setConfirmed(e.target.checked)}/><span>{tr('I confirmed the correct customer association with the customer.')}</span></FormField>
 {data.closed&&<p>{tr('Paid or closed orders cannot be relinked')}</p>}{error&&<p role="alert">{error}</p>}
 <div className="recognition-actions recognition-footer"><Button data-back-close="true" disabled={busy} onClick={onClose}>{tr('Cancel')}</Button><Button disabled={!ready} onClick={()=>void resolve('guest')}>{tr('Leave as Guest')}</Button><Button variant="primary" disabled={!ready||!confirmed||!chosen?.active} onClick={()=>void resolve('link')}>{tr('Confirm Customer Link')}</Button>{data.can_create&&<Button disabled={!ready||!confirmed||!validPhone} onClick={()=>void resolve('create')}>{tr('Create Customer')}</Button>}</div>
 {history&&<Suspense fallback={<p>{tr('Loading…')}</p>}><History customerId={history.id} name={history.name} onClose={()=>setHistory(null)} onOrders={()=>navigateRoute('/scheduled-orders')} onSales={()=>navigateRoute('/sales')}/></Suspense>}
 </section></div>
}
