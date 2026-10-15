import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}})
const strong=(value:string)=>value.length>=12&&/[a-z]/.test(value)&&/[A-Z]/.test(value)&&/[0-9]/.test(value)

Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  if(request.method!=='POST')return json(405,{error:'Method not allowed'})
  const authorization=request.headers.get('Authorization')
  if(!authorization?.startsWith('Bearer '))return json(401,{error:'Authentication required'})
  const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if(!url||!serviceKey)return json(500,{error:'Server configuration is incomplete'})

  const admin=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}})
  const{data:callerData,error:callerError}=await admin.auth.getUser(authorization.slice(7))
  if(callerError||!callerData.user)return json(401,{error:'Invalid or expired session'})
  const{data:caller}=await admin.from('staff_profiles').select('shop_id,role,active,must_change_password').eq('user_id',callerData.user.id).maybeSingle()
  if(!caller?.active||caller.role!=='admin')return json(403,{error:'Administrator access required'})
  if(caller.must_change_password)return json(403,{error:'Complete the initial password change before managing staff'})

  let body:{target_user_id?:string;temporary_password?:string;confirm_password?:string}
  try{body=await request.json()}catch{return json(400,{error:'Invalid request body'})}
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.values(body).some(value=>typeof value!=='string'))return json(400,{error:'Request fields must be text values'})
  const targetUserId=body.target_user_id?.trim()??'',temporaryPassword=body.temporary_password??'',confirmPassword=body.confirm_password??''
  if(temporaryPassword!==confirmPassword)return json(400,{error:'Temporary passwords do not match'})
  if(!targetUserId)return json(400,{error:'Select a staff account'})
  if(targetUserId===callerData.user.id)return json(400,{error:'Use Account Password in Settings to change your own password'})
  if(!strong(temporaryPassword))return json(400,{error:'Temporary password must be at least 12 characters and include upper-case, lower-case, and a number'})

  const{data:target,error:targetError}=await admin.from('staff_profiles').select('user_id,email,display_name,active').eq('user_id',targetUserId).eq('shop_id',caller.shop_id).maybeSingle()
  if(targetError||!target)return json(404,{error:'Staff account not found in this business'})
  if(!target.active)return json(409,{error:'Reactivate the staff account before resetting its password'})

  // Fail closed: block shop operations before replacing the Auth password.
  const{error:profileError}=await admin.from('staff_profiles').update({must_change_password:true,password_initialized_at:null}).eq('user_id',targetUserId).eq('shop_id',caller.shop_id)
  if(profileError)return json(500,{error:'The required password-change status could not be saved; the password was not reset'})

  const{error:updateError}=await admin.auth.admin.updateUserById(targetUserId,{password:temporaryPassword})
  if(updateError)return json(400,{error:'The temporary password could not be saved. The account remains restricted until a private password is set.'})

  const{error:auditError}=await admin.from('staff_access_audit').insert({
    shop_id:caller.shop_id,action:'password_reset_by_admin',target_user_id:targetUserId,
    target_email:target.email,new_active:target.active,performed_by:callerData.user.id,
  })
  if(auditError)return json(500,{error:'The password was reset and marked for change, but its audit record could not be written. Contact system support.'})
  return json(200,{complete:true,user_id:targetUserId,email:target.email,display_name:target.display_name,must_change_password:true})
})
