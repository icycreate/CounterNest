import {useEffect,useState} from 'react'
import {CatalogueMediaPromotion} from './CatalogueAdvanced'
import type {AdvancedProduct} from './CatalogueAdvanced'
import {supabase} from './lib/supabase'
import {tr,trError} from './i18n'
export function ProductImages({id,onPrimaryChange}:{id:string;onPrimaryChange:(url:string|undefined)=>void}){const[product,setProduct]=useState<AdvancedProduct|null>(null),[error,setError]=useState('');useEffect(()=>{let live=true;void load(()=>live);return()=>{live=false}},[id]);async function load(isLive=()=>true){if(!supabase)return;try{const r=await supabase.rpc('get_catalogue_admin');if(r.error)throw r.error;const found=r.data.products.find((p:AdvancedProduct)=>p.id===id);if(isLive()){setProduct(found??null);if(found)onPrimaryChange(found.image_url??undefined)}}catch(e){if(isLive())setError(trError(e instanceof Error?e.message:String(e)))}}return <>{error&&<p role="alert">{error}</p>}{product?<CatalogueMediaPromotion product={product} photosOnly onSaved={()=>load()}/>:!error&&<p>{tr('Loading…')}</p>}</>}
