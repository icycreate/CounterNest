import {forwardRef} from 'react'
import type {InputHTMLAttributes} from 'react'
import {Search} from 'lucide-react'
import {tr} from './i18n'

/** Shared list search. All native input events, labels and keyboard behavior pass through. */
export const SearchField=forwardRef<HTMLInputElement,InputHTMLAttributes<HTMLInputElement>>(function SearchField({className='',type='search',...props},ref){
 return <span className="cn-search-field"><Search size={18} aria-hidden="true"/><input {...props} ref={ref} type={type} className={className} aria-label={props['aria-label']??props.placeholder??tr('Search')} /></span>
})
