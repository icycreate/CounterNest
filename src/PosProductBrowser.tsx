import {useEffect,useState} from 'react'
import {Button} from './Button'
import {SearchField} from './SearchField'
import {FormField,SelectField} from './Fields'
import {tr,trError} from './i18n'
import {localizeCategory} from './categoryLocalization'
import {supabase} from './lib/supabase'
import {useDialogFocus} from './useDialogFocus'
import {ComboDetail,formatMoney,type Catalog,type CommercialProduct,type CommercialItem} from './CommercialCatalogue'
import type {Product} from './types'

// Keep the existing read-only catalogue feed for variants, options and bundles.
export function usePosCatalogue(){
  const [data,setData]=useState<Catalog|null>(null)
  const [error,setError]=useState('')
  useEffect(()=>{
    if(!supabase)return
    let active=true
    let request:AbortController|null=null
    async function load(){
      if(request||!supabase)return
      const controller=new AbortController();request=controller
      const timeout=window.setTimeout(()=>controller.abort(),15000)
      try{
        const result=await supabase.rpc('get_commercial_catalogue',{p_token:null}).abortSignal(controller.signal)
        if(!active)return
        if(result.error){setError('Product options are unavailable. Refresh before adding products.');setData(null)}
        else{setData(result.data);setError('')}
      }catch{if(active){setError('Product options are unavailable. Refresh before adding products.');setData(null)}}
      finally{window.clearTimeout(timeout);request=null}
    }
    void load()
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load()},5000)
    return()=>{active=false;window.clearInterval(timer);request?.abort()}
  },[])
  return {data,error}
}

export function PosProductBrowser({products,data,error,currency,onSelect,onAdd}:{products:Product[];data:Catalog|null;error:string;currency:string;onSelect:(p:Product)=>void;onAdd:(item:CommercialItem)=>void}){
  const [query,setQuery]=useState(''),[category,setCategory]=useState('')
  const [combo,setCombo]=useState<Catalog['combos'][number]|null>(null)
  const categories=Array.from(new Set(products.filter(p=>p.active).map(p=>p.category)))
  const visible=products.filter(p=>p.active&&(!category||p.category===category)&&p.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <div className="pos-products">
    <h2>{tr('Products')}</h2>
    <SearchField aria-label={tr('Search product name')} placeholder={tr('Search product name')} value={query} onChange={e=>setQuery(e.target.value)}/>
    <div className="pos-categories" aria-label={tr('Category')}>{['',...categories].map(c=><Button key={c} type="button" variant={category===c?'primary':'secondary'} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c?localizeCategory(c):tr('All')}</Button>)}</div>
    {error&&<p role="alert">{trError(error)}</p>}
    {supabase&&!data&&!error&&<p role="status">{tr('Loading catalogue…')}</p>}
    <div className="pos-product-grid">{visible.map(p=>{
      const detail=data?.products.find(x=>x.id===p.id)
      const available=detail?.variants.length?detail.variants.some(v=>v.available):p.stock>0&&(detail?.available??true)
      const price=detail?.variants.length?Math.min(...detail.variants.map(v=>Number(v.price))):p.price
      return <Button key={p.id} type="button" variant="secondary" className="pos-product-tile" disabled={!available||Boolean(supabase&&!data)} onClick={()=>onSelect(p)}>
        <span className="pos-product-art">{(p.image||detail?.image_url)?<img src={detail?.cropped_catalogue_image||p.image||detail?.image_url||''} alt="" loading="lazy"/>:<span aria-hidden="true">{p.iconEmoji||'🧁'}</span>}</span>
        <strong>{p.name}</strong><span>{formatMoney(price,currency)}</span><small>{!available?tr('Sold out'):detail&&(detail.variants.length>0||detail.option_labels.length>0)?tr('Choose options'):tr('Add to cart')}</small>
      </Button>
    })}</div>
    {!visible.length&&<p>{tr('No products match these filters.')}</p>}
    {!category&&Boolean(data?.combos.length)&&<><h2>{tr('Combos & bundles')}</h2><div className="pos-product-grid">{data!.combos.filter(c=>c.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map(c=><Button type="button" variant="secondary" className="pos-product-tile" key={c.id} onClick={()=>setCombo(c)}><strong>{c.name}</strong><span>{formatMoney(Number(c.price),currency)}</span><small>{tr('Choose options')}</small></Button>)}</div></>}
    {combo&&data&&<ComboDetail combo={combo} products={data.products} currency={currency} canSelect onClose={()=>setCombo(null)} onAdd={item=>{onAdd(item);setCombo(null)}}/>}
  </div>
}

export function PosOptions({product:p,currency,onClose,onAdd}:{product:CommercialProduct;currency:string;onClose:()=>void;onAdd:(item:CommercialItem)=>void}){
  const dialog=useDialogFocus(onClose)
  const [variant,setVariant]=useState(p.variants.find(v=>v.available)?.id??'')
  const [option,setOption]=useState(p.option_labels[0]??'')
  const v=p.variants.find(x=>x.id===variant)
  const available=p.variants.length?Boolean(v?.available):p.available
  return <div className="modal-backdrop"><section ref={dialog} className="modal compact-modal pos-options" role="dialog" aria-modal="true" aria-label={tr('Choose options')}>
    <h2>{p.name}</h2>
    {p.variants.length>0?<FormField>{tr('Variant')}<SelectField value={variant} onChange={e=>setVariant(e.target.value)}><option value="" disabled>{tr('Choose options')}</option>{p.variants.map(v=><option key={v.id} value={v.id} disabled={!v.available}>{v.name} · {formatMoney(Number(v.price),currency)}</option>)}</SelectField></FormField>:<FormField>{tr('Option / size')}<SelectField value={option} onChange={e=>setOption(e.target.value)}>{p.option_labels.map(o=><option key={o} value={o}>{o}</option>)}</SelectField></FormField>}
    <p>{formatMoney(Number(v?.price??p.price),currency)}</p>
    <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>{tr('Cancel')}</Button><Button type="button" variant="primary" disabled={!available} onClick={()=>{onAdd({product_id:p.id,variant_id:v?.id??null,option_label:v?null:option||null,qty:1,expected_unit_price:Number(v?.price??p.price),name:p.name+(v?` — ${v.name}`:''),image:v?.image_url??p.image_url??undefined});onClose()}}>{tr('Add to cart')}</Button></div>
  </section></div>
}
