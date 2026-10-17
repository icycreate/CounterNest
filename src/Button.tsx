import type {ButtonHTMLAttributes} from 'react'
export type ButtonVariant='primary'|'secondary'|'success'|'danger'|'ghost'
export function Button({variant='secondary',className='',type='button',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:ButtonVariant}){return <button {...props} type={type} className={`cn-button cn-button--${variant} ${className}`.trim()}/>}
