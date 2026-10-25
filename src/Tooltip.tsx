import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'

type Tip={anchor:HTMLElement;text:string}
/** Portal paint is independent of button/sidebar ink and clipped scrolling containers. */
export function Tooltip({anchor,text,id}:{anchor:HTMLElement;text:string;id:string}){
 const ref=useRef<HTMLDivElement>(null),[position,setPosition]=useState<{left:number;top:number}|null>(null)
 useLayoutEffect(()=>{
  let frame=0
  const place=()=>{const box=ref.current;if(!box)return;const a=anchor.getBoundingClientRect(),v=window.visualViewport;
   const left=v?.offsetLeft??0,top=v?.offsetTop??0,width=v?.width??window.innerWidth,height=v?.height??window.innerHeight;
   box.style.maxWidth=Math.max(1,Math.min(280,width-24))+'px';box.style.maxHeight=Math.max(1,height-24)+'px'
   const b=box.getBoundingClientRect(),x=Math.max(left+12,Math.min(a.left+(a.width-b.width)/2,left+width-b.width-12));
   const above=a.top-b.height-10,y=above>=top+12?above:a.bottom+10;
   setPosition({left:x,top:Math.max(top+12,Math.min(y,top+height-b.height-12))})
  }
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place)}
  place();const observer=new ResizeObserver(schedule);if(ref.current)observer.observe(ref.current);observer.observe(anchor)
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule)
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule)}
 },[anchor,text])
 return createPortal(<div ref={ref} id={id} role="tooltip" className="cn-tooltip" style={{left:position?.left??0,top:position?.top??0,visibility:position?'visible':'hidden'}}>{text}</div>,document.body)
}

/** Shared adapter for existing titles and accessible icon buttons; no business handlers changed. */
export function TooltipRuntime(){
 const id=useId(),[tip,setTip]=useState<Tip|null>(null)
 useEffect(()=>{
  let active:HTMLElement|null=null,originalTitle:string|null=null,showTimer=0,hideTimer=0,observer:MutationObserver|null=null
  const clear=()=>{window.clearTimeout(showTimer);window.clearTimeout(hideTimer);observer?.disconnect();observer=null;
   if(active){if(originalTitle!==null&&!active.hasAttribute('title'))active.setAttribute('title',originalTitle);
    const described=(active.getAttribute('aria-describedby')??'').split(/\s+/).filter(v=>v&&v!==id);if(described.length)active.setAttribute('aria-describedby',described.join(' '));else active.removeAttribute('aria-describedby')}
   active=null;originalTitle=null;setTip(null)
  }
  const find=(node:EventTarget|null)=>{
   if(!(node instanceof Element))return null
   if(active?.contains(node))return {anchor:active,text:active.getAttribute('data-cn-tooltip')||originalTitle||active.getAttribute('aria-label')||''}
   const element=node.closest<HTMLElement>('[data-cn-tooltip],[title],button[aria-label],a[aria-label]')
   if(!element||element.closest('[role="tooltip"]'))return null
   const text=element.getAttribute('data-cn-tooltip')||element.getAttribute('title')||(!element.textContent?.trim()?element.getAttribute('aria-label'):null)
   return text?.trim()?{anchor:element,text:text.trim()}:null
  }
  const show=(next:Tip,immediate=false)=>{window.clearTimeout(hideTimer);if(active===next.anchor)return;clear();active=next.anchor;originalTitle=active.getAttribute('title');active.removeAttribute('title');
   const reveal=()=>{if(!active?.isConnected){clear();return}active.setAttribute('aria-describedby',[(active.getAttribute('aria-describedby')??''),id].filter(Boolean).join(' '));setTip(next);
    observer=new MutationObserver(()=>{if(!active?.isConnected||active.hidden||active.closest('[hidden],[inert]'))clear()});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','inert']})}
   if(immediate)reveal();else showTimer=window.setTimeout(reveal,180)
  }
  const over=(e:PointerEvent)=>{if(e.pointerType==='touch')return;if((e.target as Element)?.closest?.('.cn-tooltip')){window.clearTimeout(hideTimer);return}const next=find(e.target);if(next)show(next)}
  const out=(e:PointerEvent)=>{const related=e.relatedTarget as Node|null;if(active&&(active.contains(related)||(related instanceof Element&&related.closest('.cn-tooltip'))))return;if(active===document.activeElement)return;hideTimer=window.setTimeout(clear,120)}
  const focus=(e:FocusEvent)=>{const next=find(e.target);if(next)show(next,true)}
  const blur=()=>{hideTimer=window.setTimeout(clear,120)}
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')clear()}
  const language=()=>clear()
  document.addEventListener('pointerover',over);document.addEventListener('pointerout',out);document.addEventListener('focusin',focus);document.addEventListener('focusout',blur);document.addEventListener('pointerdown',clear,true);document.addEventListener('keydown',key);window.addEventListener('counternest:language',language)
  return()=>{clear();document.removeEventListener('pointerover',over);document.removeEventListener('pointerout',out);document.removeEventListener('focusin',focus);document.removeEventListener('focusout',blur);document.removeEventListener('pointerdown',clear,true);document.removeEventListener('keydown',key);window.removeEventListener('counternest:language',language)}
 },[id])
 return tip?<Tooltip {...tip} id={id}/>:null
}
