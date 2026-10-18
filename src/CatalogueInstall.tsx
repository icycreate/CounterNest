import {useEffect,useState} from 'react'
import {Button} from './Button'
import {useUiLanguage} from './i18n'

const words = {
 en:{install:'Install Catalogue App',installed:'Catalogue app installed',help:'Add this catalogue to your home screen',ios:'On iPhone or iPad, open this link in Safari, tap Share, then Add to Home Screen.',other:'Open your browser menu and choose Install app or Add to Home screen. If unavailable, bookmark this catalogue link. Installation requires HTTPS and browser support.',unavailable:'Automatic installation is unavailable. You can bookmark this catalogue link.',close:'Close',cancelled:'Installation was dismissed. You can try again from this button.'},
 es:{install:'Instalar app del catálogo',installed:'App del catálogo instalada',help:'Añade este catálogo a tu pantalla de inicio',ios:'En iPhone o iPad, abre este enlace en Safari, toca Compartir y luego Añadir a pantalla de inicio.',other:'Abre el menú del navegador y elige Instalar app o Añadir a pantalla de inicio. Si no aparece, guarda este enlace en favoritos. La instalación requiere HTTPS y un navegador compatible.',unavailable:'La instalación automática no está disponible. Puedes guardar este enlace en favoritos.',close:'Cerrar',cancelled:'Se canceló la instalación. Puedes volver a intentarlo desde este botón.'},
 'zh-TW':{install:'安裝商品目錄 App',installed:'商品目錄 App 已安裝',help:'將此商品目錄加入主畫面',ios:'在 iPhone 或 iPad 上，請使用 Safari 開啟此連結，點選分享，再選擇「加入主畫面」。',other:'開啟瀏覽器選單，選擇「安裝應用程式」或「加入主畫面」。若無此選項，可將此商品目錄連結加入書籤。安裝需要 HTTPS 和支援的瀏覽器。',unavailable:'目前無法自動安裝。您可以將此商品目錄連結加入書籤。',close:'關閉',cancelled:'已取消安裝。您可以再次點選此按鈕重試。'},
 'zh-CN':{install:'安装商品目录 App',installed:'商品目录 App 已安装',help:'将此商品目录添加到主屏幕',ios:'在 iPhone 或 iPad 上，请使用 Safari 打开此链接，点击分享，再选择“添加到主屏幕”。',other:'打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。若无此选项，可将此商品目录链接加入书签。安装需要 HTTPS 和支持的浏览器。',unavailable:'目前无法自动安装。您可以将此商品目录链接加入书签。',close:'关闭',cancelled:'已取消安装。您可以再次点击此按钮重试。'}
}
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>}

export function CatalogueInstall({token,shopName,logoUrl}:{token:string;shopName:string;logoUrl?:string|null}) {
 const language=useUiLanguage(),t=words[language]
 const [prompt,setPrompt]=useState<InstallEvent|null>(null),[help,setHelp]=useState(false),[dismissed,setDismissed]=useState(false),[available,setAvailable]=useState(true)
 const [installed,setInstalled]=useState(()=>typeof window.matchMedia==='function'&&window.matchMedia('(display-mode: standalone)').matches || typeof navigator!=='undefined'&&Boolean((navigator as Navigator&{standalone?:boolean}).standalone))
 useEffect(()=>{
  if(!/^[a-zA-Z0-9_-]{32,128}$/.test(token)||!document.head)return
  const manifest=document.querySelector<HTMLLinkElement>('link[rel="manifest"]'),touch=document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]'),title=document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')
  const previous={manifest:manifest?.getAttribute('href'),touch:touch?.getAttribute('href'),title:title?.content}
  const url='/api/catalogue-manifest?'+new URLSearchParams({token}).toString()
  // A persistent HTTPS manifest URL survives browser restarts; no blob/data manifest.
  if(manifest)manifest.href=url
  if(title)title.content=shopName
  if(touch&&logoUrl){try{const logo=new URL(logoUrl,location.origin);if(logo.protocol==='https:'||logo.origin===location.origin)touch.href=logo.href}catch{}}
  const controller=new AbortController()
  fetch(url,{cache:'no-store',signal:controller.signal,credentials:'omit'}).then(async response=>{setAvailable(response.ok&&response.headers.get('content-type')?.includes('manifest')===true)}).catch(()=>{if(!controller.signal.aborted)setAvailable(false)})
  const before=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent)}
  const done=()=>{setInstalled(true);setPrompt(null);setHelp(false)}
  window.addEventListener('beforeinstallprompt',before);window.addEventListener('appinstalled',done)
  return()=>{controller.abort();window.removeEventListener('beforeinstallprompt',before);window.removeEventListener('appinstalled',done);if(manifest&&previous.manifest)manifest.href=previous.manifest;if(touch&&previous.touch)touch.href=previous.touch;if(title&&previous.title)title.content=previous.title}
 },[token,shopName,logoUrl])
 async function install(){
  if(!prompt||!available){setHelp(true);return}
  try{await prompt.prompt();const choice=await prompt.userChoice;setDismissed(choice.outcome==='dismissed');setHelp(choice.outcome==='dismissed')}catch{setHelp(true)}finally{setPrompt(null)}
 }
 const ios=typeof navigator!=='undefined'&&(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))
 return <div className="catalogue-install"><Button disabled={installed} onClick={()=>void install()}>{installed?t.installed:t.install}</Button>{help&&<div role="status" className="info-box"><strong>{t.help}</strong><p>{dismissed?t.cancelled:!available?t.unavailable:''}</p><p>{ios?t.ios:t.other}</p><Button data-back-close="true" variant="ghost" onClick={()=>setHelp(false)}>{t.close}</Button></div>}</div>
}
