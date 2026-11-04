import {Children,forwardRef} from 'react'
import type {ButtonHTMLAttributes,ReactNode} from 'react'
export type ButtonVariant='primary'|'secondary'|'success'|'danger'|'warning'|'ghost'|'destructive'|'disabled'
// Keep adjacent translated text fragments in one flex item; preserve rich children.
function buttonContent(children:ReactNode){
 const items=Children.toArray(children),result:ReactNode[]=[];let text='';
 const flush=()=>{if(text){result.push(text);text=''}};
 for(const item of items){if(typeof item==='string'||typeof item==='number')text+=String(item);else{flush();result.push(item)}}flush();
 return result.length===1?result[0]:result;
}
export const Button=forwardRef<HTMLButtonElement,ButtonHTMLAttributes<HTMLButtonElement>&{variant?:ButtonVariant;size?:'sm'|'md'|'lg';loading?:boolean;icon?:ReactNode}>(function Button({variant='secondary',size='md',className='',type='button',loading=false,disabled,icon,children,...props},ref){return <button {...props} aria-label={props['aria-label']??(typeof children!=='string'&&typeof children!=='number'?props.title:undefined)} ref={ref} type={type} disabled={disabled||loading||variant==='disabled'} aria-busy={loading||props['aria-busy']} data-cn-button="true" data-variant={variant} data-size={size} className={`cn-button cn-button--${variant} ${variant==='destructive'?'cn-button--danger ':''}${className}`.trim()}>{loading?<span className="cn-button-spinner" aria-hidden="true"/>:icon&&<span className="cn-button-icon" aria-hidden="true">{icon}</span>}{buttonContent(children)}</button>})
