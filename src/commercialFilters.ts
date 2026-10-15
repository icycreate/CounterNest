import type {CommercialProduct} from './CommercialCatalogue'
export type CommercialFilters={query:string;category:string;tag:string;min:string;max:string;availability:string;badge:string;avoid:string;diet:string}
export function filterCommercialProducts(products:CommercialProduct[],f:CommercialFilters):CommercialProduct[]{
 const contains=(list:string[],value:string)=>list.some(x=>x.trim().toLowerCase()===value.trim().toLowerCase())
 return products.filter(p=>{
  const prices=p.variants.length?p.variants.map(v=>Number(v.price)):[Number(p.price)]
  const available=p.variants.length?p.variants.some(v=>v.available):p.available
  const promo=p.variants.length?p.variants.some(v=>Number(v.price)<Number(v.regular_price)):Number(p.price)<Number(p.regular_price)
  return p.name.toLowerCase().includes(f.query.toLowerCase())&&(f.category==='All'||p.category_name===f.category)&&(!f.tag||contains(p.tags,f.tag))&&prices.some(price=>(!f.min||price>=Number(f.min))&&(!f.max||price<=Number(f.max)))&&(f.availability==='all'||available===(f.availability==='available'))&&(!f.badge||(f.badge==='featured'?p.featured:f.badge==='new'?p.new_badge:f.badge==='seasonal'?Boolean(p.seasonal_label):promo))&&(!f.avoid||!contains(p.allergens,f.avoid))&&(!f.diet||contains(p.dietary,f.diet))
 })
}
