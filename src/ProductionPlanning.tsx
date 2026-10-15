import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarDays, PackageSearch, Plus, RotateCcw, ShieldCheck, TriangleAlert, X } from 'lucide-react'
import { supabase, supabaseConfigured } from './lib/supabase'
import type { Product, Role } from './types'

type PlanBatch={id:string;batch_number:number;product_id:string;product_name:string;scheduled_date:string;planned_quantity:number;note:string|null;shortage_override:boolean;planning_recipe_version:number|null;coverage_status:'covered'|'shortage'|'not_calculated';created_by_name:string}
type DayPlan={plan_date:string;batch_count:number;planned_units:number}
type Requirement={ingredient_id:string;ingredient_name:string;base_unit:string;current_quantity:number;required_quantity:number;shortage_quantity:number;stock_status:'covered'|'shortage';preferred_supplier:string|null}
type PlanningData={batches:PlanBatch[];daily:DayPlan[];requirements:Requirement[];summary:{scheduled_batches:number;planned_units:number;planning_days:number}}
type PreviewItem={ingredient_id:string;name:string;base_unit:string;available:number;committed:number;available_after_commitments:number;required:number;shortage:number}
type PlanPreview={product_id:string;product_name:string;recipe_applied:boolean;recipe_version?:number;effective_batch_yield?:number;scale?:number;can_schedule:boolean;has_shortage:boolean;maximum_producible:number|null;ingredients:PreviewItem[];warning:string|null}

const empty:PlanningData={batches:[],daily:[],requirements:[],summary:{scheduled_batches:0,planned_units:0,planning_days:0}}
const qty=(value:number,unit='units')=>`${Number(value??0).toLocaleString(undefined,{maximumFractionDigits:3})} ${unit}`

export default function ProductionPlanning({products,role,showToast}:{products:Product[];role:Role;showToast:(message:string)=>void}){
  const today=new Date().toISOString().slice(0,10)
  const endDate=new Date(Date.now()+6*86400000).toISOString().slice(0,10)
  const[from,setFrom]=useState(today),[to,setTo]=useState(endDate),[data,setData]=useState<PlanningData>(empty),[adding,setAdding]=useState(false),[busy,setBusy]=useState(false)
  async function load(){
    if(role!=='admin')return
    setBusy(true)
    if(!supabaseConfigured||!supabase){setData(empty);setBusy(false);return}
    const{data:result,error}=await supabase.rpc('get_production_planning',{p_from:from,p_to:to})
    setBusy(false)
    if(error)return showToast(error.message.includes('does not exist')?'Apply Supabase migration 34 before using Production Planning.':error.message)
    setData({batches:result?.batches??[],daily:result?.daily??[],requirements:result?.requirements??[],summary:result?.summary??empty.summary})
  }
  useEffect(()=>{void load()},[role,from,to])
  async function cancel(id:string){if(!confirm('Cancel this planned production batch?'))return;if(supabase){const{error}=await supabase.rpc('cancel_production_batch',{p_batch_id:id});if(error)return showToast(error.message)}await load();showToast('Planned batch cancelled.')}
  const shortageCount=data.requirements.filter(r=>r.stock_status==='shortage').length
  if(role!=='admin')return <><header className="page-header"><div><h1>Production Planning</h1><p>Administrator access is required.</p></div></header><div className="info-box">Only administrators can plan production and review ingredient coverage.</div></>
  return <>
    <header className="page-header"><div><h1>Production Planning</h1><p>Daily and weekly batch planning with automatic recipe scaling and shortage guidance</p></div><button className="primary-btn small" onClick={()=>setAdding(true)} disabled={!products.some(p=>p.active)}><Plus size={17}/> Plan Production</button></header>
    <div className="info-box drawer-security"><ShieldCheck size={18}/><span>Planning does not consume stock. Ingredients are deducted only when a batch is completed; shortage overrides are recorded on the planned batch.</span></div>
    <section className="panel planning-filter"><div className="form-grid"><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)} max={to}/></label><label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)} min={from}/></label></div><button onClick={()=>void load()} disabled={busy}><RotateCcw size={16}/>{busy?'Loading…':'Refresh Plan'}</button></section>
    <section className="stats-grid four"><div className="stat-card panel"><span>Scheduled batches</span><strong>{data.summary.scheduled_batches}</strong><small>{from} to {to}</small></div><div className="stat-card panel"><span>Planned units</span><strong>{Number(data.summary.planned_units).toLocaleString()}</strong><small>Sellable output target</small></div><div className="stat-card panel"><span>Production days</span><strong>{data.summary.planning_days}</strong><small>Days with scheduled batches</small></div><div className="stat-card panel"><span>Ingredient shortages</span><strong>{shortageCount}</strong><small>{shortageCount?'Review before production':'Current range is covered'}</small></div></section>
    <section className="two-col planning-grid"><div className="panel"><h2><CalendarDays size={20}/> Daily Plan</h2>{data.daily.length?<div className="day-plan-list">{data.daily.map(day=><div key={day.plan_date}><span>{new Date(`${day.plan_date}T00:00:00`).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</span><strong>{day.batch_count} batch{day.batch_count===1?'':'es'}</strong><b>{qty(day.planned_units)}</b></div>)}</div>:<p className="muted">No production scheduled in this range.</p>}</div><div className="panel"><h2><PackageSearch size={20}/> Material Coverage</h2>{data.requirements.length?<div className="requirement-list">{data.requirements.map(row=><div className={row.stock_status} key={row.ingredient_id}><span><strong>{row.ingredient_name}</strong><small>{row.preferred_supplier||'No preferred supplier'}</small></span><span>Need {qty(row.required_quantity,row.base_unit)}<small>Available {qty(row.current_quantity,row.base_unit)}</small></span><b>{row.stock_status==='covered'?'Covered':`Short ${qty(row.shortage_quantity,row.base_unit)}`}</b></div>)}</div>:<p className="muted">Recipe material requirements appear after batches are scheduled.</p>}</div></section>
    <section className="panel"><div className="panel-title"><h2>Scheduled Production</h2><span className="muted">Ingredient coverage is a planning snapshot and may change after stock movements.</span></div>{data.batches.length?<div className="table-wrap"><table><thead><tr><th>Date</th><th>Batch</th><th>Product</th><th>Planned</th><th>Recipe</th><th>Coverage</th><th>Manager</th><th>Action</th></tr></thead><tbody>{data.batches.map(row=><tr key={row.id}><td>{new Date(`${row.scheduled_date}T00:00:00`).toLocaleDateString()}</td><td>B-{String(row.batch_number).padStart(6,'0')}</td><td>{row.product_name}</td><td>{qty(row.planned_quantity)}</td><td>{row.planning_recipe_version?`v${row.planning_recipe_version}`:'Not calculated'}</td><td><b className={`coverage-badge ${row.coverage_status}`}>{row.shortage_override?'Shortage override':row.coverage_status.replace('_',' ')}</b></td><td>{row.created_by_name}</td><td><button className="danger-link" onClick={()=>void cancel(row.id)}>Cancel</button></td></tr>)}</tbody></table></div>:<div className="empty recipe-empty">No scheduled production in this range.</div>}</section>
    {adding&&<PlanProductionModal products={products.filter(p=>p.active)} onClose={()=>setAdding(false)} onSaved={async()=>{setAdding(false);await load();showToast('Production batch planned and coverage snapshot saved.')}}/>}
  </>
}

