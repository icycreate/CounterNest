import {randomId} from './id'
import {supabase} from './lib/supabase'

export type SupplyAttachmentSource='stock_receipt'|'ingredient_purchase_receipt'

export function validateSupplyPhoto(file:File){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG, or WebP supply photo.')
  if(file.size>8*1024*1024)throw new Error('Supply photo must be 8 MB or smaller.')
}

export async function uploadSupplyPhoto(file:File,sourceType:SupplyAttachmentSource,sourceId:string,shopId:string){
  if(!supabase)throw new Error('Supabase is not configured.')
  validateSupplyPhoto(file)
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'
  const path=`${shopId}/${sourceType}/${sourceId}/${randomId()}.${ext}`
  const uploaded=await supabase.storage.from('supply-imports').upload(path,file,{upsert:false,cacheControl:'3600',contentType:file.type})
  if(uploaded.error)throw uploaded.error
  const registered=await supabase.rpc('add_inventory_supply_attachment',{p_source_type:sourceType,p_source_id:sourceId,p_storage_path:path,p_original_name:file.name,p_mime_type:file.type,p_size_bytes:file.size})
  if(registered.error){await supabase.storage.from('supply-imports').remove([path]);throw registered.error}
  return registered.data as string
}

export async function openSupplyPhoto(sourceType:SupplyAttachmentSource,sourceId:string){
  if(!supabase)throw new Error('Supabase is not configured.')
  const result=await supabase.rpc('get_inventory_supply_attachments',{p_source_type:sourceType,p_source_id:sourceId})
  if(result.error)throw result.error
  const row=(result.data??[])[0]
  if(!row?.storage_path)throw new Error('No supply photo is attached to this receipt.')
  const signed=await supabase.storage.from('supply-imports').createSignedUrl(row.storage_path,300)
  if(signed.error)throw signed.error
  window.open(signed.data.signedUrl,'_blank','noopener,noreferrer')
}
