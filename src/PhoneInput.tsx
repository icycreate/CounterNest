import {SearchField} from './SearchField'
import {useEffect,useId,useMemo,useRef,useState,useSyncExternalStore,type InputHTMLAttributes} from 'react'
import {tr,useUiLanguage,getUiLocale} from './i18n'
import {getCompanyPhoneCountry,subscribePhoneCountry,phoneCountries,phoneCountry,inferPhoneCountry,normalizePhone,nationalPhone,isValidPhone} from './phone'

type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'value'|'onChange'|'type'|'defaultValue'> & {value:string;onChange:(value:string)=>void;defaultCountry?:string}
/** The parent receives a canonical +country-code number, never presentation punctuation. */
export function PhoneInput({value,onChange,defaultCountry,id,required,disabled,placeholder,...props}:Props){
 const language=useUiLanguage()
 const company=useSyncExternalStore(subscribePhoneCountry,getCompanyPhoneCountry,()=> 'BZ'),fallback=defaultCountry??company
 const[country,setCountry]=useState(()=>inferPhoneCountry(value,fallback)),[search,setSearch]=useState('')
 const touched=useRef(Boolean(value)),input=useRef<HTMLInputElement>(null),generated=useId(),inputId=id??generated
 useEffect(()=>{if(value&&/^\+|^00/.test(value)){const next=inferPhoneCountry(value,country);if(next!==country)setCountry(next)}else if(!touched.current)setCountry(phoneCountry(fallback).iso)},[value,fallback,country])
 const names=useMemo(()=>{try{return new Intl.DisplayNames([getUiLocale()],{type:'region'})}catch{return undefined}},[language])
 const countryName=(iso:string)=>names?.of(iso)??iso
 const choices=phoneCountries.filter(c=>c.iso===country||`${countryName(c.iso)} ${c.iso} +${c.dial}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
 const canonical=normalizePhone(value,country),national=nationalPhone(value,country)
 useEffect(()=>{input.current?.setCustomValidity(value&&!isValidPhone(canonical)?tr('Enter a valid international phone number.'): '')},[value,canonical,language])
 function change(next:string){touched.current=true;if(next.trim()&&!/^(?:\+|00)?[\d\s()./-]+$/.test(next.trim())){input.current?.setCustomValidity(tr('Enter a valid international phone number.'));return}input.current?.setCustomValidity('');if(/^\+|^00/.test(next.trim())){const region=inferPhoneCountry(next,country);setCountry(region);onChange(normalizePhone(next,region))}else onChange(normalizePhone(next,country))}
 return <span className="phone-input" role="group" aria-label={tr('Phone number')}><span className="phone-country"><SearchField className="phone-country-search" type="search" disabled={disabled} aria-label={tr('Search country or dial code')} placeholder={tr('Search country or dial code')} value={search} onChange={e=>setSearch(e.target.value)} autoComplete="off"/><select disabled={disabled} aria-label={tr('Country and calling code')} value={country} onChange={e=>{const next=e.target.value;touched.current=true;setCountry(next);setSearch('');onChange(national?normalizePhone(national,next):'')}}>{choices.sort((a,b)=>countryName(a.iso).localeCompare(countryName(b.iso))).map(c=><option value={c.iso} key={c.iso}>{c.flag} {countryName(c.iso)} +{c.dial}</option>)}</select></span><input {...props} ref={input} id={inputId} disabled={disabled} required={required} className={'phone-national '+(props.className??'')} type="tel" inputMode="tel" autoComplete={props.autoComplete??'tel-national'} aria-label={props['aria-label']??tr('Phone number')} placeholder={placeholder??tr('Phone number')} value={national} onChange={e=>change(e.target.value)}/></span>
}
