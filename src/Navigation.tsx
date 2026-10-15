import {useEffect,useId,useRef,useState} from 'react'
import {BarChart3,Boxes,CalendarDays,ChefHat,ChevronDown,ChevronRight,CircleUserRound,ClipboardCheck,CreditCard,Download,FileBarChart,Landmark,LayoutDashboard,LogOut,Menu,MessageSquareWarning,Package,PanelLeftClose,PanelLeftOpen,Printer,Settings,ShieldCheck,ShoppingCart,Store,Truck,Users,X} from 'lucide-react'
import type {PageKey,Role} from './types'
import {activeGroup,navStorageKey,primaryPage,readOpenGroups,visibleNavigation} from './navigationModel'

type Props={page:PageKey;setPage:(page:PageKey)=>void;staffName:string;role:Role;shopName:string;logoUrl:string|null;logout:()=>void}
const icons:Partial<Record<PageKey,typeof Store>>={dashboard:LayoutDashboard,sale:ShoppingCart,products:Package,catalogue:Store,customers:Users,'scheduled-orders':CalendarDays,preparation:ChefHat,'production-studio':ChefHat,planning:CalendarDays,inventory:Boxes,recipes:ChefHat,receiving:Package,purchasing:FileBarChart,supply:Truck,sales:BarChart3,reports:FileBarChart,profit:BarChart3,'cash-drawer':Landmark,expenses:CreditCard,staff:Users,audit:ShieldCheck,tasks:ClipboardCheck,hardware:Printer,backup:Download,readiness:ShieldCheck,'report-issue':MessageSquareWarning,settings:Settings}

