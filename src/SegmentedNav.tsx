import {Children,cloneElement,isValidElement} from 'react'
import type {HTMLAttributes,ReactElement,ReactNode} from 'react'
/** A navigation group, not an ARIA tablist: each action remains normally keyboard focusable. */
export function SegmentedNav({className='',children,role:legacyRole,...props}:HTMLAttributes<HTMLElement>){
 function normalize(child:ReactNode):ReactNode{
  if(!isValidElement(child))return child
  const item=child as ReactElement<{role?:string;className?:string;variant?:string;'aria-current'?:'page';'aria-pressed'?:boolean;children?:ReactNode}>
  const active=item.props.variant?item.props.variant==='primary':item.props.className?.split(' ').includes('active')
  const next={...item.props,...(item.props.role==='tab'?{role:undefined}:{}),...(active!==undefined&&!item.props['aria-current']&&item.props['aria-pressed']===undefined?{'aria-pressed':active}:{})}
  if(item.props.children)next.children=Children.map(item.props.children,normalize)
  return cloneElement(item,next)
 }
 return <nav {...props} className={`section-tabs cn-segmented-nav ${className}`.trim()}>{Children.map(children,normalize)}</nav>
}
