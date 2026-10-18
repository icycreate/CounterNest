import type {CSSProperties} from 'react'
export type CatalogueDecoration={header_mode:'color'|'gradient'|'image';background_mode:'theme'|'image';header_url?:string|null;header_original?:string|null;background_url?:string|null;overlay:number;background_overlay:number;blur:number;focal_x:number;focal_y:number}
export const defaultDecoration:CatalogueDecoration={header_mode:'color',background_mode:'theme',overlay:.92,background_overlay:.96,blur:0,focal_x:50,focal_y:50}
const asset=(url?:string|null)=>url&&/^https?:\/\//i.test(url)?`url(${JSON.stringify(url)})`:'none'
export function decorationStyle(value?:Partial<CatalogueDecoration>|null):CSSProperties{
 const v={...defaultDecoration,...value};
 return {'--catalogue-header-image':v.header_mode==='image'?asset(v.header_url):v.header_mode==='gradient'?'linear-gradient(125deg,var(--primary),var(--surface))':'none','--catalogue-background-image':v.background_mode==='image'?asset(v.background_url):'none','--catalogue-header-opacity':String(1-Math.max(.90,Math.min(1,v.overlay))),'--catalogue-background-opacity':String(1-Math.max(.95,Math.min(1,v.background_overlay))),'--catalogue-header-blur':`${Math.max(0,Math.min(12,v.blur))}px`,'--catalogue-focal':`${v.focal_x}% ${v.focal_y}%`} as CSSProperties
}
