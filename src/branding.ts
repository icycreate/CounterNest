export type LogoVariant='full'|'horizontal'|'icon'
export type LogoTheme='light'|'dark'
export const DEFAULT_LOGO='/counternest-logo-full-transparent.svg'
export const DEFAULT_ICON='/counternest-icon-transparent.svg'
export const DEFAULT_FAVICON='/counternest-favicon.svg'
export function isPlatformLogo(url?:string|null){const raw=url?.trim();if(!raw)return true;let path=raw;try{if(/^https?:/.test(raw)){const u=new URL(raw);if(typeof location==='undefined'||u.origin!==location.origin)return false;path=u.pathname}}catch{return false}return /^\/counternest-(?:default-logo|brand-lockup|boot-logo-dark|icon(?:-transparent|-light)?|logo-(?:full|horizontal)-(?:transparent|light)|logo-(?:light|dark))\.svg(?:[?#].*)?$/.test(path)}
export function platformLogo(variant:LogoVariant='full',theme:LogoTheme='light',format:'svg'|'png'='svg'){
 const name=variant==='icon'?'counternest-icon':`counternest-logo-${variant}`
 // Inverse vector and PNG variants serve dark UI; print sources always use standard ink.
 return `/${name}-${theme==='dark'?'light':'transparent'}.${format}`
}
export const businessIcon=(url?:string|null)=>isPlatformLogo(url)?DEFAULT_ICON:url!.trim()
export const businessLogo=(url?:string|null)=>isPlatformLogo(url)?DEFAULT_LOGO:url!.trim()
export function updateBrowserBranding(name:string,logo?:string|null){
 if(typeof document==='undefined')return
 document.title=name.trim()?`${name.trim()} • CounterNest`:'CounterNest POS'
 if(!document.head)return
 let link=document.querySelector<HTMLLinkElement>('link[data-counternest-favicon]')
 if(!link){document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]').forEach(el=>el.remove());link=document.createElement('link');link.rel='icon';link.dataset.counternestFavicon='true';document.head.appendChild(link)}
 const url=isPlatformLogo(logo)?DEFAULT_FAVICON:businessIcon(logo)
 // Signed tenant URLs retain their exact query. Platform fallback is icon-only.
 link.removeAttribute('type');link.href=url.includes('?')?url:`${url}?brand=${Date.now()}`
 link.onerror=()=>{if(link&&link.getAttribute('href')!==DEFAULT_FAVICON)link.href=DEFAULT_FAVICON}
}
