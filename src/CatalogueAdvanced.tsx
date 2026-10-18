import {productGallery} from './productGallery'
import {FormField,InputField,SelectField} from './Fields'
import {Button} from './Button'
import {useDialogFocus} from './useDialogFocus'
import {Card} from './Surface'
import {trError,tr} from './i18n'
import {randomId} from './id'
import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'
import ImageCropper from './ImageCropper'
import {validateImageFile,renderImageCrop} from './cropHelpers'

export type MediaPhoto={url:string;original_image?:string;cropped_catalogue_image?:string;caption?:string}
export type AdvancedProduct={id:string;name:string;regular_price:number;image_url:string|null;original_image?:string|null;cropped_catalogue_image?:string|null;catalogue_media:MediaPhoto[];catalogue_label_url:string|null;promotion_kind:string|null;promotion_value:number|null;promotion_starts_at:string|null;promotion_ends_at:string|null;promotion_featured:boolean}

export async function processCataloguePhoto(file:File,crop:boolean):Promise<Blob>{
 validateImageFile(file)
 if(crop)return renderImageCrop(file,3/4,1,.5,.5)
 const bitmap=await createImageBitmap(file);const aspect=bitmap.width/bitmap.height;bitmap.close()
 return renderImageCrop(file,aspect,1,.5,.5)
}

