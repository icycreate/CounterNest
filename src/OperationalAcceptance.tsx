import {FormField,TextAreaField} from './Fields'
import {Card} from './Surface'
import {Button} from './Button'
import {PageHeader} from './PageHeader'
import {systemLabel} from './systemLabels'
import {trError,tr} from './i18n'
import {userFacingText} from './userFacingText'
import { useEffect, useState } from 'react'
import { CheckCircle2, ClipboardCheck, History, RotateCcw, ShieldCheck, TriangleAlert, XCircle } from 'lucide-react'
import { supabase, supabaseConfigured } from './lib/supabase'
import type { Role } from './types'

type CheckStatus='pass'|'warning'|'fail'
type AcceptanceCheck={id:string;label:string;status:CheckStatus;required:boolean;detail:string}
type AcceptanceRun={id:string;release_version:string;phase:string;status:'passed'|'warning'|'failed';checks:AcceptanceCheck[];notes:string|null;run_at:string;run_by_name?:string}

export default function OperationalAcceptance({role,showToast}:{role:Role;showToast:(message:string)=>void}){
  const[current,setCurrent]=useState<AcceptanceRun|null>(null)
  const[history,setHistory]=useState<AcceptanceRun[]>([])
  const[notes,setNotes]=useState('')
  const[busy,setBusy]=useState(false)

  async function load(){
    if(role!=='admin'||!supabaseConfigured||!supabase)return
    const{data,error}=await supabase.rpc('get_phase32_acceptance_history')
    if(error)return showToast(trError(error.message.includes('does not exist')?tr("Apply Supabase migration 42 before running  acceptance."):error.message))
    const rows=(data??[]) as AcceptanceRun[]
    setHistory(rows)
    setCurrent(rows[0]??null)
  }
  useEffect(()=>{void load()},[role])

  async function run(){
    if(!supabaseConfigured||!supabase)return showToast(trError(tr("Configure Supabase before running operational acceptance.")))
    setBusy(true)
    const{data,error}=await supabase.rpc('run_phase32_operational_acceptance',{p_notes:notes.trim()||null})
    setBusy(false)
    if(error)return showToast(trError(error.message))
    setCurrent(data as AcceptanceRun)
    setNotes('')
    await load()
    showToast(trError(` acceptance result: ${(data as AcceptanceRun).status}.`))
  }

  if(role!=='admin')return <><PageHeader className="page-header"><div><h1>{tr("Operational Validation")}</h1><p>{tr("Administrator access is required.")}</p></div></PageHeader><div className="info-box">{tr("Only administrators can run or review release acceptance.")}</div></>
  const checks=current?.checks??[]
  const passed=checks.filter(c=>c.status==='pass').length,warnings=checks.filter(c=>c.status==='warning').length,failed=checks.filter(c=>c.status==='fail').length
  return <>
    <PageHeader className="page-header"><div><h1>{' '+tr("Operational Acceptance")}</h1><p>{tr("Internal-production, data-integrity, day-close, backup, and recall-readiness checks for CounterNest")}</p></div><Button type="submit" variant="primary" className="primary-btn small" onClick={()=>void run()} disabled={busy}><ClipboardCheck size={17}/>{busy?tr("Running…"):tr("Run Acceptance")}</Button></PageHeader>
    <div className="info-box drawer-security"><ShieldCheck size={18}/><span>{tr("Run this after verifying the current migration level and applying only pending upgrades in a test project, verifying a backup, and completing a controlled day-close exercise. Required failures block internal go-live approval.")}</span></div>
    <section className="acceptance-layout">
      <div className={`acceptance-summary ${current?.status??'not-run'}`}><ClipboardCheck size={34}/><div><small>{tr("LATEST RESULT")}</small><strong>{current?current.status.replace('_',' ').toUpperCase():tr("NOT RUN")}</strong><span>{current?`${new Date(current.run_at).toLocaleString()} • ${passed} passed • ${warnings} warning • ${failed} failed`:tr("Run the server checks to create acceptance evidence.")}</span></div></div>
      <div className="panel acceptance-notes"><FormField>{tr("Management note for this run")}<TextAreaField value={notes} onChange={e=>setNotes(e.target.value)} placeholder={tr("Test environment, operator, issues reviewed, approval reference…")}/></FormField></div>
    </section>
    <Card className="panel"><div className="panel-title"><h2>{tr("Acceptance Checks")}</h2><Button type="submit" variant="secondary" onClick={()=>void load()} disabled={busy}><RotateCcw size={16}/>{' '+tr("Refresh")}</Button></div>{checks.length?<div className="acceptance-checks">{checks.map(check=><div className={`acceptance-check ${check.status}`} key={check.id}>{check.status==='pass'?<CheckCircle2/>:check.status==='warning'?<TriangleAlert/>:<XCircle/>}<div><strong>{userFacingText(check.label)}</strong><p>{userFacingText(check.detail)}</p></div><span>{check.required?tr("Required"):tr("Advisory")}</span></div>)}</div>:<div className="empty recipe-empty">{tr("No acceptance run has been recorded.")}</div>}</Card>
    <Card className="panel"><div className="panel-title"><h2><History size={20}/>{' '+tr("Acceptance History")}</h2></div>{history.length?<div className="table-wrap"><table><thead><tr><th>{tr("Run")}</th><th>{tr("Release")}</th><th>{tr("Result")}</th><th>{tr("Manager")}</th><th>{tr("Notes")}</th></tr></thead><tbody>{history.map(row=><tr key={row.id}><td>{new Date(row.run_at).toLocaleString()}</td><td>{tr("v")}{row.release_version}</td><td><b className={`acceptance-badge ${row.status}`}>{systemLabel(row.status)}</b></td><td>{row.run_by_name??tr("Current administrator")}</td><td>{row.notes||'—'}</td></tr>)}</tbody></table></div>:<p className="muted">{tr("History appears after the first run.")}</p>}</Card>
  </>
}
