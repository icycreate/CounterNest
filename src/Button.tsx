import {forwardRef} from 'react'
import type {ButtonHTMLAttributes} from 'react'
export type ButtonVariant='primary'|'secondary'|'success'|'danger'|'ghost'
export const Button=forwardRef<HTMLButtonElement,ButtonHTMLAttributes<HTMLButtonElement>&{variant?:ButtonVariant;loading?:boolean}>(function Button({variant='secondary',className='',type='button',loading=false,disabled,children,...props},ref){return <button {...props} ref={ref} type={type} disabled={disabled||loading} aria-busy={loading||props['aria-busy']} className={`cn-button cn-button--${variant} ${className}`.trim()}>{loading&&<span className="cn-button-spinner" aria-hidden="true"/>}{children}</button>})
