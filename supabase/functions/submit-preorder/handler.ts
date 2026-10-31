import {readBody,reply,uuid} from '../_shared/preorderHttp.ts'
export function createSubmissionHandler(db:any,kick:(job:string|null)=>void){
 return async(req:Request)=>{
  if(req.method!=='POST')return reply(req,{error:{message:'Method not allowed'}},405)
  let body:any
  try{
   body=await readBody(req)
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['p_token','p_key','p_items','p_customer'].includes(k))||typeof body.p_token!=='string'||body.p_token.length<16||body.p_token.length>200||!uuid(body.p_key)||!Array.isArray(body.p_items)||body.p_items.length<1||body.p_items.length>25||!body.p_customer||typeof body.p_customer!=='object'||Array.isArray(body.p_customer))throw Error()
  }catch{return reply(req,{error:{code:'P0001',message:'Invalid customer information'}},400)}
  try{
   const {data,error}=await db.rpc('submit_preorder_edge',body)
   if(error)return reply(req,{error:{code:error.code==='P0001'?'P0001':'unavailable',message:error.code==='P0001'?error.message:'Response unavailable. Retry this same request to recover its result.'}},error.code==='P0001'?400:503)
   // The transaction has committed; a failed background kick cannot reverse the order.
   try{kick(data.job_id??null)}catch{}
   return reply(req,data.confirmation)
  }catch{return reply(req,{error:{message:'Response unavailable. Retry this same request to recover its result.'}},503)}
 }
}
