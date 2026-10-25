import {useEffect,useRef,useState} from 'react'
import {Button} from './Button'
import {FormField,InputField,TextAreaField,SelectField} from './Fields'
import {supabase} from './lib/supabase'
import {tr,trError,useUiLanguage,languageOptions} from './i18n'
import type {UiLanguage} from './i18n'
import ImageCropper from './ImageCropper'
import {validateImageFile} from './cropHelpers'
import {randomId} from './id'
import {resetUnsaved,registerUnsavedGuard} from './appNavigation'
import './catalogueAbout.css'

type Copy={heading:string;intro:string;story:string;alt:string}
type About={enabled:boolean;default_language:UiLanguage;copy:Copy;translations:Partial<Record<UiLanguage,Copy>>;image_path:string|null}
type RecordValue={value:About;revision:number;shop_id:string}
const blankCopy:Copy={heading:'',intro:'',story:'',alt:''}
const empty:About={enabled:false,default_language:'en',copy:blankCopy,translations:{},image_path:null}
function useImage(path:string|null){
 const[url,setUrl]=useState('')
 useEffect(()=>{let live=true;setUrl('');async function load(){if(!path||!supabase)return;const r=await supabase.storage.from('catalogue-about').createSignedUrl(path,3600);if(live)setUrl(r.data?.signedUrl??'')};void load();const timer=window.setInterval(()=>void load(),3000000);return()=>{live=false;clearInterval(timer)}},[path]);return url
}
function AboutView({value,image,language}:{value:About;image:string;language:UiLanguage}){
 const localized=language===value.default_language?undefined:value.translations[language]
 const copy={...value.copy};for(const key of ['heading','intro','story','alt'] as const)if(localized?.[key]?.trim())copy[key]=localized[key]
 if(!value.enabled||!(copy.heading||copy.intro||copy.story||image))return null
 return <section className="catalogue-about" aria-label={tr('About Us')}><h2>{copy.heading||tr('About Us')}</h2>{copy.intro&&<p className="catalogue-about-intro">{copy.intro}</p>}<div className={image?'catalogue-about-grid':''}>{image&&<img src={image} alt={copy.alt} loading="lazy"/>}{copy.story&&<div className="catalogue-about-story">{copy.story}</div>}</div></section>
}
export function PublicCatalogueAbout({token}:{token:string}){
 const[value,setValue]=useState<About|null>(null),language=useUiLanguage();const image=useImage(value?.image_path??null)
 useEffect(()=>{let live=true;setValue(null);async function load(){if(!supabase)return;const r=await supabase.rpc('get_catalogue_about',{p_token:token});if(live)setValue(r.error?null:r.data)};void load();const timer=setInterval(()=>{if(document.visibilityState==='visible')void load()},60000);return()=>{live=false;clearInterval(timer)}},[token])
 return value?<AboutView value={value} image={image} language={language}/>:null
}
export function CatalogueAboutEditor(){
 const[record,setRecord]=useState<RecordValue|null>(null),[draft,setDraft]=useState<About>(empty),[language,setLanguage]=useState<UiLanguage>('en'),[file,setFile]=useState<File|null>(null),[crop,setCrop]=useState<Blob|null>(null),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[showPreview,setShowPreview]=useState(false)
 const scope=useRef<HTMLElement>(null),image=useImage(draft.image_path),dirty=!!record&&(JSON.stringify(draft)!==JSON.stringify(record.value)||!!crop||!!file)
 useUiLanguage()
 useEffect(()=>{let live=true;void supabase?.rpc('get_catalogue_about_admin').then(r=>{if(!live)return;if(r.error)setError(trError(r.error.message));else{setRecord(r.data);setDraft(r.data.value);setLanguage(r.data.value.default_language)}});return()=>{live=false}},[])
 useEffect(()=>{if(!crop){setPreview('');return}const url=URL.createObjectURL(crop);setPreview(url);return()=>URL.revokeObjectURL(url)},[crop])
 useEffect(()=>{if(!dirty&&scope.current)resetUnsaved(scope.current)},[dirty,record])
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty||busy){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty,busy])
 useEffect(()=>{if(scope.current)return registerUnsavedGuard(scope.current,()=>dirty||busy)},[dirty,busy])
 const copy=language===draft.default_language?draft.copy:draft.translations[language]??blankCopy
 function change(key:keyof Copy,value:string){setMessage('');setDraft(old=>language===old.default_language?{...old,copy:{...old.copy,[key]:value}}:{...old,translations:{...old.translations,[language]:{...(old.translations[language]??blankCopy),[key]:value}}})}
 function cancel(){if(dirty&&!confirm(tr('Discard unsaved About Us changes?')))return;if(record)setDraft(record.value);setCrop(null);setFile(null);setMessage('');setError('')}
 async function recrop(){if(!image||busy)return;setBusy(true);setError('');try{const response=await fetch(image,{credentials:'omit'});if(!response.ok)throw Error('Unable to load photo for editing.');const blob=await response.blob();const selected=new File([blob],'about.jpg',{type:blob.type});validateImageFile(selected);setFile(selected)}catch(e){setError(trError((e as Error).message))}finally{setBusy(false)}}
 async function save(){if(!supabase||!record||busy)return;setBusy(true);setError('');setMessage('');try{
  if(draft.enabled&&!draft.copy.heading.trim())throw Error('Enter an About Us heading.')
  let path=draft.image_path
  if(crop){validateImageFile(crop);path=`${record.shop_id}/${randomId()}.jpg`;const upload=await supabase.storage.from('catalogue-about').upload(path,crop,{contentType:'image/jpeg',upsert:false});if(upload.error)throw upload.error}
  const next={...draft,image_path:path};const r=await supabase.rpc('save_catalogue_about',{p_value:next,p_revision:record.revision});if(r.error)throw r.error
  setRecord(r.data);setDraft(r.data.value);setCrop(null);setMessage(tr('About Us saved.'))
 }catch(e){setError(trError(tr((e as Error).message)))}finally{setBusy(false)}}
 return <section ref={scope} data-unsaved-scope className="catalogue-about-editor"><h3>{tr('About Us')}</h3><input type="hidden" value={JSON.stringify(draft)+String(!!crop)+String(!!file)} onChange={()=>{}}/>
 <fieldset disabled={busy||!record}><FormField><InputField type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>{tr('Show About Us')}</FormField>
 <FormField label={tr('Default content language')}><SelectField value={draft.default_language} onChange={e=>{const next=e.target.value as UiLanguage;setDraft(old=>({...old,default_language:next,copy:old.translations[next]??old.copy,translations:{...old.translations,[old.default_language]:old.copy}}));setLanguage(next)}}>{languageOptions.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}</SelectField></FormField>
 <FormField label={tr('Edit content language')}><SelectField value={language} onChange={e=>setLanguage(e.target.value as UiLanguage)}>{languageOptions.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}</SelectField></FormField><p>{tr('Empty translations use the default content. Business text is never automatically translated.')}</p>
 {(['heading','intro','story','alt'] as const).map(key=><FormField key={key} label={tr(({heading:'Business heading',intro:'Short introduction',story:'Business story',alt:'Image alternative text'})[key])}><TextAreaField rows={key==='story'?7:2} maxLength={key==='story'?10000:key==='intro'?600:200} value={copy[key]} onChange={e=>change(key,e.target.value)}/></FormField>)}
 <FormField label={tr('About Us image')}><InputField type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const selected=e.target.files?.[0];if(selected)try{validateImageFile(selected);setFile(selected);setError('')}catch(err){setError(trError((err as Error).message))}e.target.value=''}}/></FormField>
 {(preview||image)&&<img className="catalogue-about-image-preview" src={preview||image} alt={copy.alt}/>}
 <div className="catalogue-about-actions"><Button disabled={!image||!!crop} onClick={()=>void recrop()}>{tr('Edit / crop')}</Button><Button onClick={()=>{setDraft({...draft,image_path:null});setCrop(null)}}>{tr('Remove image')}</Button><Button onClick={()=>{setDraft({...draft,image_path:record?.value.image_path??null});setCrop(null)}}>{tr('Restore saved image')}</Button><Button onClick={()=>setShowPreview(v=>!v)}>{tr('Preview')}</Button><Button onClick={cancel}>{tr('Cancel')}</Button><Button variant="primary" disabled={!dirty||!!file} onClick={()=>void save()}>{tr('Save Changes')}</Button></div></fieldset>
 {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}{showPreview&&<AboutView value={{...draft,enabled:true}} image={preview||image} language={language}/>}
 {file&&<ImageCropper about file={file} onCancel={()=>setFile(null)} onSave={blob=>{setCrop(blob);setFile(null)}}/>}</section>
}
