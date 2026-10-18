import type {HTMLAttributes} from 'react'
/** Sticky inside the owning scrollable editor, never a fixed viewport overlay. */
export function StickyActions({className='modal-actions',...props}:HTMLAttributes<HTMLDivElement>){return <div {...props} className={className} data-sticky-actions="true"/>}
