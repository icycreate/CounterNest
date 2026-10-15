import {userFacingText} from './userFacingText'
import {useEffect,useState} from 'react'
import {CheckCircle2,ClipboardCheck,Download,LockKeyhole,Printer,RefreshCw,ShieldCheck,TriangleAlert} from 'lucide-react'
import {supabase,supabaseConfigured} from './lib/supabase'
import type {Role} from './types'

type CheckStatus='pass'|'warning'|'fail'
type ServerCheck={id:string;label:string;status:CheckStatus;detail:string}
type PhaseItem={phase:string;title:string;evidence:string;complete:boolean}
type Review={id:string;status:'draft'|'approved';notes:string|null;reviewed_at:string;approved_at:string|null;reviewed_by_name:string;checklist?:PhaseItem[]}
type GoLiveData={business_date:string;server_checks:ServerCheck[];latest_review:Review|null;history:Review[]}

const phaseDefinitions:Omit<PhaseItem,'complete'>[]=[
  {phase:'32.0',title:'Production cutover',evidence:'Backup verified, migrations applied in test first, test records separated, and real catalog reviewed.'},
  {phase:'32.1',title:'Manager day close',evidence:'Opening cash, transactions, physical count, variance reason, closure reference, and report verified.'},
  {phase:'32.2',title:'Security hardening',evidence:'Administrator access reviewed, unused staff disabled, strong passwords used, and owner MFA/recovery custody documented.'},
  {phase:'32.3',title:'Backup and recovery',evidence:'Fresh export verified by SHA-256 and restore rehearsal completed only in a separate recovery project.'},
  {phase:'32.4',title:'HTTPS and device setup',evidence:'Every approved device tested; camera devices use trusted HTTPS or same-device localhost.'},
  {phase:'32.5',title:'Reliability and performance',evidence:'Large catalog, reconnect behavior, receipt fallback, and error recovery tested on launch hardware.'},
  {phase:'32.6',title:'User acceptance testing',evidence:'Sales, cash tender, refund, void, loyalty, inventory, production, recall, backup, and reports passed.'},
  {phase:'32.7',title:'Staff training',evidence:'Named staff completed opening, sale, correction, closing, privacy, and incident procedures.'},
  {phase:'32.8',title:'Release freeze',evidence:'Final package, checksum, migration list, rollback package, and management sign-off stored together.'},
  {phase:'32.9',title:'Controlled go-live',evidence:'Launch date, responsible manager, support contact, monitoring window, and post-launch review are assigned.'}
]
const fresh=()=>phaseDefinitions.map(item=>({...item,complete:false}))

