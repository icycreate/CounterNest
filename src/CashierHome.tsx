import {Button} from './Button'
import {FormField} from './Fields'
import {Card} from './Surface'
import {SearchField} from './SearchField'
import {useState} from 'react'
import {tr} from './i18n'
import {readPosMemory} from './PosTools'
import type {Customer} from './types'
export default function CashierHome({scope,customers,onSale}:{scope:string;customers:Customer[];onSale:(customerId?:string)=>void}){const[query,setQuery]=useState('');const held=readPosMemory(scope).held;return <Card className="panel"><div className="report-actions"><Button type="submit" variant="secondary" onClick={()=>onSale()}>{tr('New Sale')}</Button><Button type="submit" variant="secondary" onClick={()=>onSale()}>{tr('Held sales')} ({held.length})</Button></div><FormField>{tr('Find customer')}<SearchField value={query} autoComplete="off" onChange={e=>setQuery(e.target.value)} placeholder={tr('Name, email or phone')}/></FormField>{query.trim().length>=2&&<div className="report-actions">{customers.filter(c=>(c.name+' '+c.phone+' '+c.email).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0,8).map(c=><Button type="submit" variant="secondary" key={c.id} onClick={()=>onSale(c.id)}>{c.name}</Button>)}</div>}</Card>}