function PlanProductionModal({products,onClose,onSaved}:{products:Product[];onClose:()=>void;onSaved:()=>Promise<void>}){
  const[productId,setProductId]=useState(products[0]?.id??''),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[planned,setPlanned]=useState('1'),[note,setNote]=useState(''),[preview,setPreview]=useState<PlanPreview|null>(null),[allowShortage,setAllowShortage]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false)
  const validQuantity=Number(planned)>0
  useEffect(()=>{
    setAllowShortage(false)
    if(!supabaseConfigured||!supabase||!productId||!validQuantity){setPreview(null);return}
    const timer=setTimeout(async()=>{setLoading(true);const{data,error}=await supabase!.rpc('preview_production_plan',{p_product_id:productId,p_planned_quantity:Number(planned)});setLoading(false);if(error)return alert(error.message);setPreview(data as PlanPreview)},250)
    return()=>clearTimeout(timer)
  },[productId,planned])
  const canSubmit=validQuantity&&Boolean(productId)&&(!preview?.has_shortage||allowShortage)
  async function save(e:FormEvent){e.preventDefault();if(!canSubmit)return;setBusy(true);if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('schedule_planned_production_batch',{p_product_id:productId,p_scheduled_date:date,p_planned_quantity:Number(planned),p_note:note.trim()||null,p_allow_shortage:allowShortage});if(error){setBusy(false);return alert(error.message)}}await onSaved()}
  return <div className="modal-backdrop"><form className="modal planning-modal" onSubmit={save}><div className="panel-title"><div><h2>Plan Production</h2><p className="muted">Recipe requirements recalculate when the product or quantity changes.</p></div><button type="button" onClick={onClose}><X size={18}/></button></div><div className="form-grid"><label>Finished product<select value={productId} onChange={e=>setProductId(e.target.value)}>{products.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>Production date<input required type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/></label><label>Planned sellable quantity<input required type="number" min="0.001" step="0.001" value={planned} onChange={e=>setPlanned(e.target.value)}/></label><label>Planning note<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Orders, shift, flavor, priority…"/></label></div>{loading&&<div className="info-box">Calculating recipe scale and ingredient coverage…</div>}{preview&&<PlanPreviewCard preview={preview}/>} {preview?.has_shortage&&<label className="shortage-override"><input type="checkbox" checked={allowShortage} onChange={e=>setAllowShortage(e.target.checked)}/><span><strong>Schedule despite the ingredient shortage</strong><small>This override is recorded. Receive the missing stock before completing production.</small></span></label>}<div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy||loading||!canSubmit}>{busy?'Scheduling…':'Schedule Planned Batch'}</button></div></form></div>
}

function PlanPreviewCard({preview}:{preview:PlanPreview}){
  if(!preview.recipe_applied)return <div className="warning-box"><TriangleAlert size={18}/> {preview.warning}</div>
  return <section className={`plan-preview ${preview.has_shortage?'shortage':'covered'}`}><div className="plan-preview-head"><div><small>RECIPE SCALE</small><strong>{Number(preview.scale??0).toFixed(2)}× recipe v{preview.recipe_version}</strong><span>Effective batch yield: {qty(Number(preview.effective_batch_yield??0))}</span></div><div><small>MAXIMUM CURRENTLY PRODUCIBLE</small><strong>{qty(Number(preview.maximum_producible??0))}</strong><span>After existing scheduled commitments</span></div></div><div className="preview-ingredients">{preview.ingredients.map(item=><div className={item.shortage>0?'shortage':'covered'} key={item.ingredient_id}><span><strong>{item.name}</strong><small>{qty(item.committed,item.base_unit)} already committed</small></span><span>Need {qty(item.required,item.base_unit)}<small>{qty(item.available_after_commitments,item.base_unit)} available after commitments</small></span><b>{item.shortage>0?`Short ${qty(item.shortage,item.base_unit)}`:'Covered'}</b></div>)}</div>{preview.warning&&<div className="warning-box"><TriangleAlert size={18}/>{preview.warning}</div>}</section>
}
