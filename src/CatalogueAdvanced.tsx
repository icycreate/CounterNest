import {randomId} from './id'
import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'

export type MediaPhoto={url:string;caption?:string}
export type AdvancedProduct={id:string;name:string;regular_price:number;image_url:string|null;catalogue_media:MediaPhoto[];catalogue_label_url:string|null;promotion_kind:string|null;promotion_value:number|null;promotion_starts_at:string|null;promotion_ends_at:string|null;promotion_featured:boolean}

export async function processCataloguePhoto(file:File,crop:boolean):Promise<Blob>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw new Error('Choose a JPG, PNG or WebP image under 12 MB.')
 const bitmap=await createImageBitmap(file)
 try{
  const side=Math.min(bitmap.width,bitmap.height)
  const width=crop?side:bitmap.width,height=crop?side:bitmap.height
  const scale=Math.min(1,1600/Math.max(width,height))
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale))
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image processing is unavailable in this browser.')
  ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height)
  ctx.drawImage(bitmap,crop?(bitmap.width-side)/2:0,crop?(bitmap.height-side)/2:0,width,height,0,0,canvas.width,canvas.height)
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b&&b.size<=2*1024*1024?resolve(b):reject(new Error('Image remains too large. Choose a smaller photo.')),'image/jpeg',0.86))
 }finally{bitmap.close()}
}

export function CatalogueMediaPromotion({product,onSaved}:{product:AdvancedProduct;onSaved:()=>Promise<void>}){
 const[photos,setPhotos]=useState<MediaPhoto[]>(product.catalogue_media??[])
 const[label,setLabel]=useState(product.catalogue_label_url)
 const[crop,setCrop]=useState(false),[pending,setPending]=useState<Blob|null>(null),[preview,setPreview]=useState('')
 const[asLabel,setAsLabel]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const[kind,setKind]=useState(product.promotion_kind??'')
 const[value,setValue]=useState(String(product.promotion_value??''))
 const local=(s:string|null)=>s?new Date(new Date(s).getTime()-new Date(s).getTimezoneOffset()*60000).toISOString().slice(0,16):''
 const[start,setStart]=useState(local(product.promotion_starts_at)),[end,setEnd]=useState(local(product.promotion_ends_at))
 const[featured,setFeatured]=useState(product.promotion_featured??false)
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
 async function choose(file:File){setError('');try{const blob=await processCataloguePhoto(file,crop);if(preview)URL.revokeObjectURL(preview);setPending(blob);setPreview(URL.createObjectURL(blob))}catch(e){setError(e instanceof Error?e.message:String(e))}}
 async function upload(){if(!supabase||!pending)return;setBusy(true);setError('');let storagePath='';let registered=false;try{
  const profile=await supabase.from('staff_profiles').select('shop_id').eq('user_id',(await supabase.auth.getUser()).data.user!.id).single();if(profile.error)throw profile.error
  storagePath=`${profile.data.shop_id}/${product.id}/${randomId()}.jpg`
  const result=await supabase.storage.from('catalogue-media').upload(storagePath,pending,{contentType:'image/jpeg',upsert:false});if(result.error)throw result.error
  const url=supabase.storage.from('catalogue-media').getPublicUrl(storagePath).data.publicUrl
  const next=asLabel?photos:[...photos,{url}],nextLabel=asLabel?url:label
  const saved=await supabase.rpc('save_catalogue_media',{p_product_id:product.id,p_media:next,p_label_url:nextLabel});if(saved.error)throw saved.error;registered=true
  setPhotos(next);setLabel(nextLabel);setPending(null);URL.revokeObjectURL(preview);setPreview('');await onSaved()
 }catch(e){if(storagePath&&!registered)await supabase.storage.from('catalogue-media').remove([storagePath]);setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 async function saveMedia(next:MediaPhoto[],nextLabel=label){if(!supabase)return;setBusy(true);setError('');const result=await supabase.rpc('save_catalogue_media',{p_product_id:product.id,p_media:next,p_label_url:nextLabel});if(result.error)setError(result.error.message);else{setPhotos(next);setLabel(nextLabel);await onSaved()}setBusy(false)}
 async function savePromotion(){if(!supabase)return;setError('');if(kind&&(!start||!end||new Date(end)<=new Date(start)||!Number.isFinite(Number(value))||value.trim()===''||Number(value)<0||(kind==='percent'&&Number(value)>100)||(kind==='fixed'&&Number(value)>product.regular_price))){setError('Enter a valid discount or special price and an end time after the start.');return}setBusy(true);const result=await supabase.rpc('save_catalogue_promotion',{p_product_id:product.id,p_kind:kind||null,p_value:kind?Number(value):null,p_starts_at:kind?new Date(start).toISOString():null,p_ends_at:kind?new Date(end).toISOString():null,p_featured:featured});if(result.error)setError(result.error.message);else await onSaved();setBusy(false)}
 return <section className="catalogue-advanced"><h3>Product photos & label</h3><p>First photo is the primary catalogue photo. Removing a gallery entry preserves its stored image for older documents.</p>{product.image_url&&!photos.length&&<p>Existing product photo stays until a gallery is saved.</p>}
 <div className="catalogue-photo-list">{photos.map((photo,index)=><div key={photo.url}><img src={photo.url} alt={photo.caption||product.name}/><small>{index===0?'Primary':`Photo ${index+1}`}</small><button type="button" disabled={busy||index===0} onClick={()=>void saveMedia([photo,...photos.filter((_,i)=>i!==index)])}>Make primary</button><button type="button" disabled={busy} onClick={()=>void saveMedia(photos.filter((_,i)=>i!==index))}>Remove</button></div>)}</div>
 {label&&<div><img className="catalogue-label" src={label} alt="Product label"/><button type="button" disabled={busy} onClick={()=>void saveMedia(photos,null)}>Remove label</button></div>}
 <label><input type="checkbox" checked={crop} onChange={e=>setCrop(e.target.checked)}/> Center crop to square before choosing a photo</label><label><input type="checkbox" checked={asLabel} onChange={e=>setAsLabel(e.target.checked)}/> Upload as product label</label>
 <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||(!asLabel&&photos.length>=8)} onChange={e=>{const f=e.target.files?.[0];if(f)void choose(f);e.target.value=''}}/>
 {preview&&<div><img className="catalogue-label" src={preview} alt="Processed upload preview"/><small>Preview • {Math.round((pending?.size??0)/1024)} KB</small><button type="button" disabled={busy} onClick={()=>void upload()}>Upload preview</button></div>}
 <h3>Scheduled promotion</h3><p>Regular price: {Number(product.regular_price).toFixed(2)}. Times use this device’s local timezone; the server enforces the schedule.</p><div className="form-grid"><label>Type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="">No promotion</option><option value="fixed">Fixed special price</option><option value="percent">Percentage discount</option></select></label>{kind&&<><label>{kind==='percent'?'Discount %':'Special price'}<input type="number" min="0" max={kind==='percent'?100:product.regular_price} step="0.01" value={value} onChange={e=>setValue(e.target.value)}/></label><label>Start<input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label><label>End<input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></label><label><input type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)}/> Featured promotion</label></>}</div>
 {error&&<p role="alert" className="warning-box">{error}</p>}<button type="button" disabled={busy} onClick={()=>void savePromotion()}>{busy?'Saving…':'Save promotion'}</button></section>
}

