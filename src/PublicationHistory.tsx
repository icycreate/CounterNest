import {useState} from 'react'
import {Button} from './Button'
import {supabase} from './lib/supabase'
import {tr,trError,useUiLanguage} from './i18n'

/** Restoring only changes the editor. Its normal review/publish action remains required. */
export function PublicationHistory({kind,onRestore}:{kind:string;onRestore:(value:any)=>void}){
 useUiLanguage()
 const[rows,setRows]=useState<Array<{id:string;value:unknown;created_at:string}>>([]),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function load(){if(!supabase||busy)return;setBusy(true);setError('');try{const r=await supabase.rpc('catalogue_history',{p_kind:kind});if(r.error)throw r.error;setRows(r.data??[])}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <details onToggle={e=>{if(e.currentTarget.open)void load()}}><summary>{tr('Publication history')}</summary><p>{tr('Restore a previous publication into this draft. Review and publish separately.')}</p>{error&&<p role="alert">{trError(error)}</p>}{busy?<p role="status">{tr('Loading…')}</p>:rows.length?<ul>{rows.map(row=><li key={row.id}><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString()}</time> <Button onClick={()=>{if(confirm(tr('Replace local changes with this previous publication?')))onRestore(row.value)}}>{tr('Restore into draft')}</Button></li>)}</ul>:<p>{tr('No previous publications.')}</p>}</details>
}
