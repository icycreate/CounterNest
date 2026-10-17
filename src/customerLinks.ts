import {businessLogo} from './branding'
export const contactMethods = [['whatsapp','WhatsApp'],['phone','Phone'],['sms','SMS'],['email','Email'],['messenger','Messenger'],['line','LINE'],['wechat','WeChat'],['other','Other']] as const
export const contactLabel=(key:string)=>{const label=contactMethods.find(m=>m[0]===key)?.[1];return label?tr(label):key}
export function customerLinks(token:string,configuredBase?:string|null,environmentBase=import.meta.env?.VITE_PUBLIC_APP_URL,origin=window.location.origin){
 const raw=String(configuredBase||environmentBase||origin).trim()
 try {
  const base=new URL(raw)
  if(base.username||base.password||base.search||base.hash||base.pathname!=='/'||!(base.protocol==='https:'||(base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(base.hostname))))return {display:'',catalogue:'',preview:''}
  if(!token)return {display:'',catalogue:'',preview:''}
  const query=new URLSearchParams({token}).toString()
  return {display:base.origin+'/catalogue-display?'+query,catalogue:base.origin+'/catalogue?'+query,preview:base.origin+'/catalogue?'+query+'&preview=1'}
 }catch{return {display:'',catalogue:'',preview:''}}
}
export function contactHref(method:string,destination:string,message:string){
 const digits=destination.replace(/\D/g,'')
 if(method==='whatsapp'&&digits.length>=6)return 'https://wa.me/'+digits+'?text='+encodeURIComponent(message)
 if(method==='phone'&&digits.length>=6)return 'tel:+'+digits
 if(method==='sms'&&digits.length>=6)return 'sms:+'+digits+'?body='+encodeURIComponent(message)
 if(method==='email'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination))return 'mailto:'+encodeURIComponent(destination)+'?subject='+encodeURIComponent(tr('Pre-order request'))+'&body='+encodeURIComponent(message)
 // Messenger/LINE/WeChat/Other use editable, copyable preparation only.
 return ''
}
export const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function printCatalogueQr(url:string,qr:string,shopName='CounterNest POS',logoUrl?:string|null){
 const w=window.open('','_blank');if(!w)return false;w.opener=null
 w.document.write('<!doctype html><html lang="'+getUiLanguage()+'"><head><meta charset="utf-8"><title>CounterNest POS • '+escapeHtml(tr('Catalogue QR'))+'</title><style>body{font:20px Arial;text-align:center;padding:32px}img{width:300px;max-width:90%}p{overflow-wrap:anywhere}@media print{button{display:none}}</style></head><body><img style="width:72px;height:72px;object-fit:contain" alt="" src="'+escapeHtml(new URL(businessLogo(logoUrl),window.location.origin).href)+'"><h2>'+escapeHtml(shopName)+'</h2><h1>'+escapeHtml(tr('Browse our catalogue'))+'</h1><p>'+escapeHtml(tr('Scan with your phone camera. No app installation needed.'))+'</p><img alt="'+escapeHtml(tr('Customer catalogue QR'))+'" src="'+escapeHtml(qr)+'"><p>'+escapeHtml(url)+'</p><button onclick="window.print()">'+escapeHtml(tr('Print QR'))+'</button></body></html>');w.document.close();return true
}

import {getUiLanguage,tr} from './i18n'
