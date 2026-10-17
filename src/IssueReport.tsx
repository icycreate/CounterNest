import {trError,tr} from './i18n'
import {FormEvent,useEffect,useState} from 'react'
import {AlertTriangle,CheckCircle2,RefreshCw,Send,ShieldCheck} from 'lucide-react'
import {supabase,supabaseConfigured} from './lib/supabase'
import type {Role} from './types'

type IssueStatus='open'|'investigating'|'monitoring'|'resolved'
type Issue={id:string;reference:string;severity:'low'|'medium'|'high'|'critical';category:string;title:string;description:string;impact:string|null;status:IssueStatus;reported_at:string;updated_at:string;resolved_at:string|null;resolution_note:string|null;event_count:number}
const categories=['checkout','payment','inventory','loyalty','daily_cash','authentication','device','network','printing','data','other']
const title=(value:string)=>value.replace(/_/g,' ').replace(/\b\w/g,(character:string)=>character.toUpperCase())

export default function IssueReport({role,online,showToast}:{role:Role;online:boolean;showToast:(message:string)=>void}){
  const[issues,setIssues]=useState<Issue[]>([]),[urgency,setUrgency]=useState('normal'),[category,setCategory]=useState('checkout'),[heading,setHeading]=useState(''),[description,setDescription]=useState(''),[impact,setImpact]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  async function load(){
    if(!supabaseConfigured||!supabase)return
    setBusy(true);const{data,error:loadError}=await supabase.rpc('get_my_operational_issues');setBusy(false)
    if(loadError)return showToast(trError(loadError.message.includes('does not exist')?tr("Apply Supabase migration 44 before using Report Issue."):loadError.message))
    setIssues((data??[]) as Issue[])
  }
  useEffect(()=>{void load()},[])
  async function submit(e:FormEvent){
    e.preventDefault();setError(trError(''))
    if(!online)return setError(trError(tr("Reconnect before submitting an issue report.")))
    setBusy(true)
    try{
      if(supabaseConfigured&&supabase){
        const{data,error:saveError}=await supabase.rpc('report_operational_issue',{p_urgency:urgency,p_category:category,p_title:heading.trim(),p_description:description.trim(),p_impact:impact.trim()||null})
        if(saveError)throw saveError
        showToast(trError(`Issue ${data.reference} sent to management.`));await load()
      }else{
        const number=issues.length+1,now=new Date().toISOString(),severity=urgency==='low'?'low':urgency==='urgent'?'high':'medium'
        setIssues(old=>[{id:`demo-${number}`,reference:`INC-${new Date().getFullYear()}-${String(number).padStart(6,'0')}`,severity,category,title:heading.trim(),description:description.trim(),impact:impact.trim()||null,status:'open',reported_at:now,updated_at:now,resolved_at:null,resolution_note:null,event_count:1},...old] as Issue[])
        showToast(trError(tr("Demo issue recorded on this screen only.")))
      }
      setHeading('');setDescription('');setImpact('');setUrgency('normal');setCategory('checkout')
    }catch(err){setError(trError(err instanceof Error?err.message:tr("Issue report could not be submitted.")))}finally{setBusy(false)}
  }
  return <>
    <header className="page-header"><div><h1>{tr("Report an Issue")}</h1><p>{tr("Send an operational problem to management and track its status")}</p></div><button onClick={()=>void load()} disabled={busy||!supabaseConfigured}><RefreshCw size={17}/>{busy?tr("Refreshing…"):tr("Refresh Status")}</button></header>
    <div className="info-box drawer-security"><ShieldCheck size={18}/><span>{tr("Your report is visible to administrators. Never enter card numbers, passwords, authentication codes, Supabase keys, or customer medical/private information.")}</span></div>
    {!online&&<div className="warning-box"><AlertTriangle size={18}/>{' '+tr("This device is offline. Copy any important notes elsewhere and submit after reconnecting.")}</div>}
    <section className="issue-report-layout"><form className="panel issue-report-form" onSubmit={submit}><div><h2>{tr("New Issue Report")}</h2><p className="muted">{tr("Use facts: what happened, when, which device or receipt, and the safe workaround used.")}</p></div><div className="form-grid"><label>{tr("Urgency")}<select value={urgency} onChange={e=>setUrgency(e.target.value)}><option value="low">{tr("Low — minor inconvenience")}</option><option value="normal">{tr("Normal — workflow affected")}</option><option value="urgent">{tr("Urgent — sales, cash, stock, or access affected")}</option></select></label><label>{tr("Area")}<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(value=><option key={value} value={value}>{title(value)}</option>)}</select></label><label className="full-field">{tr("Short title")}<input required minLength={5} maxLength={120} value={heading} onChange={e=>setHeading(e.target.value)} placeholder={tr("Example: Receipt printer stopped responding")}/></label><label className="full-field">{tr("What happened")}<textarea required minLength={10} value={description} onChange={e=>setDescription(e.target.value)} placeholder={tr("Time, device, receipt/reference, steps taken, and what appeared on screen…")}/></label><label className="full-field">{tr("Business impact or safe workaround (optional)")}<textarea value={impact} onChange={e=>setImpact(e.target.value)} placeholder={tr("Sales paused, used System Print, manager notified…")}/></label></div>{error&&<div className="form-error">{tr(error)}</div>}<button className="primary-btn issue-submit" disabled={busy||!online||heading.trim().length<5||description.trim().length<10}><Send size={17}/>{busy?tr("Submitting…"):tr("Send to Management")}</button></form>
      <aside className="panel issue-report-guidance"><h2>{tr("What happens next?")}</h2><ol><li>{tr("CounterNest creates a permanent incident reference.")}</li><li>{tr("Management reviews its severity and category.")}</li><li>{tr("Status changes to Investigating or Monitoring while work continues.")}</li><li>{tr("When verified, management resolves it with a recorded note.")}</li></ol><div className="warning-box">{tr("For a possible duplicate payment, missing paid sale, or wrong-business data, stop the affected workflow and contact the manager immediately.")}</div><p className="muted">{tr("Your report cannot be edited or deleted from this page. Give management the incident reference if more evidence becomes available.")}</p></aside>
    </section>
    <section className="panel"><div className="panel-title"><div><h2>{tr("My Recent Reports")}</h2><p className="muted">{tr("Only reports submitted by your signed-in account are shown here.")}</p></div><strong>{issues.length}</strong></div>{issues.length?<div className="my-issue-list">{issues.map(issue=><article key={issue.id}><div><b>{issue.reference}</b><small>{title(issue.category)} • {new Date(issue.reported_at).toLocaleString()}</small></div><span><strong>{issue.title}</strong><small>{issue.description}</small>{issue.status==='resolved'&&issue.resolution_note&&<em>{tr("Resolution:")+' '} {issue.resolution_note}</em>}</span><div><i className={`severity ${issue.severity}`}>{issue.severity}</i><i className={`incident-status ${issue.status}`}>{title(issue.status)}</i></div></article>)}</div>:<div className="empty-state"><CheckCircle2 size={34}/><strong>{tr("No issue reports from this account.")}</strong><span>{tr("Use the form when an operational problem needs management follow-up.")}</span></div>}</section>
    {role==='admin'&&<div className="info-box">{tr("Administrators can triage all staff reports from Operations Center.")}</div>}
  </>
}