export function CatalogueMediaPromotion({product,onSaved,photosOnly=false}:{product:AdvancedProduct;onSaved:()=>Promise<void>;photosOnly?:boolean}){
 const[photos,setPhotos]=useState<MediaPhoto[]>(()=>productGallery(product))
 const[editing,setEditing]=useState<number|null>(null),[fullPhoto,setFullPhoto]=useState<MediaPhoto|null>(null)
 const[label,setLabel]=useState(product.catalogue_label_url)
 const[cropFile,setCropFile]=useState<File|null>(null),[pending,setPending]=useState<Blob|null>(null),[preview,setPreview]=useState('')
 const[originalFile,setOriginalFile]=useState<File|null>(null)
 const[asLabel,setAsLabel]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const[kind,setKind]=useState(product.promotion_kind??'')
 const[value,setValue]=useState(String(product.promotion_value??''))
 const local=(s:string|null)=>s?new Date(new Date(s).getTime()-new Date(s).getTimezoneOffset()*60000).toISOString().slice(0,16):''
 const[start,setStart]=useState(local(product.promotion_starts_at)),[end,setEnd]=useState(local(product.promotion_ends_at))
 const[featured,setFeatured]=useState(product.promotion_featured??false)
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
 function choose(file:File){setError('');try{validateImageFile(file);setCropFile(file)}catch(e){setError(trError(e instanceof Error?e.message:String(e)))}}
 function acceptCrop(blob:Blob){setOriginalFile(cropFile);if(preview)URL.revokeObjectURL(preview);setPending(blob);setPreview(URL.createObjectURL(blob));setCropFile(null)}
 async function upload(){if(!supabase||!pending)return;setBusy(true);setError(trError(''));let storagePath='';let originalPath='';let registered=false;try{
  const profile=await supabase.from('staff_profiles').select('shop_id').eq('user_id',(await supabase.auth.getUser()).data.user!.id).single();if(profile.error)throw profile.error
  storagePath=`${profile.data.shop_id}/${product.id}/${randomId()}.jpg`
  const result=await supabase.storage.from('catalogue-media').upload(storagePath,pending,{contentType:'image/jpeg',upsert:false});if(result.error)throw result.error
  const url=supabase.storage.from('catalogue-media').getPublicUrl(storagePath).data.publicUrl
  let originalUrl=url
  if(originalFile){originalPath=`${profile.data.shop_id}/${product.id}/${randomId()}-original.${originalFile.name.split('.').pop()||'jpg'}`;const originalUpload=await supabase.storage.from('catalogue-media').upload(originalPath,originalFile,{contentType:originalFile.type,upsert:false});if(originalUpload.error)throw originalUpload.error;originalUrl=supabase.storage.from('catalogue-media').getPublicUrl(originalPath).data.publicUrl}
  const newPhoto={url,original_image:originalUrl,cropped_catalogue_image:url};const next=asLabel?photos:editing===null?[...photos,newPhoto]:photos.map((p,i)=>i===editing?{...newPhoto,caption:p.caption}:p),nextLabel=asLabel?originalUrl:label
  const saved=await supabase.rpc('save_catalogue_media',{p_product_id:product.id,p_media:next,p_label_url:nextLabel});if(saved.error)throw saved.error;registered=true
  if(asLabel&&originalUrl!==url)await supabase.storage.from('catalogue-media').remove([storagePath])
  setPhotos(next);setLabel(nextLabel);setEditing(null);setPending(null);setOriginalFile(null);URL.revokeObjectURL(preview);setPreview('');await onSaved()
 }catch(e){if(storagePath&&!registered)await supabase.storage.from('catalogue-media').remove([storagePath,...(originalPath?[originalPath]:[])]);setError(trError(e instanceof Error?e.message:String(e)))}finally{setBusy(false)}}
 async function saveMedia(next:MediaPhoto[],nextLabel=label){if(!supabase)return;setBusy(true);setError(trError(''));const result=await supabase.rpc('save_catalogue_media',{p_product_id:product.id,p_media:next,p_label_url:nextLabel});if(result.error)setError(trError(result.error.message));else{setPhotos(next);setLabel(nextLabel);await onSaved()}setBusy(false)}
 async function savePromotion(){if(!supabase)return;setError(trError(''));if(kind&&(!start||!end||new Date(end)<=new Date(start)||!Number.isFinite(Number(value))||value.trim()===''||Number(value)<0||(kind==='percent'&&Number(value)>100)||(kind==='fixed'&&Number(value)>product.regular_price))){setError(trError(tr("Enter a valid discount or special price and an end time after the start.")));return}setBusy(true);const result=await supabase.rpc('save_catalogue_promotion',{p_product_id:product.id,p_kind:kind||null,p_value:kind?Number(value):null,p_starts_at:kind?new Date(start).toISOString():null,p_ends_at:kind?new Date(end).toISOString():null,p_featured:featured});if(result.error)setError(trError(result.error.message));else await onSaved();setBusy(false)}
 async function editPhoto(photo:MediaPhoto,index:number){setBusy(true);setError('');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(photo.original_image||photo.url,{signal:controller.signal,credentials:'omit'});if(!response.ok)throw Error('Unable to load photo for editing.');const blob=await response.blob();const file=new File([blob],'original-photo.'+(blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg'),{type:blob.type});validateImageFile(file);setEditing(index);setAsLabel(false);choose(file)}catch(e){setError(trError(e instanceof Error?e.message:String(e)))}finally{clearTimeout(timer);setBusy(false)}}
 function movePhoto(index:number,direction:number){const next=[...photos],to=index+direction;if(to<0||to>=next.length)return;[next[index],next[to]]=[next[to],next[index]];void saveMedia(next)}
 return <section className="catalogue-advanced"><h3>{tr('Product Images')} — {photos.length} {tr('uploaded')}</h3><p className="muted">{tr('Gallery changes save immediately. Product details use Save Product.')}</p><p>{tr("First photo is the primary catalogue photo. Removing a gallery entry preserves its stored image for older documents.")}</p>{product.image_url&&!photos.length&&<p>{tr("Existing product photo stays until a gallery is saved.")}</p>}
 <div className="catalogue-photo-list">{photos.map((photo,index)=><div className="gallery-photo" key={photo.url}>
 <Button variant="ghost" aria-label={tr('Full preview')+' · '+product.name+' · '+(index+1)} onClick={()=>setFullPhoto(photo)}><img loading="lazy" src={photo.url} alt={photo.caption||product.name}/></Button>
 <small>{index===0?tr("Primary"):tr('Photo')+' '+(index+1)}</small><div className="gallery-actions">
 <Button disabled={busy} onClick={()=>setFullPhoto(photo)}>{tr('Full preview')}</Button>
 <Button disabled={busy||!!pending} onClick={()=>void editPhoto(photo,index)}>{tr('Edit / crop')}</Button>
 <FormField className="cn-button cn-button--secondary">{tr('Replace photo')}<InputField type="file" className="cn-file-input" aria-label={tr('Replace photo')+' '+(index+1)} accept="image/jpeg,image/png,image/webp" disabled={busy||!!pending} onChange={e=>{const f=e.target.files?.[0];if(f){setEditing(index);setAsLabel(false);choose(f)}e.target.value=''}}/></FormField>
 <Button disabled={busy||!!pending||index===0} onClick={()=>void saveMedia([photo,...photos.filter((_,i)=>i!==index)])}>{tr("Make primary")}</Button>
 <Button aria-label={tr('Move earlier')+' '+(index+1)} disabled={busy||!!pending||index===0} onClick={()=>void movePhoto(index,-1)}>{tr('Move earlier')}</Button>
 <Button aria-label={tr('Move later')+' '+(index+1)} disabled={busy||!!pending||index===photos.length-1} onClick={()=>void movePhoto(index,1)}>{tr('Move later')}</Button>
 <Button variant="danger" disabled={busy||!!pending} onClick={()=>{if(confirm(tr('Remove this photo from the gallery? The stored original is retained.')))void saveMedia(photos.filter((_,i)=>i!==index))}}>{tr("Remove")}</Button>
 </div></div>)}</div>
 {fullPhoto&&<GalleryPreview photo={fullPhoto} name={product.name} close={()=>setFullPhoto(null)}/>}
 {label&&<div><img className="catalogue-label" src={label} alt={tr("Product label")}/><Button variant="secondary" type="button" disabled={busy} onClick={()=>void saveMedia(photos,null)}>{tr("Remove label")}</Button></div>}
 <FormField><InputField type="checkbox" disabled={busy||!!pending||editing!==null} checked={asLabel} onChange={e=>setAsLabel(e.target.checked)}/>{' '+tr("Upload as product label")}</FormField><p>{tr('Every new photo opens the crop editor before upload. Existing stored images are preserved.')}</p>
 <InputField type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!!pending||(!asLabel&&photos.length>=32)} onChange={e=>{const f=e.target.files?.[0];if(f){setEditing(null);void choose(f)}e.target.value=''}}/>
 {preview&&<div><img className="catalogue-label" src={preview} alt={tr("Processed upload preview")}/><small>{tr("Preview •")+' '} {Math.round((pending?.size??0)/1024)}{' '+tr("KB")}</small><Button variant="secondary" type="button" disabled={busy} onClick={()=>void upload()}>{tr(editing===null?'Upload preview':'Save photo replacement')}</Button><Button disabled={busy} onClick={()=>{setPending(null);setEditing(null);setOriginalFile(null);setPreview('')}}>{tr('Cancel')}</Button></div>}
 {cropFile&&<ImageCropper file={cropFile} onCancel={()=>{setCropFile(null);setEditing(null)}} onSave={acceptCrop}/>}
 {!photosOnly&&<><h3>{tr("Scheduled promotion")}</h3><p>{tr("Regular price:")+' '} {Number(product.regular_price).toFixed(2)}{tr(". Times use this device’s local timezone; the server enforces the schedule.")}</p><div className="form-grid"><FormField>{tr("Type")}<SelectField value={kind} onChange={e=>setKind(e.target.value)}><option value="">{tr("No promotion")}</option><option value="fixed">{tr("Fixed special price")}</option><option value="percent">{tr("Percentage discount")}</option></SelectField></FormField>{kind&&<><FormField>{kind==='percent'?tr("Discount %"):tr("Special price")}<InputField type="number" min="0" max={kind==='percent'?100:product.regular_price} step="0.01" value={value} onChange={e=>setValue(e.target.value)}/></FormField><FormField>{tr("Start")}<InputField type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></FormField><FormField>{tr("End")}<InputField type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></FormField><FormField><InputField type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)}/>{' '+tr("Featured promotion")}</FormField></>}</div>
 <Button variant="secondary" type="button" disabled={busy} onClick={()=>void savePromotion()}>{busy?tr("Saving…"):tr("Save promotion")}</Button></>}{error&&<p role="alert" className="warning-box">{tr(error)}</p>}</section>
}