export function GroupedNavigation({page,role,onNavigate,compact=false}:{page:PageKey;role:Role;onNavigate:(page:PageKey)=>void;compact?:boolean}){
  const instance=useId().replace(/:/g,'')
  const group=activeGroup(page)
  const[open,setOpen]=useState<Record<string,boolean>>(()=>({...readOpenGroups(),[group]:true}))
  const previous=useRef(group)
  useEffect(()=>{if(previous.current!==group){previous.current=group;setOpen(old=>({...old,[group]:true}))}},[group])
  function toggle(id:string){setOpen(old=>{const next={...old,[id]:!(old[id]??id===group)};try{localStorage.setItem(navStorageKey,JSON.stringify(next))}catch{}return next})}
  return <nav className="grouped-navigation" aria-label="Main navigation">{visibleNavigation(role).map(section=>{
    const expanded=open[section.id]??section.id===group
    const selected=section.id===group
    return <section className={`nav-group ${selected?'current-group':''}`} key={section.id}>
      <button type="button" className="nav-group-toggle" aria-expanded={expanded} aria-controls={`nav-${instance}-${section.id}`} aria-label={section.label} title={compact?section.label:undefined} onClick={()=>toggle(section.id)}>{expanded?<ChevronDown size={15}/>:<ChevronRight size={15}/>}<span>{section.label}</span></button>
      {expanded&&<div id={`nav-${instance}-${section.id}`} className="nav-group-items">{section.items.map(entry=>{const Icon=icons[entry.key]??Store;const active=primaryPage(page)===entry.key;return <button type="button" key={entry.key} aria-label={entry.label} aria-current={active?'page':undefined} title={compact?entry.label:undefined} className={active?'active':''} onClick={()=>onNavigate(entry.key)}><Icon size={19}/><span>{entry.label}</span></button>})}</div>}
    </section>
  })}</nav>
}
export function Sidebar({compact,onToggleCompact,...props}:Props&{compact:boolean;onToggleCompact:()=>void}){
  return <aside className={`sidebar rc-sidebar ${compact?'is-compact':''}`} aria-label="Staff sidebar">
    <header className="sidebar-brand"><div className="sidebar-logo">{props.logoUrl?<img src={props.logoUrl} alt=""/>:<Store size={25}/>}</div><strong title={props.shopName}>{props.shopName}</strong><button type="button" aria-label={compact?'Expand sidebar':'Collapse sidebar'} aria-pressed={compact} onClick={onToggleCompact}>{compact?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}</button></header>
    <GroupedNavigation page={props.page} role={props.role} compact={compact} onNavigate={props.setPage}/>
    <div className="staff-box"><CircleUserRound size={28}/><div><strong>{props.staffName}</strong><small>{props.role==='admin'?'Administrator':'Employee'}</small></div></div>
    <button type="button" className="logout-btn" aria-label="Sign out" title={compact?'Sign out':undefined} onClick={props.logout}><LogOut size={18}/><span>Sign out</span></button>
  </aside>
}
export function MobileNavigation(props:Props){
  const[open,setOpen]=useState(false),sheet=useRef<HTMLElement>(null),trigger=useRef<HTMLButtonElement>(null)
  const go=(page:PageKey)=>{props.setPage(page);setOpen(false)}
  useEffect(()=>{const media=window.matchMedia('(min-width:821px)');const resize=()=>{if(media.matches)setOpen(false)};media.addEventListener('change',resize);return()=>media.removeEventListener('change',resize)},[])
  useEffect(()=>{
    if(!open)return
    const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden'
    const first=sheet.current?.querySelector<HTMLButtonElement>('button');first?.focus()
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);return}if(event.key==='Tab'){const elements=sheet.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]');if(!elements?.length)return;const start=elements[0],end=elements[elements.length-1];if(event.shiftKey&&document.activeElement===start){event.preventDefault();end.focus()}else if(!event.shiftKey&&document.activeElement===end){event.preventDefault();start.focus()}}}
    document.addEventListener('keydown',key)
    return()=>{document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',key);trigger.current?.focus()}
  },[open])
  return <>
    <header className="mobile-topbar"><div className="mobile-shop-mark">{props.logoUrl?<img src={props.logoUrl} alt=""/>:<Store size={20}/>}</div><div className="mobile-shop-name"><strong>{props.shopName}</strong><small>{props.staffName} • {props.role==='admin'?'Administrator':'Employee'}</small></div><button type="button" ref={trigger} aria-label="Open menu" aria-expanded={open} onClick={()=>setOpen(true)}><Menu size={22}/></button></header>
    <nav className="mobile-bottom-nav" aria-label="Quick navigation">{([['dashboard','Dashboard'],['sale','Sale'],['products','Products'],['customers','Customers']] as [PageKey,string][]).map(([key,label])=>{const Icon=icons[key]??Store;return <button type="button" key={key} aria-current={primaryPage(props.page)===key?'page':undefined} className={primaryPage(props.page)===key?'active':''} onClick={()=>go(key)}><Icon size={20}/><span>{label}</span></button>})}<button type="button" aria-label="More navigation" onClick={()=>setOpen(true)}><Menu size={20}/><span>More</span></button></nav>
    {open&&<div className="mobile-menu-backdrop" onClick={()=>setOpen(false)}><section ref={sheet} className="mobile-menu-sheet" role="dialog" aria-modal="true" aria-label="Navigation menu" onClick={e=>e.stopPropagation()}><div className="mobile-menu-head"><div><strong>{props.shopName}</strong><small>{props.staffName}</small></div><button type="button" aria-label="Close menu" onClick={()=>setOpen(false)}><X size={22}/></button></div><GroupedNavigation page={props.page} role={props.role} onNavigate={go}/><button type="button" className="mobile-menu-logout" onClick={props.logout}><LogOut size={18}/> Sign out</button></section></div>}
  </>
}

export function SectionTabs({page,setPage,items,label}:{page:PageKey;setPage:(p:PageKey)=>void;items:[PageKey,string][];label:string}){
  return <nav className="section-tabs" aria-label={label}>{items.map(([key,title])=><button type="button" key={key} aria-current={page===key?'page':undefined} className={page===key?'active':''} onClick={()=>setPage(key)}>{title}</button>)}</nav>
}
