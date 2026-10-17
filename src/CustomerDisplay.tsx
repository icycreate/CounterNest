import {SearchField} from './SearchField'
import {businessLogo} from './branding'
import {systemLabel} from './systemLabels'
import {trError,tr,LanguageSelector,useUiLanguage,getUiLocale} from './i18n'
import {randomId} from './id'
import type {MediaPhoto} from './CatalogueAdvanced'
import {useEffect,useMemo,useRef,useState} from 'react'
import type {Dispatch,SetStateAction} from 'react'
import {CheckCircle2,Copy,ExternalLink,Minus,MonitorSmartphone,Plus,RefreshCw,RotateCcw,Search,Send,ShoppingCart,Trash2,X} from 'lucide-react'
import {supabase,supabaseConfigured} from './lib/supabase'
import type {CartLine,PageKey,Product,Role} from './types'

type CatalogProduct={regular_price:number;catalogue_media:MediaPhoto[];catalogue_label_url:string|null;promotion_ends_at:string|null;promotion_featured:boolean;id:string;name:string;price:number;image_url:string|null;icon_emoji:string|null;category_name:string;category_sort_order:number;catalogue_sort_order:number;available:boolean;description:string|null;featured:boolean;seasonal_label:string|null;new_badge:boolean;option_labels:string[]}
type Catalog={shop_name:string;logo_url:string|null;currency:string;catalogue_title:string;catalogue_subtitle:string|null;targets:string[];products:CatalogProduct[]}
type SelectionItem={product_id:string;quantity:number;option_label:string|null}
type QueueItem={product_id:string;product_name:string;unit_price:number;quantity:number;option_label:string|null}
type QueueRequest={id:string;request_number:number;target_station_label:string;customer_note:string|null;total_snapshot:number;created_at:string;status?:string;loaded_at?:string|null;preparing_at?:string|null;ready_at?:string|null;items:QueueItem[]}

const money=(value:number,currency='USD')=>{try{return new Intl.NumberFormat(getUiLocale(),{style:'currency',currency}).format(value)}catch{return `$${value.toFixed(2)}`}}
const fallbackEmoji=(category:string)=>({Breads:'🍞',Pastries:'🥐',Cakes:'🍰',Cookies:'🍪',Desserts:'🧁',Drinks:'🥤'} as Record<string,string>)[category]??'🛍️'

