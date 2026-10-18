import {useEffect,useState} from 'react'
import {ConfirmDialog} from './ConfirmDialog'
import {supabase,supabaseConfigured} from './lib/supabase'
import {tr,trError} from './i18n'
type Policy={action:'archive'|'delete';name:string;has_history:boolean}
export function RecordRemovalDialog({entity,id,name,onClose,onRemoved}:{entity:'product'|'customer';id:string;name:string;onClose:()=>void;onRemoved:(action:'archive'|'delete')=>void}){
 const[policy,setPolicy]=useState<Policy|null>(null),[error,setError]=useState('')
 useEffect(()=>{let live=true;if(!supabaseConfigured||!supabase){setPolicy({action:'archive',name,has_history:true});return}void Promise.resolve(supabase.rpc('get_master_removal_policy',{p_entity:entity,p_id:id})).then(r=>{if(!live)return;if(r.error)setError(trError(r.error.message));else setPolicy(r.data)}).catch(e=>{if(live)setError(trError(e instanceof Error?e.message:String(e)))});return()=>{live=false}},[entity,id,name])
 const label=policy?tr(policy.action==='archive'?'Archive':'Delete'):tr('Loading…')
 return <ConfirmDialog title={tr('Remove record')} confirmLabel={label} disabled={!policy||!!error} onClose={onClose} onConfirm={async()=>{if(!policy)return;if(supabaseConfigured&&supabase){const r=await supabase.rpc('remove_master_record',{p_entity:entity,p_id:id,p_expected_action:policy.action});if(r.error)throw Error(trError(r.error.message))}onRemoved(policy.action)}}><p><strong>{policy?.name??name}</strong></p>{error?<p role="alert">{error}</p>:<p>{policy?tr(policy.action==='archive'?'Linked records are preserved. This record will be archived and removed from new selections.':'No linked records were found. This record will be permanently deleted.'):tr('Checking linked history…')}</p>}</ConfirmDialog>
}
