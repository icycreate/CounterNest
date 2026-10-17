import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'
import {tr,trError} from './i18n'
import {RecordTable} from './RecordTable'
export function LegacyPurchaseHistory({role,showToast}:{role:string;showToast:(s:string)=>void}){
 const[orders,setOrders]=useState<any[]>([]),[busy,setBusy]=useState(false);
 async function load(){if(!supabase||!['admin','inventory'].includes(role))return;const r=await supabase.rpc('get_purchase_orders');if(r.error)showToast(trError(r.error.message));else setOrders(r.data?.orders||[])}useEffect(()=>{void load()},[role]);
 if(!['admin','inventory'].includes(role))return null;
 return <details className="panel"><summary>{tr('Legacy Purchase Order History')}</summary><p>{tr('Historical orders are preserved. Review and cancel old open orders, then recreate eligible items in the new purchase workflow.')}</p><RecordTable headers={['PO','Supplier','Items','Status','Action']} rows={orders.map(o=>[String(o.order_number),o.supplier_name,o.items.map((i:any)=>i.product_name).join(', '),tr(o.status),role==='admin'&&o.status==='ordered'?<button key={o.id} disabled={busy} onClick={async()=>{if(!supabase||!confirm(tr('Cancel this purchase order?')))return;setBusy(true);const r=await supabase.rpc('cancel_purchase_order',{p_order_id:o.id});setBusy(false);if(r.error)return showToast(trError(r.error.message));await load()}}>{tr('Cancel')}</button>:null])}/></details>
}