type Metric={id:string;name:string;category:string;views:number;featured_views:number;soldout_views:number;requests:number;selected_qty:number;converted_requests:number;conversion_percent:number;abandoned_qty:number;sold_qty:number;featured_selected_qty:number;featured_converted_requests:number}
type History={id:string;name:string;changed_at:string;before_values:unknown;after_values:unknown}
export function CatalogueAnalytics(){
 const[from,setFrom]=useState(new Date(Date.now()-29*86400000).toISOString().slice(0,10)),[to,setTo]=useState(new Date().toISOString().slice(0,10))
 const[rows,setRows]=useState<Metric[]>([]),[history,setHistory]=useState<History[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function load(){if(!supabase)return;setBusy(true);setError(trError(''));const result=await supabase.rpc('get_catalogue_analytics',{p_from:new Date(`${from}T00:00:00`).toISOString(),p_to:(()=>{const d=new Date(`${to}T00:00:00`);d.setDate(d.getDate()+1);return d.toISOString()})()});if(result.error)setError(trError(result.error.message));else{setRows(result.data.products??[]);setHistory(result.data.price_history??[])}setBusy(false)}
 const categories=Array.from(new Set(rows.map(r=>r.category)))
 const sum=(items:Metric[],key:keyof Metric)=>items.reduce((n,r)=>n+Number(r[key]),0)
 function exportCsv(){const fields=['name','category','views','featured_views','featured_selected_qty','featured_converted_requests','soldout_views','requests','selected_qty','converted_requests','conversion_percent','abandoned_qty','sold_qty'] as const;const safe=(x:unknown)=>`"${String(x??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')}"`;const blob=new Blob([fields.join(',')+'\n'+rows.map(r=>fields.map(k=>safe(r[k])).join(',')).join('\n')],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='catalogue-analytics.csv';a.click();URL.revokeObjectURL(url)}
 return <Card className="panel"><h2>{tr("Catalogue analytics & price history")}</h2><div className="report-actions"><FormField>{tr("From")}<InputField type="date" value={from} onChange={e=>setFrom(e.target.value)}/></FormField><FormField>{tr("Through")}<InputField type="date" value={to} onChange={e=>setTo(e.target.value)}/></FormField><Button type="submit" variant="secondary" disabled={busy} onClick={()=>void load()}>{busy?tr("Loading…"):tr("Load analytics")}</Button><Button type="submit" variant="secondary" disabled={!rows.length} onClick={exportCsv}>{tr("Export CSV")}</Button></div><p>{tr("Views are unique product impressions per anonymous browser session per UTC day, recorded when cards enter the screen. Sold-out counts are observations, not outage duration. Conversion links submitted requests to paid sales; refunded/voided sales are excluded. Partial refunds remain converted. Abandoned means cancelled/dismissed, or unpaid after 30 minutes; this can change when paid later.")}</p>{error&&<p role="alert">{tr(error)}</p>}
 <div className="table-wrap"><table><thead><tr>{['Product','Category','Views','Featured views','Sold-out views','Selected units','Paid requests','Conversion %','Abandoned units'].map(h=><th key={h}>{tr(h)}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.category}</td><td>{r.views}</td><td>{r.featured_views}</td><td>{r.soldout_views}</td><td>{r.selected_qty}</td><td>{r.converted_requests}/{r.requests}</td><td>{r.conversion_percent}%</td><td>{r.abandoned_qty}</td></tr>)}</tbody></table></div>
 <h3>{tr("Category performance")}</h3>{categories.map(c=>{const items=rows.filter(r=>r.category===c);return <p key={c}><strong>{c}</strong> — {sum(items,'views')}{' '+tr("views •")+' '} {sum(items,'selected_qty')}{' '+tr("selected units •")+' '} {sum(items,'sold_qty')}{' '+tr("units in paid selections")}</p>})}<h3>{tr("Featured-product performance")}</h3><p>{sum(rows,'featured_views')}{' '+tr("featured impressions •")+' '} {sum(rows,'featured_selected_qty')}{' '+tr("units selected while featured •")+' '} {sum(rows,'featured_converted_requests')}{' '+tr("paid product/request pairs selected while featured")}</p><h3>{tr("Rarely selected")}</h3><p>{rows.filter(r=>Number(r.selected_qty)===0).map(r=>r.name).join(', ')||tr("No zero-selection products in this range.")}</p>
 <h3>{tr("Price changes (latest 100 in range)")}</h3>{history.map(h=><details key={h.id}><summary>{new Date(h.changed_at).toLocaleString()} • {h.name}</summary><pre>{JSON.stringify({before:h.before_values,after:h.after_values},null,2)}</pre></details>)}</Card>
}

function GalleryPreview({photo,name,close}:{photo:MediaPhoto;name:string;close:()=>void}){const ref=useDialogFocus(close);return <div className="modal-backdrop"><section className="modal cn-gallery-preview" ref={ref} role="dialog" aria-modal="true" aria-label={tr('Full preview')}><div className="panel-title"><h2>{name}</h2><Button data-back-close="true" aria-label={tr('Close')} onClick={close}>{tr('Close')}</Button></div><img src={photo.original_image||photo.url} alt={photo.caption||name}/></section></div>}