export function CustomerDisplayScreen({token}:{token:string}){
  useUiLanguage()
  const[catalog,setCatalog]=useState<Catalog|null>(null)
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState('')
  const[search,setSearch]=useState('')
  const[category,setCategory]=useState('All')
  const[target,setTarget]=useState('')
  const[note,setNote]=useState('')
  const[cart,setCart]=useState<Record<string,number>>({})
  const[selectedOptions,setSelectedOptions]=useState<Record<string,string>>({})
  const[sending,setSending]=useState(false)
  const[confirmation,setConfirmation]=useState<{id:string;number:number;target:string;status:string}|null>(null)

  async function load(quiet=false){
    if(!quiet){setLoading(true);setError(trError(''))}
    if(!supabaseConfigured||!supabase){setError(trError(tr("Customer selection requires the configured Supabase connection.")));setLoading(false);return}
    const{data,error}=await supabase.rpc('get_customer_display_catalog',{p_token:token})
    if(error){setError(trError(error.message));setCatalog(null);setLoading(false);return}
    const next=data as Catalog
    setCart(old=>{const kept:Record<string,number>={};let removed=false;for(const [key,quantity] of Object.entries(old)){const split=key.indexOf('::'),id=split<0?key:key.slice(0,split),option=split<0?'':key.slice(split+2);const p=next.products.find(p=>p.id===id);if(p?.available&&(!option||p.option_labels.includes(option)))kept[key]=quantity;else removed=true}if(removed)setError(trError(tr("Unavailable products or options were removed from your selection. Please review it.")));return kept})
    setCatalog(next);setTarget(old=>next.targets?.includes(old)?old:next.targets?.[0]??'');setSelectedOptions(old=>({...Object.fromEntries((next.products??[]).filter(p=>p.option_labels?.length).map(p=>[p.id,p.option_labels[0]])),...old}));setLoading(false)
  }
  useEffect(()=>{void load();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load(true)},5000);return()=>window.clearInterval(timer)},[token])

  useEffect(()=>{
    if(!confirmation?.id||!supabase)return
    let stopped=false
    async function checkStatus(){
      const{data,error}=await supabase!.rpc('get_customer_selection_status',{p_token:token,p_request_id:confirmation!.id})
      if(!stopped&&!error&&data?.status)setConfirmation(old=>old?{...old,status:String(data.status)}:old)
    }
    void checkStatus();const timer=window.setInterval(()=>void checkStatus(),3000)
    return()=>{stopped=true;window.clearInterval(timer)}
  },[confirmation?.id,token])

  useEffect(()=>{
    if(!catalog||!supabase)return
    const key='counternest.catalogueSession';let session=sessionStorage.getItem(key);if(!session){session=randomId();sessionStorage.setItem(key,session)}
    const batch=new Set<string>();let timer:number|undefined
    const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){const id=(e.target as HTMLElement).dataset.catalogueProduct;if(id)batch.add(id);observer.unobserve(e.target)}
      if(batch.size&&!timer)timer=window.setTimeout(()=>{const ids=Array.from(batch).slice(0,100);batch.clear();timer=undefined;void supabase!.rpc('record_catalogue_views',{p_token:token,p_session_id:session,p_product_ids:ids})},500)
    },{threshold:0.5})
    document.querySelectorAll('[data-catalogue-product]').forEach(el=>observer.observe(el))
    return()=>{observer.disconnect();if(timer)window.clearTimeout(timer)}
  },[catalog,category,search,token])
  const categories=useMemo(()=>['All',...Array.from(new Set((catalog?.products??[]).map(p=>p.category_name)))],[catalog])
  const visible=useMemo(()=>(catalog?.products??[]).filter(p=>(category==='All'||p.category_name===category)&&`${p.name} ${p.description??''}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>Number(b.featured||(b.promotion_featured&&b.price<b.regular_price))-Number(a.featured||(a.promotion_featured&&a.price<a.regular_price))||Number(a.category_sort_order??0)-Number(b.category_sort_order??0)||Number(a.catalogue_sort_order??0)-Number(b.catalogue_sort_order??0)||a.name.localeCompare(b.name)),[catalog,category,search])
  const lines=useMemo(()=>Object.entries(cart).map(([key,quantity])=>{const split=key.indexOf('::');const productId=split>=0?key.slice(0,split):key;const optionLabel=split>=0?key.slice(split+2)||null:null;return{key,product:catalog?.products.find(p=>p.id===productId),optionLabel,quantity}}).filter(x=>x.product) as {key:string;product:CatalogProduct;optionLabel:string|null;quantity:number}[],[cart,catalog])
  const total=lines.reduce((sum,line)=>sum+line.product.price*line.quantity,0)
  const itemCount=lines.reduce((sum,line)=>sum+line.quantity,0)

  function cartKey(id:string,optionLabel?:string|null){return `${id}::${optionLabel??''}`}
  function setQty(id:string,optionLabel:string|null,quantity:number){const product=catalog?.products.find(p=>p.id===id);if(quantity>0&&(!product?.available||(optionLabel&&!product.option_labels.includes(optionLabel))))return;const key=cartKey(id,optionLabel);setCart(old=>{const next={...old};if(quantity<=0)delete next[key];else next[key]=Math.min(20,quantity);return next})}
  async function submit(){
    if(!supabase||!lines.length||!target)return
    if(lines.some(l=>!l.product.available||(l.optionLabel&&!l.product.option_labels.includes(l.optionLabel)))){setError(trError(tr("Some selected products or options are no longer available. Remove them before submitting.")));return}
    setSending(true);setError(trError(''))
    const items:SelectionItem[]=lines.map(line=>({product_id:line.product.id,quantity:line.quantity,option_label:line.optionLabel}))
    const{data,error}=await supabase.rpc('submit_customer_selection',{p_token:token,p_target_station_label:target,p_items:items,p_customer_note:note.trim()||null})
    setSending(false)
    if(error){setError(trError(error.message));return}
    setConfirmation({id:String(data?.request_id??''),number:Number(data?.request_number??0),target:String(data?.target_station_label??target),status:'pending'})
    setCart({});setNote('')
  }

  if(loading)return <div className="customer-display-stage"><div className="customer-display-loading">{tr("Loading products…")}</div></div>
  if(error&&!catalog)return <div className="customer-display-stage"><div className="customer-display-error"><h1>{tr("Customer View Unavailable")}</h1><p>{tr(error)}</p><button onClick={()=>void load()}><RefreshCw size={17}/>{' '+tr("Try Again")}</button></div></div>
  if(!catalog)return null

  return <div className="customer-display-stage">
    <header className="customer-display-header"><LanguageSelector id="customer-display-language" compact/>
      <div className="customer-brand"><img src={businessLogo(catalog.logo_url)} alt={tr("Business logo")}/><div><strong>{catalog.shop_name}</strong><small>{catalog.catalogue_title||tr('Catalogue')}{catalog.catalogue_subtitle?` • ${catalog.catalogue_subtitle}`:' • '+tr('Browse products and send your selection to the counter')}</small></div></div>
      <div className="customer-cart-count"><ShoppingCart size={20}/><span>{itemCount}</span></div>
    </header>
    {confirmation&&<div className="customer-confirmation"><CheckCircle2 size={28}/><div><strong>{tr("Selection #")}{String(confirmation.number).padStart(4,'0')}{' '+tr("sent")}</strong><span>{confirmation.target}{' '+tr("• Status:")+' '} <strong>{({pending:'Received',loaded:'Received',preparing:'Preparing',ready:'Ready',completed:'Completed',dismissed:'Cancelled',cancelled:'Cancelled'} as Record<string,string>)[confirmation.status]??confirmation.status}</strong>{tr(". The cashier confirms availability and payment.")}</span></div><button onClick={()=>setConfirmation(null)}><X size={17}/></button></div>}
    {error&&<div className="customer-inline-error">{tr(error)}</div>}
    <div className="customer-display-controls"><div className="customer-search"><SearchField value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr("Search products…")}/></div><div className="customer-categories">{categories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div></div>
    <div className="customer-display-layout">
      <section className="customer-product-grid">{visible.map(product=>{const option=product.option_labels?.length?(selectedOptions[product.id]||product.option_labels[0]):null;const qty=cart[cartKey(product.id,option)]??0;return <article className={`customer-product-card ${!product.available?'sold-out':''} ${product.featured?'featured-product':''}`} key={product.id} data-catalogue-product={product.id}>{product.image_url?<CustomerProductGallery product={product} token={token}/>:<div className="customer-product-emoji">{product.icon_emoji||fallbackEmoji(product.category_name)}</div>}<div className="customer-product-body"><div className="customer-product-badges">{(product.featured||(product.promotion_featured&&product.price<product.regular_price))&&<span>{tr("Featured")}</span>}{product.new_badge&&<span>{tr("New")}</span>}{product.seasonal_label&&<span>{product.seasonal_label}</span>}</div><small>{product.category_name}</small><h2>{product.name}</h2>{product.description&&<p className="customer-product-description">{product.description}</p>}{Number(product.price)<Number(product.regular_price)&&<><del>{money(Number(product.regular_price),catalog.currency)}</del><span>{tr("Promotion • until")+' '} {new Date(product.promotion_ends_at!).toLocaleString()}</span></>}<strong>{money(Number(product.price),catalog.currency)}</strong>{product.option_labels?.length>0&&<label className="customer-option-label">{tr("Option")}<select value={option??''} onChange={e=>setSelectedOptions(old=>({...old,[product.id]:e.target.value}))}>{product.option_labels.map(label=><option key={label} value={label}>{label}</option>)}</select></label>}{!product.available?<span className="customer-soldout">{tr("Sold out")}</span>:qty===0?<button className="customer-add" onClick={()=>setQty(product.id,option,1)}><Plus size={18}/>{' '+tr("Select")}</button>:<div className="customer-qty"><button aria-label={`Remove one ${product.name}`} onClick={()=>setQty(product.id,option,qty-1)}><Minus size={17}/></button><b>{qty}</b><button aria-label={`Add one ${product.name}`} onClick={()=>setQty(product.id,option,qty+1)}><Plus size={17}/></button></div>}</div></article>})}{!visible.length&&<div className="customer-empty">{tr("No products match this search.")}</div>}</section>
      <aside className="customer-selection-panel"><div className="customer-selection-title"><div><h2>{tr("Your Selection")}</h2><p>{tr("This is a request, not a completed sale.")}</p></div><ShoppingCart size={21}/></div>{lines.length?<div className="customer-selection-lines">{lines.map(line=><div key={line.key}><span><strong>{line.product.name}{line.optionLabel?` • ${line.optionLabel}`:''}</strong><small>{line.quantity} × {money(line.product.price,catalog.currency)}</small></span><b>{money(line.product.price*line.quantity,catalog.currency)}</b><button aria-label={`Remove ${line.product.name}`} onClick={()=>setQty(line.product.id,line.optionLabel,0)}><Trash2 size={16}/></button></div>)}</div>:<div className="customer-selection-empty">{tr("Select products to send them to a cashier.")}</div>}<div className="customer-selection-total"><span>{tr("Estimated total")}</span><strong>{money(total,catalog.currency)}</strong></div><label>{tr("Send to POS")}<select value={target} onChange={e=>setTarget(e.target.value)}>{catalog.targets.map(t=><option key={t} value={t}>{t}</option>)}</select></label><label>{tr("Name / pickup note (optional)")}<input value={note} maxLength={180} onChange={e=>setNote(e.target.value)} placeholder={tr("Example: Maria / table 2")}/></label><button className="customer-send" disabled={!lines.length||sending||!target} onClick={submit}><Send size={18}/>{sending?tr("Sending…"):tr("Send Selection to POS")}</button><small className="customer-disclaimer">{tr("The cashier reviews the request before checkout. Price, stock, discounts and payment are confirmed at the POS.")}</small></aside>
    </div>
  </div>
}

export function CustomerDisplaySetup({role,showToast}:{role:Role;showToast:(message:string)=>void}){
  const[,setToken]=useState('')
  const[enabled,setEnabled]=useState(true)
  const[targets,setTargets]=useState<string[]>(['Main POS'])
  const[busy,setBusy]=useState(false)
  async function load(){if(role!=='admin'||!supabase)return;setBusy(true);const{data,error}=await supabase.rpc('ensure_customer_display_config');setBusy(false);if(error)return showToast(trError(error.message));setToken(data?.access_token??'');setEnabled(data?.enabled!==false);setTargets(data?.target_labels?.length?data.target_labels:['Main POS'])}
  useEffect(()=>{void load()},[role])
  function patchTarget(index:number,value:string){setTargets(old=>old.map((x,i)=>i===index?value:x))}
  async function save(rotate=false){if(role!=='admin'||!supabase)return;const clean=targets.map(t=>t.trim()).filter(Boolean);if(!clean.length)return showToast(trError(tr("Add at least one POS station label.")));setBusy(true);const{data,error}=await supabase.rpc('update_customer_display_config',{p_enabled:enabled,p_target_labels:clean,p_rotate_token:rotate});setBusy(false);if(error)return showToast(trError(error.message));setToken(data?.access_token??'');setTargets(data?.target_labels??clean);window.dispatchEvent(new Event('counternest:catalogue-settings'));showToast(trError(rotate?tr("Customer display link rotated. Old links no longer work."):tr("Customer display settings saved.")))}
  if(role!=='admin')return <><header className="page-header"><div><h1>{tr("Display Settings")}</h1><p>{tr("Customer selection display and POS routing")}</p></div></header><div className="info-box">{tr("Administrator access is required.")}</div></>
  return <><header className="page-header"><div><h1>{tr("Display Settings")}</h1><p>{tr("Customer catalogue, QR access and counter destinations")}</p></div><button className="primary-btn" onClick={()=>save(false)} disabled={busy}>{tr("Save Setup")}</button></header><div className="info-box drawer-security"><MonitorSmartphone size={18}/><span>{tr("The customer screen never completes a sale. It creates a pending request that the selected POS station reviews and loads into New Sale.")}</span></div><section className="panel customer-display-setup"><div className="panel-title"><div><h2>{tr("Customer Display Sharing")}</h2><p className="muted">{tr("Open this on a customer-facing tablet or display using the deployed HTTPS URL.")}</p></div><label className="switch-line"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>{' '+tr("Enabled")}</label></div><div className="warning-box">{tr("Treat the link token like an internal access code. Use")+' '} <strong>{tr("Rotate Link")}</strong>{' '+tr("if a customer device is lost or the URL is shared outside the business.")}</div><button onClick={()=>{if(confirm(tr("Rotate the customer display token? Existing customer-display links will stop working.")))void save(true)}} disabled={busy}><RotateCcw size={17}/>{' '+tr("Rotate Link")}</button></section><section className="panel"><div className="panel-title"><div><h2>{tr("POS Destinations")}</h2><p className="muted">{tr("Labels must match the station label saved in POS Hardware Setup on each workstation.")}</p></div><button onClick={()=>setTargets(old=>old.length<12?[...old,`Sub POS ${old.length}`]:old)} disabled={targets.length>=12}><Plus size={16}/>{' '+tr("Add POS")}</button></div><div className="customer-target-list">{targets.map((target,index)=><div key={index}><input value={target} maxLength={60} onChange={e=>patchTarget(index,e.target.value)} placeholder={index===0?tr("Main POS"):tr("Sub POS")}/><button aria-label={tr("Remove POS destination")} disabled={targets.length===1} onClick={()=>setTargets(old=>old.filter((_,i)=>i!==index))}><Trash2 size={16}/></button></div>)}</div><div className="info-box"><strong>{tr("Example:")}</strong>{' '+tr("set the front counter Hardware Setup station label to")+' '} <code>{tr("Main POS")}</code>{tr(", then add")+' '} <code>{tr("Sub POS 1")}</code>{' '+tr("for a second counter. Customers choose where their selection should appear.")}</div></section></>
}

export function CustomerSelectionNotifier({setPage,showToast}:{setPage:(page:PageKey)=>void;showToast:(message:string)=>void}){
  const[count,setCount]=useState(0)
  const[latest,setLatest]=useState<QueueRequest|null>(null)
  const previousCount=useRef(0)
  const stationLabel=(localStorage.getItem('counternest.stationLabel')??'').trim()
  async function load(){
    if(!supabase||!stationLabel){setCount(0);setLatest(null);return}
    const{data,error}=await supabase.rpc('get_customer_selection_queue',{p_station_label:stationLabel})
    if(error)return
    const next=(data??[]) as QueueRequest[]
    if(next.length>previousCount.current){
      const added=next.length-previousCount.current
      showToast(trError(`${added} new customer selection${added===1?'':'s'} sent to ${stationLabel}.`))
    }
    previousCount.current=next.length
    setCount(next.length);setLatest(next[0]??null)
  }
  useEffect(()=>{
    previousCount.current=0
    void load()
    const timer=window.setInterval(()=>void load(),4000)
    return()=>window.clearInterval(timer)
  },[stationLabel])
  if(!stationLabel||!count)return null
  return <div className="customer-global-notice" role="status" aria-live="polite"><MonitorSmartphone size={20}/><div><strong>{count}{' '+tr("customer selection")}{count===1?'':tr("s")}{' '+tr("waiting")}</strong><small>{latest?`Latest #${String(latest.request_number).padStart(4,'0')} • ${latest.items.reduce((sum,item)=>sum+item.quantity,0)} item(s)`:stationLabel}{' '+tr("• Target:")+' '} {stationLabel}</small></div><button className="primary-btn" onClick={()=>setPage('sale')}>{tr("Open New Sale")}</button></div>
}

export function CustomerSelectionInbox({products,cart,setCart,showToast}:{products:Product[];cart:CartLine[];setCart:Dispatch<SetStateAction<CartLine[]>>;showToast:(message:string)=>void}){
  const[requests,setRequests]=useState<QueueRequest[]>([])
  const[active,setActive]=useState<QueueRequest[]>([])
  const[loading,setLoading]=useState(false)
  const stationLabel=(localStorage.getItem('counternest.stationLabel')??'').trim()
  async function load(silent=false){if(!supabase||!stationLabel)return;if(!silent)setLoading(true);const[pending,fulfillment]=await Promise.all([supabase.rpc('get_customer_selection_queue',{p_station_label:stationLabel}),supabase.rpc('get_customer_fulfillment_queue',{p_station_label:stationLabel})]);if(!silent)setLoading(false);if(!pending.error)setRequests((pending.data??[]) as QueueRequest[]);if(!fulfillment.error)setActive((fulfillment.data??[]) as QueueRequest[])}
  useEffect(()=>{void load(true);const timer=window.setInterval(()=>void load(true),4000);return()=>window.clearInterval(timer)},[stationLabel])
  async function claim(request:QueueRequest){if(!supabase)return;if(cart.length)return showToast(trError(tr("Finish or clear the current POS cart before loading a customer selection.")));const{data,error}=await supabase.rpc('claim_customer_selection',{p_request_id:request.id,p_station_label:stationLabel});if(error)return showToast(trError(error.message));const incoming=(data?.items??[]) as QueueItem[];let adjusted=false;setCart(existing=>{const map=new Map<string,CartLine>(existing.map(line=>[line.cartKey??line.id,{...line}] as [string,CartLine]));const usedByProduct=new Map<string,number>();for(const line of map.values())usedByProduct.set(line.id,(usedByProduct.get(line.id)??0)+line.qty);for(const item of incoming){const product=products.find(p=>p.id===item.product_id&&p.active);if(!product||product.stock<=0||product.catalogueSoldOut||product.catalogueVisible===false){adjusted=true;continue}const key=item.option_label?`${product.id}::${item.option_label}`:product.id;const current=map.get(key)?.qty??0;const alreadyUsed=usedByProduct.get(product.id)??0;const capacity=Math.max(0,product.stock-alreadyUsed);const addQty=Math.min(capacity,Number(item.quantity));if(addQty<Number(item.quantity))adjusted=true;if(addQty<=0)continue;map.set(key,{...product,cartKey:key,catalogOption:item.option_label??undefined,selectionRequestId:request.id,qty:current+addQty});usedByProduct.set(product.id,alreadyUsed+addQty)}return Array.from(map.values())});await load(true);showToast(trError(adjusted?tr("Customer selection loaded; unavailable quantities were adjusted to current stock."):tr("Customer selection loaded into the POS cart.")))}
  async function dismiss(request:QueueRequest){if(!supabase)return;const reason=prompt('Reason for dismissing this customer selection (optional):')??'';const{error}=await supabase.rpc('dismiss_customer_selection',{p_request_id:request.id,p_station_label:stationLabel,p_reason:reason.trim()||null});if(error)return showToast(trError(error.message));await load(true);showToast(trError(tr("Customer selection dismissed.")))}
  async function updateStatus(request:QueueRequest,status:'preparing'|'ready'|'completed'|'cancelled'){if(!supabase)return;const{error}=await supabase.rpc('update_customer_selection_status',{p_request_id:request.id,p_station_label:stationLabel,p_status:status});if(error)return showToast(trError(error.message));await load(true);showToast(trError(`Customer selection marked ${status}.`))}
  if(!stationLabel)return <section className="panel customer-inbox customer-inbox-warning"><div><MonitorSmartphone size={20}/><span><strong>{tr("Customer selections are not routed to this POS yet.")}</strong><small>{tr("Set this workstation’s Station label in POS Hardware Setup, then use the same label in Display Settings.")}</small></span></div></section>
  return <section className={`panel customer-inbox ${requests.length?'has-requests':''}`}><div className="panel-title"><div><h2>{tr("Customer Selections")+' '} {requests.length?`(${requests.length})`:''}</h2><p className="muted">{tr("Target:")+' '} {stationLabel}{tr(". New requests are checked automatically.")}</p></div><button onClick={()=>load(false)} disabled={loading}><RefreshCw size={16}/>{loading?tr("Checking…"):tr("Refresh")}</button></div>{requests.length?<div className="customer-request-list">{requests.map(request=><article key={request.id}><div className="customer-request-head"><div><strong>{tr("Selection #")}{String(request.request_number).padStart(4,'0')}</strong><small>{new Date(request.created_at).toLocaleTimeString()} • {request.customer_note||tr("No customer note")}</small></div><b>{request.items.reduce((sum,i)=>sum+i.quantity,0)}{' '+tr("item(s)")}</b></div><div className="customer-request-items">{request.items.map(item=><span key={`${item.product_id}:${item.option_label??''}`}>{item.quantity}× {item.product_name}{item.option_label?` • ${item.option_label}`:''}</span>)}</div><div className="customer-request-actions"><button onClick={()=>dismiss(request)}>{tr("Dismiss")}</button><button className="primary-btn" disabled={cart.length>0} title={cart.length?tr("Finish or clear the current cart first."):''} onClick={()=>claim(request)}><ShoppingCart size={16}/>{' '+tr("Load into Cart")}</button></div></article>)}</div>:<div className="customer-inbox-empty"><CheckCircle2 size={19}/><span>{tr("No pending customer selections for this POS.")}</span></div>}{active.length>0&&<div className="customer-fulfillment-list"><h3>{tr("Fulfillment status")}</h3>{active.map(request=><article key={request.id}><div><strong>{tr("Selection #")}{String(request.request_number).padStart(4,'0')}</strong><small>{tr("Status:")+' '} {systemLabel(request.status)}</small></div><div className="customer-request-actions">{request.status==='loaded'&&<button onClick={()=>void updateStatus(request,'preparing')}>{tr("Start Preparing")}</button>}{request.status==='preparing'&&<button onClick={()=>void updateStatus(request,'ready')}>{tr("Mark Ready")}</button>}{request.status==='ready'&&<button className="primary-btn" onClick={()=>void updateStatus(request,'completed')}>{tr("Complete")}</button>}<button onClick={()=>void updateStatus(request,'cancelled')}>{tr("Cancel")}</button></div></article>)}</div>}</section>
}

function CustomerProductGallery({product}:{product:CatalogProduct;token:string}){
 const[index,setIndex]=useState(0)
 const photos=product.catalogue_media?.length?product.catalogue_media:[{url:product.image_url!}]
 return <div className="customer-gallery"><img src={photos[Math.min(index,photos.length-1)].url} alt={product.name}/>{photos.length>1&&<div>{photos.map((p,i)=><button key={p.url} aria-label={`View photo ${i+1} of ${product.name}`} onClick={()=>setIndex(i)} className={i===index?'active':''}>{i+1}</button>)}</div>}{product.catalogue_label_url&&<details><summary>{tr("Product label")}</summary><img src={product.catalogue_label_url} alt={`${product.name} label`}/></details>}</div>
}
