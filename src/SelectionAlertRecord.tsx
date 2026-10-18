import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'
import {Card} from './Surface'
import {tr,trError} from './i18n'
import {systemLabel} from './systemLabels'
/** Exact original record projection. Existing RLS enforces same-shop customer-service access. */
export function SelectionAlertRecord(){
 const[id,setId]=useState(()=>new URLSearchParams(location.search).get('request')??''),[record,setRecord]=useState<any>(null),[message,setMessage]=useState('');
 useEffect(()=>{const route=()=>setId(new URLSearchParams(location.search).get('request')??'');window.addEventListener('counternest:route',route);return()=>window.removeEventListener('counternest:route',route)},[]);
 useEffect(()=>{let live=true;setRecord(null);setMessage('');if(!id||!supabase)return;const load=async()=>{const r=await supabase!.from('customer_selection_requests').select('id,request_number,target_station_label,customer_note,status,customer_selection_items(product_name_snapshot,quantity,unit_price_snapshot)').eq('id',id).maybeSingle();if(!live)return;if(r.error)setMessage(trError(r.error.message));else{setRecord(r.data);setMessage(r.data?'':tr('Request unavailable'))}};void load();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load()},15000);return()=>{live=false;window.clearInterval(timer)}},[id]);
 if(!id)return null;
 return <Card className="panel"><h2>{tr('Catalogue Request')}{record?' #'+record.request_number:''}</h2>{message&&<p role="alert">{message}</p>}{record?<><p>{tr('Station')}: <strong>{record.target_station_label}</strong> · {systemLabel(record.status)}</p><p>{record.customer_note}</p>{(record.customer_selection_items??[]).map((item:any,i:number)=><p key={i}>{item.product_name_snapshot} · {item.quantity} × {Number(item.unit_price_snapshot).toFixed(2)}</p>)}<small>{tr('Load this request from its assigned station queue. Opening an alert does not create a sale.')}</small></>:!message&&<p>{tr('Loading…')}</p>}</Card>
}