type Metric={id:string;name:string;category:string;views:number;featured_views:number;soldout_views:number;requests:number;selected_qty:number;converted_requests:number;conversion_percent:number;abandoned_qty:number;sold_qty:number;featured_selected_qty:number;featured_converted_requests:number}
type History={id:string;name:string;changed_at:string;before_values:unknown;after_values:unknown}
export function CatalogueAnalytics(){
 const[from,setFrom]=useState(new Date(Date.now()-29*86400000).toISOString().slice(0,10)),[to,setTo]=useState(new Date().toISOString().slice(0,10))
 const[rows,setRows]=useState<Metric[]>([]),[history,setHistory]=useState<History[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function load(){if(!supabase)return;setBusy(true);setError('');const result=await supabase.rpc('get_catalogue_analytics',{p_from:new Date(`${from}T00:00:00`).toISOString(),p_to:(()=>{const d=new Date(`${to}T00:00:00`);d.setDate(d.getDate()+1);return d.toISOString()})()});if(result.error)setError(result.error.message);else{setRows(result.data.products??[]);setHistory(result.data.price_history??[])}setBusy(false)}
 const categories=Array.from(new Set(rows.map(r=>r.category)))
 const sum=(items:Metric[],key:keyof Metric)=>items.reduce((n,r)=>n+Number(r[key]),0)
 function exportCsv(){const fields=['name','category','views','featured_views','featured_selected_qty','featured_converted_requests','soldout_views','requests','selected_qty','converted_requests','conversion_percent','abandoned_qty','sold_qty'] as const;const safe=(x:unknown)=>`"${String(x??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')}"`;const blob=new Blob([fields.join(',')+'\n'+rows.map(r=>fields.map(k=>safe(r[k])).join(',')).join('\n')],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='catalogue-analytics.csv';a.click();URL.revokeObjectURL(url)}
 return <section className="panel"><h2>Catalogue analytics & price history</h2><div className="report-actions"><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Through<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button disabled={busy} onClick={()=>void load()}>{busy?'Loading…':'Load analytics'}</button><button disabled={!rows.length} onClick={exportCsv}>Export CSV</button></div><p>Views are unique product impressions per anonymous browser session per UTC day, recorded when cards enter the screen. Sold-out counts are observations, not outage duration. Conversion links submitted requests to paid sales; refunded/voided sales are excluded. Partial refunds remain converted. Abandoned means cancelled/dismissed, or unpaid after 30 minutes; this can change when paid later.</p>{error&&<p role="alert">{error}</p>}
 <div className="table-wrap"><table><thead><tr>{['Product','Category','Views','Featured views','Sold-out views','Selected units','Paid requests','Conversion %','Abandoned units'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.category}</td><td>{r.views}</td><td>{r.featured_views}</td><td>{r.soldout_views}</td><td>{r.selected_qty}</td><td>{r.converted_requests}/{r.requests}</td><td>{r.conversion_percent}%</td><td>{r.abandoned_qty}</td></tr>)}</tbody></table></div>
 <h3>Category performance</h3>{categories.map(c=>{const items=rows.filter(r=>r.category===c);return <p key={c}><strong>{c}</strong> — {sum(items,'views')} views • {sum(items,'selected_qty')} selected units • {sum(items,'sold_qty')} units in paid selections</p>})}<h3>Featured-product performance</h3><p>{sum(rows,'featured_views')} featured impressions • {sum(rows,'featured_selected_qty')} units selected while featured • {sum(rows,'featured_converted_requests')} paid product/request pairs selected while featured</p><h3>Rarely selected</h3><p>{rows.filter(r=>Number(r.selected_qty)===0).map(r=>r.name).join(', ')||'No zero-selection products in this range.'}</p>
 <h3>Price changes (latest 100 in range)</h3>{history.map(h=><details key={h.id}><summary>{new Date(h.changed_at).toLocaleString()} • {h.name}</summary><pre>{JSON.stringify({before:h.before_values,after:h.after_values},null,2)}</pre></details>)}</section>
}
