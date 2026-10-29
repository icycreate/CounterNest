import {useId,useRef,useState} from 'react'
import {Button} from './Button'
import {tr,useUiLanguage} from './i18n'
import './customerQuickStart.css'

export function CustomerQuickStart({catalogueToken,home,canRequest,onInstall}:{catalogueToken:string;home:boolean;canRequest:boolean;onInstall:()=>void}){
 useUiLanguage()
 const key='counternest.customer-guide.v1.'+catalogueToken
 const[dismissed,setDismissed]=useState(()=>{try{return localStorage.getItem(key)==='seen'}catch{return false}}),[open,setOpen]=useState(false),[failed,setFailed]=useState(false),[transcript,setTranscript]=useState(false)
 const id=useId(),button=useRef<HTMLButtonElement>(null),video=useRef<HTMLVideoElement>(null)
 function remember(){setDismissed(true);try{localStorage.setItem(key,'seen')}catch{}}
 function show(){remember();setOpen(true)}
 function close(){video.current?.pause();setOpen(false);button.current?.focus()}
 return <section className="customer-quick-start" aria-label={tr('Customer quick start')}>
 <div className="customer-guide-actions"><Button ref={button} aria-expanded={open} aria-controls={id} onClick={()=>open?close():show()}>{tr(open?'Close video guide':'Watch: install & place an order')}</Button>{home&&!dismissed&&<><span>{tr('New here? A short video shows you how.')}</span><Button variant="ghost" onClick={remember}>{tr('Not now')}</Button></>}</div>
 {open&&<div id={id} className="customer-guide-player"><h2>{tr('Install the Catalogue and place a request')}</h2><p>{tr('English captions · No voiceover')}</p>{!canRequest&&<p>{tr('Ordering is available only when enabled by this shop.')}</p>}
 <video ref={video} controls playsInline preload="none" aria-label={tr('Customer quick start')} onError={()=>{setFailed(true);setTranscript(true)}}>
 <source src="/tutorials/customer-quick-start.mp4" type="video/mp4" onError={()=>{setFailed(true);setTranscript(true)}}/>
 <track kind="captions" src="/tutorials/customer-quick-start.en.vtt" srcLang="en" label="English"/>
 {tr('Read the written steps below if video playback is unavailable.')}
 </video>{failed&&<p role="status">{tr('Read the written steps below if video playback is unavailable.')}</p>}
 <div className="customer-guide-actions"><Button onClick={()=>{close();onInstall()}}>{tr('Open installation options')}</Button><Button aria-expanded={transcript} onClick={()=>setTranscript(x=>!x)}>{tr('Read the steps')}</Button></div>
 {transcript&&<div className="customer-guide-transcript" lang="en"><h3>Install on your phone</h3><p>Open the shop’s Catalogue link or scan its QR code. Installation is optional: you can order in your browser.</p><p>iPhone: open the link in Safari, tap Share → Add to Home Screen → Add.</p><p>Android: in Chrome, use Account → Install Catalogue App, or the browser menu → Install app / Add to Home screen. Confirm the browser prompt. Labels can vary. If installation is unavailable, bookmark the link. Installation needs HTTPS and browser support.</p><h3>Place a pre-order request</h3><ol><li>Browse or search, open a product, check options, quantity and allergens, then tap Add to Order.</li><li>Open the cart (bag icon), check the estimated subtotal and tap Place order.</li><li>Enter your name and phone with country code. Choose your preferred contact method and add optional notes.</li><li>Tap Review Request, check the details, then Submit Pre-Order Request.</li><li>Keep your private tracking link. The shop confirms availability, timing, final price and any deposit. No pickup time is required before submitting.</li></ol><p>A submitted request is not a confirmed booking, stock reservation or payment. Do not share your private tracking link publicly.</p></div>}
 </div>}
 </section>
}
