import {useUiLanguage} from './i18n'
import {useEffect,useState} from 'react'
import {useSharedTheme,publicThemeKey} from './sharedTheme'
import {CatalogueAppearance} from './CatalogueAppearance'
import {LanguageSelector} from './i18n'
import {tr,getUiLocale} from './i18n'
import {CustomerOrderNotifications} from './CustomerOrderNotifications'
import {formatMoney} from './CommercialCatalogue'
const stages=['Pending Approval','Accepted','Preparing','Ready for Pickup','Collected']
export function customerStage(status:string,accepted:boolean){return ['confirmed','scheduled','awaiting_deposit'].includes(status)&&accepted?1:status==='in_production'?2:status==='ready'?3:status==='collected'?4:0}
export function CustomerTrackingSummary({data,token}:{data:any;token:string}){
 useUiLanguage()
 const cacheKey=data.catalogue_token?publicThemeKey(data.catalogue_token):undefined
 const[appearance,setAppearance]=useState(()=>{try{return localStorage.getItem((cacheKey??'counternest.catalogue')+'.preference')??data.theme?.appearance??'system'}catch{return 'system'}})
 useSharedTheme(data.theme,appearance,cacheKey)
 useEffect(()=>{const update=()=>{try{setAppearance(localStorage.getItem((cacheKey??'counternest.catalogue')+'.preference')??'system')}catch{}};window.addEventListener('counternest:catalogue-appearance',update);return()=>window.removeEventListener('counternest:catalogue-appearance',update)},[cacheKey])
 const final=['declined','cancelled','no_response'].includes(data.status),stage=customerStage(data.status,data.accepted===true)
 const label=final?({declined:'Declined',cancelled:'Cancelled',no_response:'No Response'} as Record<string,string>)[data.status]:stages[stage]
 const date=(value:string)=>{try{return new Date(value).toLocaleString(getUiLocale(),{timeZone:data.timezone||undefined})}catch{return new Date(value).toLocaleString()}}
 return <div className="customer-tracking"><header><div className="report-actions"><LanguageSelector id="tracking-language" compact/><CatalogueAppearance cacheKey={cacheKey}/></div><small>{data.shop_name}</small><h2>{tr('Order #')}{data.request_number}</h2>{data.customer_name&&<p>{data.customer_name}</p>}<strong className="tracking-status">{tr(label)}</strong></header>
 {!final&&<ol className="tracking-timeline" aria-label={tr('Order progress')}>{stages.map((s,i)=><li key={s} className={i<=stage?'reached':''} aria-current={i===stage?'step':undefined}><span aria-hidden="true">{i<stage?'✓':i+1}</span>{tr(s)}</li>)}</ol>}
 {data.status==='ready'&&<section className="pickup-ready" role="status"><h3>{tr('Your order is ready for pickup!')}</h3><p>{tr('Order #')}{data.request_number}</p>{data.pickup_at&&<p>{tr('Confirmed pickup')}: {date(data.pickup_at)}</p>}<p>{data.pickup_location}</p><p>{data.business_phone} {data.business_email}</p><a href="#pickup-details">{tr('View Pickup Details')}</a></section>}
 <div className="tracking-items">{(data.items??[]).map((item:any,i:number)=><div key={i}><strong>{item.name}</strong>{item.variant&&<small>{item.variant}</small>}{item.option_label&&<small>{item.option_label}</small>}<span>{tr('Quantity')}: {item.qty}</span>{item.unit_price!=null&&<span>{formatMoney(Number(item.unit_price),data.currency??'BZD')}</span>}</div>)}</div>
 <p className="tracking-total"><strong>{tr(data.total_kind==='paid'?'Paid total':data.total_kind==='accepted_quote'?'Accepted quote (tax subject to final payment)':'Estimated total')}: {formatMoney(Number(data.total??data.estimated_subtotal??0),data.currency??'BZD')}</strong></p>
 {data.customer_notes&&<p className="tracking-note">{tr('Customer notes')}: {data.customer_notes}</p>}
 <section id="pickup-details"><h3>{tr('Pickup details')}</h3>{data.pickup_at?<p>{tr('Confirmed pickup')}: {date(data.pickup_at)}</p>:<p>{tr('Pickup time will be confirmed by the business.')}</p>}<p>{data.shop_name}</p><p>{data.pickup_location}</p><p>{data.business_phone} {data.business_email}</p>{data.instructions&&<p className="tracking-note">{data.instructions}</p>}</section>
 <p><small>{tr('Last updated')}: {date(data.updated_at)}</small></p>
 <CustomerOrderNotifications token={token} catalogueToken={data.catalogue_token}/>
 {data.catalogue_token&&<a href={'/catalogue?token='+encodeURIComponent(data.catalogue_token)+'#orders'}>{tr('My Orders')}</a>}
 </div>
}
