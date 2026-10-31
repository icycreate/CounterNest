// A deployed endpoint must never consume real jobs using the in-memory mock provider.
export function productionEmailEnabled(env:(key:string)=>string|undefined){
 return env('EMAIL_PROVIDER')==='resend'&&env('EMAIL_REAL_DELIVERY_ENABLED')==='true'&&Boolean(env('RESEND_API_KEY')&&env('EMAIL_FROM')&&env('EMAIL_NOTIFICATION_TO'))
}
