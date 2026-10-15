export type CheckoutAttempt={id:string;args:{p_customer_id:string|null;p_payment_method:'cash'|'card'|'qr';p_items:unknown[];p_reward_id:string|null;p_request_id:string|null;p_cash_received:number|null}}
const prefix='counternest.pendingCheckout.'
export function loadCheckout(scope:string):CheckoutAttempt|null {
  try{const data=JSON.parse(sessionStorage.getItem(prefix+scope)||'null');return data&&typeof data.id==='string'&&data.args&&Array.isArray(data.args.p_items)&&['cash','card','qr'].includes(data.args.p_payment_method)?data:null}catch{return null}
}
export function saveCheckout(scope:string,attempt:CheckoutAttempt|null){try{if(attempt)sessionStorage.setItem(prefix+scope,JSON.stringify(attempt));else sessionStorage.removeItem(prefix+scope)}catch{/* In-memory retry still protects this open sale. */}}
export function definitiveCheckoutFailure(code?:string){return Boolean(code&&(/^(?:22|23|42|P0)/.test(code)||code==='PGRST202'))}
