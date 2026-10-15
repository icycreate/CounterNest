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
    if(error)return showToast(error.message.includes('does not exist')?'Apply Supabase migration 42 before running  acceptance.':error.message)
    const rows=(data??[]) as AcceptanceRun[]
    setHistory(rows)
    setCurrent(rows[0]??null)
  }
  useEffect(()=>{void load()},[role])

  async function run(){
    if(!supabaseConfigured||!supabase)return showToast('Configure Supabase before running operational acceptance.')
    setBusy(true)
    const{data,error}=await supabase.rpc('run_phase32_operational_acceptance',{p_notes:notes.trim()||null})
    setBusy(false)
    if(error)return showToast(error.message)
    setCurrent(data as AcceptanceRun)
    setNotes('')
    await load()
    showToast(` acceptance result: ${(data as AcceptanceRun).status}.`)
  }

  if(role!=='admin')return <><header className="page-header"><div><h1>Operational Validation</h1><p>Administrator access is required.</p></div></header><div className="info-box">Only administrators can run or review release acceptance.</div></>
  const checks=current?.checks??[]
  const passed=checks.filter(c=>c.status==='pass').length,warnings=checks.filter(c=>c.status==='warning').length,failed=checks.filter(c=>c.status==='fail').length
  return <>
    <header className="page-header"><div><h1> Operational Acceptance</h1><p>Internal-production, data-integrity, day-close, backup, and recall-readiness checks for CounterNest</p></div><button className="primary-btn small" onClick={()=>void run()} disabled={busy}><ClipboardCheck size={17}/>{busy?'Running…':'Run Acceptance'}</button></header>
    <div className="info-box drawer-security"><ShieldCheck size={18}/><span>Run this after verifying the current migration level and applying only pending upgrades in a test project, verifying a backup, and completing a controlled day-close exercise. Required failures block internal go-live approval.</span></div>
    <section className="acceptance-layout">
      <div className={`acceptance-summary ${current?.status??'not-run'}`}><ClipboardCheck size={34}/><div><small>LATEST RESULT</small><strong>{current?current.status.replace('_',' ').toUpperCase():'NOT RUN'}</strong><span>{current?`${new Date(current.run_at).toLocaleString()} • ${passed} passed • ${warnings} warning • ${failed} failed`:'Run the server checks to create acceptance evidence.'}</span></div></div>
      <div className="panel acceptance-notes"><label>Management note for this run<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Test environment, operator, issues reviewed, approval reference…"/></label></div>
    </section>
    <section className="panel"><div className="panel-title"><h2>Acceptance Checks</h2><button onClick={()=>void load()} disabled={busy}><RotateCcw size={16}/> Refresh</button></div>{checks.length?<div className="acceptance-checks">{checks.map(check=><div className={`acceptance-check ${check.status}`} key={check.id}>{check.status==='pass'?<CheckCircle2/>:check.status==='warning'?<TriangleAlert/>:<XCircle/>}<div><strong>{userFacingText(check.label)}</strong><p>{userFacingText(check.detail)}</p></div><span>{check.required?'Required':'Advisory'}</span></div>)}</div>:<div className="empty recipe-empty">No acceptance run has been recorded.</div>}</section>
    <section className="panel"><div className="panel-title"><h2><History size={20}/> Acceptance History</h2></div>{history.length?<div className="table-wrap"><table><thead><tr><th>Run</th><th>Release</th><th>Result</th><th>Manager</th><th>Notes</th></tr></thead><tbody>{history.map(row=><tr key={row.id}><td>{new Date(row.run_at).toLocaleString()}</td><td>v{row.release_version}</td><td><b className={`acceptance-badge ${row.status}`}>{row.status}</b></td><td>{row.run_by_name??'Current administrator'}</td><td>{row.notes||'—'}</td></tr>)}</tbody></table></div>:<p className="muted">History appears after the first run.</p>}</section>
  </>
}
