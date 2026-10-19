import {useEffect,useRef,useState} from 'react'
import type {CSSProperties} from 'react'
import {businessLogo,platformLogo,isPlatformLogo,type LogoVariant,type LogoTheme} from './branding'
import {luminance} from './accessiblePalette'

type Props={mode?:'platform'|'business';logoUrl?:string|null;businessName?:string;variant?:LogoVariant;size?:number|string;theme?:LogoTheme|'auto';className?:string;alt?:string;style?:CSSProperties;decorative?:boolean}
/** A business upload is never recolored. Platform fallback follows its actual containing surface. */
export function BrandLogo({mode='business',logoUrl,businessName,variant='full',size,theme='auto',className='',alt,style,decorative=false}:Props){
 const image=useRef<HTMLImageElement>(null),[surface,setSurface]=useState<LogoTheme>(theme==='dark'?'dark':'light'),[failed,setFailed]=useState(''),[raster,setRaster]=useState(false)
 const custom=mode==='business'&&!isPlatformLogo(logoUrl)&&failed!==logoUrl?.trim()
 useEffect(()=>{setFailed('');setRaster(false)},[logoUrl,variant])
 useEffect(()=>{
  if(theme!=='auto'){setSurface(theme);return}
  if(typeof getComputedStyle!=='function'||typeof MutationObserver==='undefined')return
  const refresh=()=>{let el:Element|null=image.current?.parentElement??null;while(el){const c=getComputedStyle(el).backgroundColor,v=c.match(/[\d.]+/g)?.map(Number);if(v&&v.length>=3&&(v[3]??1)>.8){const rgb=v.slice(0,3).map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');setSurface(luminance('#'+rgb)<.32?'dark':'light');return}el=el.parentElement}setSurface(document.documentElement.dataset.appearance==='dark'?'dark':'light')}
  refresh();const observer=new MutationObserver(refresh);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-appearance','data-boot-theme','style']});window.addEventListener('resize',refresh);return()=>{observer.disconnect();window.removeEventListener('resize',refresh)}
 },[theme,custom])
 const standard=custom?businessLogo(logoUrl):platformLogo(variant,'light'),src=custom?standard:platformLogo(variant,surface,raster?'png':'svg')
 const label=decorative?'':alt??(custom?`${businessName?.trim()||'Business'} logo`:'CounterNest')
 return <picture className="brand-logo-picture"><source media="print" srcSet={standard}/><img ref={image} className={`brand-logo ${className}`} data-brand={custom?'business':'platform'} data-variant={variant} data-logo-theme={surface} src={src} alt={label} aria-hidden={decorative||undefined} width={variant==='icon'?652:variant==='horizontal'?1800:1100} height={variant==='icon'?652:variant==='horizontal'?550:730} style={{...(size?{width:size,...(variant==='icon'?{height:size}:{})}:{}),...style}} onError={()=>{if(custom)setFailed(logoUrl!.trim());else if(!raster)setRaster(true)}}/></picture>
}
