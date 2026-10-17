import {useState} from 'react'
import {tr} from './i18n'
import {readPosMemory} from './PosTools'
import type {Customer} from './types'
export default function CashierHome({scope,customers,onSale}:{scope:string;customers:Customer[];onSale:(customerId?:string)=>void}){const[query,setQuery]=useState('');const held=readPosMemory(scope).held;return <section className="panel"><div className="report-actions"><button onClick={()=>onSale()}>{tr('New Sale')}</button><button onClick={()=>onSale()}>{tr('Held sales')} ({held.length})</button></div><label>{tr('Find customer')}<input value={query} autoComplete="off" onChange={e=>setQuery(e.target.value)} placeholder={tr('Name, email or phone')}/></label>{query.trim().length>=2&&<div className="report-actions">{customers.filter(c=>(c.name+' '+c.phone+' '+c.email).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0,8).map(c=><button key={c.id} onClick={()=>onSale(c.id)}>{c.name}</button>)}</div>}</section>}
