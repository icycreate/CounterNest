import {useEffect,useRef,useState} from 'react'
import type {HTMLAttributes,ReactNode} from 'react'
import {getUiLocale,tr,useUiLanguage} from './i18n'

export type PageHeaderProps=HTMLAttributes<HTMLElement>&{title?:string;subtitle?:ReactNode;status?:ReactNode;actions?:ReactNode;date?:boolean;timezone?:string;sticky?:boolean}
/** One header for staff pages. Existing action handlers and form semantics stay with their owner. */
export function PageHeader({title,subtitle,status,actions,children,className='',date=true,timezone,sticky=true,...props}:PageHeaderProps){
 useUiLanguage()
 const ref=useRef<HTMLElement>(null),[pinned,setPinned]=useState(false),[offset,setOffset]=useState(0)
 useEffect(()=>{
  if(!sticky||typeof window==='undefined'||typeof ResizeObserver==='undefined')return
  const element=ref.current;if(!element)return
  const main=element.closest('main')??element.parentElement;if(!main)return
  let frame=0
  const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const topbar=document.querySelector<HTMLElement>('.mobile-topbar'),style=topbar?getComputedStyle(topbar):null
   const top=topbar&&style&&['fixed','sticky'].includes(style.position)&&style.display!=='none'?Math.ceil(topbar.getBoundingClientRect().height):0
   setOffset(top);setPinned(main.scrollHeight>window.innerHeight+120&&element.offsetHeight<window.innerHeight*.4)
  })}
  const observer=new ResizeObserver(measure);observer.observe(main);observer.observe(element)
  const topbar=document.querySelector('.mobile-topbar');if(topbar)observer.observe(topbar)
  window.addEventListener('resize',measure);measure()
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',measure)}
 },[sticky])
 let secondary=subtitle
 if(title&&secondary===undefined&&date){try{secondary=new Intl.DateTimeFormat(getUiLocale(),{weekday:'long',year:'numeric',month:'long',day:'numeric',...(timezone?{timeZone:timezone}:{})}).format(new Date())}catch{secondary=undefined}}
 return <header {...props} ref={ref} className={`page-header cn-page-header ${className}`.trim()} data-sticky={pinned?'true':'false'} style={{...props.style,'--page-header-top':`${offset}px`} as React.CSSProperties}>
  {title?<><div className="cn-page-header-copy"><h1>{tr(title)}</h1>{secondary!=null&&<p>{secondary}</p>}{status&&<div className="cn-page-status">{status}</div>}</div>{(actions||children)&&<div className="cn-page-header-actions">{actions}{children}</div>}</>:children}
 </header>
}
