import {useEffect,useState} from 'react'
import QRCode from 'qrcode'
import {supabase} from './lib/supabase'
import {contactMethods,customerLinks,printCatalogueQr} from './customerLinks'
import type {Role} from './types'
export function CustomerContactSettings({role,showToast,display=false}:{role:Role;showToast:(s:string)=>void;display?:boolean}){
 const[methods,setMethods]=useState<string[]>([]),[enabled,setEnabled]=useState(false),[base,setBase]=useState(''),[receipt,setReceipt]=useState(false),[token,setToken]=useState(''),[active,setActive]=useState(false),[busy,setBusy]=useState(false),[qr,setQr]=useState(''),[showQr,setShowQr]=useState(false),[loaded,setLoaded]=useState(false)
 const links=customerLinks(token,base),url=links.display
 async function load(){if(!supabase||role!=='admin')return;setBusy(true);try{const r=await supabase.rpc('ensure_customer_display_config');if(r.error)throw r.error;setMethods(r.data.contact_methods??[]);setEnabled(r.data.preorder_enabled===true);setBase(r.data.public_base_url??'');setReceipt(r.data.receipt_catalogue_qr===true);setToken(r.data.access_token??'');setActive(r.data.enabled===true);setLoaded(true)}catch(e){showToast((e as Error).message)}finally{setBusy(false)}}
 useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener('counternest:catalogue-settings',refresh);return()=>window.removeEventListener('counternest:catalogue-settings',refresh)},[role])
 useEffect(()=>{let live=true;setQr('');if(url)void QRCode.toDataURL(url,{width:800,margin:4,errorCorrectionLevel:'M'}).then(s=>{if(live)setQr(s)}).catch(()=>showToast('QR generation failed.'));return()=>{live=false}},[url])
 async function save(){if(!supabase)return;setBusy(true);try{const r=await supabase.rpc('save_customer_contact_settings',{p_methods:methods,p_enabled:enabled,p_base_url:base.trim()||null,p_receipt_qr:receipt});if(r.error)throw r.error;await load();window.dispatchEvent(new Event('counternest:catalogue-settings'));showToast('Customer contact methods and catalogue URL saved.')}catch(e){showToast((e as Error).message)}finally{setBusy(false)}}
 async function copy(){try{await navigator.clipboard.writeText(url);showToast('Catalogue link copied.')}catch{showToast('Select and copy the link manually.')}}
 if(role!=='admin')return null
 return <section className="panel contact-settings"><div className="panel-title"><div><h2>{display?'Catalogue QR & Customer Link':'Customer Contact Methods'}</h2><p>Choose how customers may request an order. Only their selected method is offered to staff.</p></div><button onClick={()=>void load()} disabled={busy}>Refresh settings</button></div>
 {!loaded?<p>Load the configured Supabase project to manage customer requests.</p>:<>
 <div className="contact-method-options">{contactMethods.map(([key,label])=><label key={key}><input type="checkbox" checked={methods.includes(key)} onChange={e=>setMethods(old=>e.target.checked?[...old,key]:old.filter(x=>x!==key))}/>{label}</label>)}</div>
 <label className="switch-line"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Accept catalogue pre-order requests</label>
 <label>Public catalogue base URL<input type="url" value={base} placeholder="https://your-domain.vercel.app" onChange={e=>setBase(e.target.value)} aria-describedby="public-base-help"/></label><small id="public-base-help">Optional HTTPS origin. If blank, uses VITE_PUBLIC_APP_URL or the current site. Save changes before printing or sharing.</small>
 <label className="switch-line"><input type="checkbox" checked={receipt} onChange={e=>setReceipt(e.target.checked)}/> Include catalogue QR on receipts</label>
 <button className="primary-btn" disabled={busy||!url||(enabled&&!methods.length)} onClick={()=>void save()}>{busy?'Saving…':'Save Contact & URL Settings'}</button>
 {display&&<><div className="customer-link-row"><input aria-label="Customer catalogue link" readOnly value={url}/><button disabled={!url||!active} onClick={()=>void copy()}>Copy Catalogue Link</button><button disabled={!url||!active} onClick={()=>window.open(url,'_blank','noopener,noreferrer')}>Open Customer Display</button><button disabled={!links.preview||!active} onClick={()=>window.open(links.preview,'_blank','noopener,noreferrer')}>Preview Catalogue</button></div>
 {!active&&<p className="warning-box">Customer display sharing is disabled. Enable it in Display Settings before sharing QR codes.</p>}
 <div className="report-actions"><button disabled={!qr||!active} onClick={()=>setShowQr(v=>!v)}>{showQr?'Hide QR Code':'Show QR Code / View QR'}</button>{qr&&active&&<><a className="primary-btn" href={qr} download="CounterNest-catalogue-QR.png">Save QR Image</a><button onClick={()=>{if(!printCatalogueQr(url,qr))showToast('Allow popups to print the QR.')}}>Print QR</button></>}</div>
 {showQr&&qr&&active&&<div className="catalogue-qr-panel"><img src={qr} alt="Customer catalogue QR code"/><p>Scan to browse and request a pre-order. No staff login or app installation. Save this PNG for signage, flyers and price lists.</p></div>}</>}
 <p className="muted">No messages are sent automatically. Staff prepare a message or open the selected contact app. Another method requires a one-time administrator override and an audited reason.</p></>}
 </section>
}
export function ReceiptCatalogueQr(){
 const[qr,setQr]=useState('')
 useEffect(()=>{let live=true;void (async()=>{if(!supabase)return;const r=await supabase.rpc('get_receipt_catalogue_link');if(r.error||!r.data?.enabled)return;const url=customerLinks(r.data.token,r.data.public_base_url).display;if(!url)return;const png=await QRCode.toDataURL(url,{width:240,margin:4});if(live)setQr(png)})().catch(()=>{});return()=>{live=false}},[])
 return qr?<div className="receipt-catalogue-qr"><img src={qr} alt="Browse customer catalogue"/><small>Scan to browse our catalogue</small></div>:null
}

