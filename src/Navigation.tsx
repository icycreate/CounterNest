import {systemLabel} from './systemLabels'
import {BrandLogo} from './BrandLogo'
import {Button} from './Button'
import {SegmentedNav} from './SegmentedNav'
import {tr} from './i18n'
import {useEffect,useId,useRef,useState} from 'react'
import {BarChart3,Boxes,CalendarDays,ChefHat,ChevronDown,ChevronRight,CircleUserRound,ClipboardCheck,CreditCard,Download,FileBarChart,Landmark,LayoutDashboard,LogOut,Menu,MessageSquareWarning,Package,PanelLeftClose,PanelLeftOpen,Printer,Settings,ShieldCheck,ShoppingCart,Store,Truck,Users,X} from 'lucide-react'
import type {PageKey,Role} from './types'
import {canAccessPage,activeGroup,navStorageKey,primaryPage,readOpenGroups,visibleNavigation} from './navigationModel'

type Props={page:PageKey;setPage:(page:PageKey)=>void;staffName:string;role:Role;shopName:string;logoUrl:string|null;logout:()=>void}
const icons:Partial<Record<PageKey,typeof Store>>={calendar:CalendarDays,dashboard:LayoutDashboard,sale:ShoppingCart,products:Package,catalogue:Store,customers:Users,'scheduled-orders':CalendarDays,preparation:ChefHat,'production-studio':ChefHat,planning:CalendarDays,inventory:Boxes,recipes:ChefHat,receiving:Package,purchasing:FileBarChart,supply:Truck,sales:BarChart3,reports:FileBarChart,profit:BarChart3,'cash-drawer':Landmark,expenses:CreditCard,staff:Users,audit:ShieldCheck,tasks:ClipboardCheck,hardware:Printer,backup:Download,readiness:ShieldCheck,'report-issue':MessageSquareWarning,settings:Settings}

export function GroupedNavigation({page,role,onNavigate,compact=false}:{page:PageKey;role:Role;onNavigate:(page:PageKey)=>void;compact?:boolean}){
  const instance=useId().replace(/:/g,'')
  const group=activeGroup(page)
  const[open,setOpen]=useState<Record<string,boolean>>(()=>({...readOpenGroups(),[group]:true}))
  const previous=useRef(group)
  useEffect(()=>{if(previous.current!==group){previous.current=group;setOpen(old=>({...old,[group]:true}))}},[group])
  function toggle(id:string){setOpen(old=>{const next={...old,[id]:!(old[id]??id===group)};try{localStorage.setItem(navStorageKey,JSON.stringify(next))}catch{}return next})}
  return <nav className="grouped-navigation" aria-label={tr("Main navigation")}>{visibleNavigation(role).map(section=>{
    const expanded=open[section.id]??section.id===group
    const selected=section.id===group
    return <section className={`nav-group ${selected?'current-group':''}`} key={section.id}>
      <Button variant="secondary" type="button" className="nav-group-toggle" aria-expanded={expanded} aria-controls={`nav-${instance}-${section.id}`} aria-label={tr(section.label)} title={compact?tr(section.label):undefined} onClick={()=>toggle(section.id)}>{expanded?<ChevronDown size={15}/>:<ChevronRight size={15}/>}<span>{tr(section.label)}</span></Button>
      {expanded&&<div id={`nav-${instance}-${section.id}`} className="nav-group-items">{section.items.map(entry=>{const Icon=icons[entry.key]??Store;const active=primaryPage(page)===entry.key;return <Button variant="secondary" type="button" key={entry.key} aria-label={tr(entry.label)} aria-current={active?'page':undefined} title={compact?tr(entry.label):undefined} className={active?'active':''} onClick={()=>onNavigate(entry.key)}><Icon size={19}/><span>{tr(entry.label)}</span></Button>})}</div>}
    </section>
  })}</nav>
}
export function Sidebar({compact,onToggleCompact,...props}:Props&{compact:boolean;onToggleCompact:()=>void}){
  return <aside className={`sidebar rc-sidebar ${compact?'is-compact':''}`} aria-label={tr("Staff sidebar")}>
    <header className="sidebar-brand"><div className="sidebar-logo"><BrandLogo logoUrl={props.logoUrl} businessName={props.shopName} variant="icon"/></div><strong title={props.shopName}>{props.shopName}</strong><Button variant="secondary" type="button" aria-label={compact?tr("Expand sidebar"):tr("Collapse sidebar")} aria-pressed={compact} onClick={onToggleCompact}>{compact?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}</Button></header>
    <GroupedNavigation page={props.page} role={props.role} compact={compact} onNavigate={props.setPage}/>
    <div className="staff-box"><CircleUserRound size={28}/><div><strong>{props.staffName}</strong><small>{systemLabel(props.role)}</small></div></div>
    <Button variant="secondary" type="button" className="logout-btn" aria-label={tr("Sign out")} title={compact?tr("Sign out"):undefined} onClick={props.logout}><LogOut size={18}/><span>{tr("Sign out")}</span></Button>
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
    <header className="mobile-topbar"><div className="mobile-shop-mark"><BrandLogo logoUrl={props.logoUrl} businessName={props.shopName} variant="icon"/></div><div className="mobile-shop-name"><strong>{props.shopName}</strong><small>{props.staffName} • {systemLabel(props.role)}</small></div><Button variant="secondary" type="button" ref={trigger} aria-label={tr("Open menu")} aria-expanded={open} onClick={()=>setOpen(true)}><Menu size={22}/></Button></header>
    <nav className="mobile-bottom-nav" aria-label={tr("Quick navigation")}>{([['dashboard','Dashboard'],['sale','Sale'],['products','Products'],['customers','Customers']] as [PageKey,string][]).filter(([key])=>canAccessPage(props.role,key)).map(([key,label])=>{const Icon=icons[key]??Store;return <Button variant="secondary" type="button" key={key} aria-current={primaryPage(props.page)===key?'page':undefined} className={primaryPage(props.page)===key?'active':''} onClick={()=>go(key)}><Icon size={20}/><span>{tr(label)}</span></Button>})}<Button variant="secondary" type="button" aria-label={tr("More navigation")} onClick={()=>setOpen(true)}><Menu size={20}/><span>{tr("More")}</span></Button></nav>
    {open&&<div className="mobile-menu-backdrop" onClick={()=>setOpen(false)}><section ref={sheet} className="mobile-menu-sheet" role="dialog" aria-modal="true" aria-label={tr("Navigation menu")} onClick={e=>e.stopPropagation()}><div className="mobile-menu-head"><div><strong>{props.shopName}</strong><small>{props.staffName}</small></div><Button variant="secondary" data-back-close="true" type="button" aria-label={tr("Close menu")} onClick={()=>setOpen(false)}><X size={22}/></Button></div><GroupedNavigation page={props.page} role={props.role} onNavigate={go}/><Button variant="secondary" type="button" className="mobile-menu-logout" onClick={props.logout}><LogOut size={18}/>{' '+tr("Sign out")}</Button></section></div>}
  </>
}

export function SectionTabs({page,setPage,items,label}:{page:PageKey;setPage:(p:PageKey)=>void;items:[PageKey,string][];label:string}){
  return <SegmentedNav className="section-tabs" aria-label={label}>{items.map(([key,title])=><Button variant="secondary" type="button" key={key} aria-current={page===key?'page':undefined} className={page===key?'active':''} onClick={()=>setPage(key)}>{tr(title)}</Button>)}</SegmentedNav>
}
