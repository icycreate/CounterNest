import QRCode from 'qrcode'
import {supabase} from './lib/supabase'
import {customerLinks} from './customerLinks'
export async function getReceiptQr():Promise<string>{
 if(!supabase)return ''
 try{const r=await supabase.rpc('get_receipt_catalogue_link');if(r.error||!r.data?.enabled)return '';const url=customerLinks(r.data.token,r.data.public_base_url).display;return url?await QRCode.toDataURL(url,{width:240,margin:4}):''}catch{return ''}
}
