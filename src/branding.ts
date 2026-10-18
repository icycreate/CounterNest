export const DEFAULT_LOGO='/counternest-default-logo.svg'
export const DEFAULT_ICON='/counternest-icon.svg'
export const businessIcon=(url?:string|null)=>url?.trim()||DEFAULT_ICON
export const businessLogo=(url?:string|null)=>url?.trim()||DEFAULT_LOGO

export function updateBrowserBranding(name:string,logo?:string|null){
 if(typeof document==='undefined')return
 document.title=name.trim()?`${name.trim()} • CounterNest`:'CounterNest POS'
 if(!document.head)return
 let link=document.querySelector<HTMLLinkElement>('link[data-counternest-favicon]')
 if(!link){document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]').forEach(el=>el.remove());link=document.createElement('link');link.rel='icon';link.dataset.counternestFavicon='true';document.head.appendChild(link)}
 const url=businessIcon(logo)
 // Preserve signed storage URLs: altering their query invalidates the signature.
 const versioned=url.includes('?')?url:`${url}?brand=${Date.now().toString()}`
 link.removeAttribute('type');link.href=versioned
 link.onerror=()=>{if(link)link.href=DEFAULT_ICON}
}
