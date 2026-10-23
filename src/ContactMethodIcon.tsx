import {Phone,Mail,MessageCircle,MessageSquare,Globe} from 'lucide-react'
// Compose the existing local icon primitives; persistent labels identify each application.
export function ContactMethodIcon({kind}:{kind:string}){
 if(kind==='phone')return <Phone size={24} aria-hidden="true"/>
 if(kind==='email')return <Mail size={24} aria-hidden="true"/>
 if(kind==='sms')return <MessageSquare size={24} aria-hidden="true"/>
 if(kind==='whatsapp')return <span className="contact-app-symbol" aria-hidden="true"><MessageCircle size={24}/><Phone className="contact-symbol-inset" size={12}/></span>
 if(kind==='line')return <span className="contact-app-symbol" aria-hidden="true"><MessageCircle size={24}/><b>LINE</b></span>
 if(kind==='messenger')return <span className="contact-app-symbol" aria-hidden="true"><MessageCircle size={24}/><b>ϟ</b></span>
 if(kind==='wechat')return <span className="contact-app-symbol contact-wechat" aria-hidden="true"><MessageCircle size={24}/><MessageCircle className="contact-symbol-inset" size={16}/></span>
 return <Globe size={24} aria-hidden="true"/>
}