export default function InternalGoLive({role,online,standalone,showToast}:{role:Role;online:boolean;standalone:boolean;showToast:(message:string)=>void}){
  const[data,setData]=useState<GoLiveData|null>(null),[items,setItems]=useState<PhaseItem[]>(fresh),[notes,setNotes]=useState(''),[busy,setBusy]=useState(false),[aal,setAal]=useState('aal1')
  async function load(){
    if(role!=='admin')return
    setBusy(true)
    if(supabaseConfigured&&supabase){
      const[{data:raw,error},{data:level}]=await Promise.all([supabase.rpc('get_phase32_go_live_status'),supabase.auth.mfa.getAuthenticatorAssuranceLevel()])
      if(error){setBusy(false);showToast(error.message.includes('does not exist')?'Apply Supabase migration 42 before using Internal Go-Live.':error.message);return}
      const mapped=raw as GoLiveData;setData(mapped);setAal(level?.currentLevel??'aal1')
      if(mapped.latest_review?.checklist?.length){setItems(phaseDefinitions.map(def=>({...def,complete:Boolean(mapped.latest_review?.checklist?.find(x=>x.phase===def.phase)?.complete)})));setNotes(mapped.latest_review.notes??'')}
    }else setData({business_date:new Date().toISOString().slice(0,10),server_checks:[{id:'demo',label:'Demo configuration',status:'warning',detail:'Connect the production Supabase project before approval.'}],latest_review:null,history:[]})
    setBusy(false)
  }
  useEffect(()=>{void load()},[role])
  async function save(approve:boolean){
    if(!supabaseConfigured||!supabase)return showToast('Production sign-off requires the configured Supabase project.')
    setBusy(true);const{data:result,error}=await supabase.rpc('save_phase32_go_live_review',{p_checklist:items,p_notes:notes.trim()||null,p_approve:approve});setBusy(false)
    if(error)return showToast(error.message)
    showToast(approve?'Internal production go-live approved and audited.':` draft saved (${result.completed}/10 complete).`);await load()
  }
  function exportChecklist(){const rows=[['CounterNest POS  Internal Go-Live'],['Business date',data?.business_date??''],['Status',data?.latest_review?.status??'Not saved'],[],['Control','Complete','Required evidence'],...items.map(x=>[x.title,x.complete?'Yes':'No',x.evidence]),[],['Management notes',notes]];const csv=rows.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),link=document.createElement('a');link.href=url;link.download='counternest-launch-checklist.csv';link.click();URL.revokeObjectURL(url)}
  if(role!=='admin')return <><header className="page-header"><div><h1>Launch Sign-off</h1><p>Administrator access is required.</p></div></header><div className="info-box">Only administrators can create production sign-off evidence.</div></>
  const complete=items.filter(x=>x.complete).length,failures=(data?.server_checks??[]).filter(x=>x.status==='fail').length,warnings=(data?.server_checks??[]).filter(x=>x.status==='warning').length
  const deviceChecks:ServerCheck[]=[
    {id:'online',label:'Cloud connection',status:online?'pass':'fail',detail:online?'This device is online.':'Reconnect before operating or approving production.'},
    {id:'secure',label:'Secure browser context',status:window.isSecureContext?'pass':'warning',detail:window.isSecureContext?'Camera and protected browser features are available.':'Use HTTPS on production devices to enable camera access.'},
    {id:'installed',label:'Installed POS',status:standalone?'pass':'warning',detail:standalone?'Running as an installed application.':'Install the PWA on each primary device after acceptance.'},
    {id:'mfa',label:'Administrator MFA session',status:aal==='aal2'?'pass':'warning',detail:aal==='aal2'?'This administrator session used a second factor.':'Enable and verify Supabase Auth MFA for owner/administrator production access.'}
  ]
  return <>
    <header className="page-header"><div><h1> Internal Go-Live</h1><p>Production cutover, controlled day close, recovery, device acceptance, training, release freeze, and launch sign-off</p></div><div className="report-actions"><button onClick={exportChecklist}><Download size={17}/> CSV</button><button onClick={()=>window.print()}><Printer size={17}/> Print</button><button className="primary-btn" onClick={()=>void load()} disabled={busy}><RefreshCw size={17}/>{busy?'Checking…':'Refresh'}</button></div></header>
    <div className="info-box drawer-security"><LockKeyhole size={18}/><span>This page records management evidence. It never clears production data, restores a backup, trusts a certificate, or approves itself automatically.</span></div>
    <section className={`launch-summary ${failures?'fail':complete===10&&!warnings?'pass':'warning'}`}><ShieldCheck size={36}/><div><small>INTERNAL PRODUCTION CONTROL</small><strong>{data?.latest_review?.status==='approved'?'APPROVED':failures?'NOT READY':complete===10?'READY FOR SIGN-OFF':'IN PROGRESS'}</strong><span>{complete}/10 controls complete • {failures} failed server/device check(s) • {warnings} server warning(s)</span></div></section>
    <section className="go-live-device-grid">{[...(data?.server_checks??[]),...deviceChecks].map(check=><div className={`go-live-device ${check.status}`} key={check.id}>{check.status==='pass'?<CheckCircle2/>:<TriangleAlert/>}<span><strong>{userFacingText(check.label)}</strong><small>{userFacingText(check.detail)}</small></span><b>{check.status}</b></div>)}</section>
    <section className="panel"><div className="panel-title"><div><h2> evidence checklist</h2><p className="muted">Check an item only after its evidence has been reviewed and stored.</p></div><strong>{complete}/10</strong></div><div className="go-live-checklist">{items.map((item,index)=><label className={item.complete?'complete':''} key={item.phase}><input type="checkbox" checked={item.complete} onChange={e=>setItems(rows=>rows.map((row,i)=>i===index?{...row,complete:e.target.checked}:row))}/><span><small>Control {index+1}</small><strong>{item.title}</strong><p>{item.evidence}</p></span></label>)}</div></section>
    <section className="panel go-live-signoff"><label>Management evidence and sign-off note<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Test environment, backup reference, trained staff, launch manager, approved devices, exceptions, and review date…"/></label><div className="warning-box">Production approval is immutable evidence. Later corrections create a new review; they do not edit or delete the prior approval.</div><div className="modal-actions"><button onClick={()=>void save(false)} disabled={busy}>Save Draft</button><button className="primary-btn" onClick={()=>void save(true)} disabled={busy||complete!==10||failures>0||notes.trim().length<10}><ClipboardCheck size={17}/> Approve Internal Go-Live</button></div></section>
    <section className="panel"><h2>Management review history</h2>{data?.history?.length?<div className="table-wrap"><table><thead><tr><th>Reviewed</th><th>Status</th><th>Manager</th><th>Notes</th></tr></thead><tbody>{data.history.map(row=><tr key={row.id}><td>{new Date(row.reviewed_at).toLocaleString()}</td><td><b className={`acceptance-badge ${row.status==='approved'?'passed':'warning'}`}>{row.status}</b></td><td>{row.reviewed_by_name}</td><td>{row.notes||'—'}</td></tr>)}</tbody></table></div>:<p className="muted">No  review has been saved.</p>}</section>
  </>
}
