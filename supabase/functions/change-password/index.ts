import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}})
const strong=(value:string)=>value.length>=12&&/[a-z]/.test(value)&&/[A-Z]/.test(value)&&/[0-9]/.test(value)

Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  if(request.method!=='POST')return json(405,{error:'Method not allowed'})
  const authorization=request.headers.get('Authorization')
  if(!authorization?.startsWith('Bearer '))return json(401,{error:'Authentication required'})
  const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anonKey=Deno.env.get('SUPABASE_ANON_KEY')
  if(!url||!serviceKey||!anonKey)return json(500,{error:'Server configuration is incomplete'})

  const admin=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}})
  const{data:userData,error:userError}=await admin.auth.getUser(authorization.slice(7))
  if(userError||!userData.user?.email)return json(401,{error:'Invalid or expired session'})
  const{data:profile,error:profileLookupError}=await admin.from('staff_profiles').select('shop_id,email,active,must_change_password').eq('user_id',userData.user.id).maybeSingle()
  if(profileLookupError||!profile?.active)return json(403,{error:'Active staff account required'})
  if(profile.must_change_password)return json(409,{error:'Complete the initial password change first'})

  let body:{current_password?:string;new_password?:string;confirm_password?:string}
  try{body=await request.json()}catch{return json(400,{error:'Invalid request body'})}
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.values(body).some(value=>typeof value!=='string'))return json(400,{error:'Request fields must be text values'})
  const current=body.current_password??'',next=body.new_password??'',confirm=body.confirm_password??''
  if(next!==confirm)return json(400,{error:'New passwords do not match'})
  if(!strong(next))return json(400,{error:'Use at least 12 characters with upper-case, lower-case, and a number'})
  if(current===next)return json(400,{error:'Choose a password different from the current password'})

  const verifier=createClient(url,anonKey,{auth:{autoRefreshToken:false,persistSession:false}})
  const{error:verifyError}=await verifier.auth.signInWithPassword({email:userData.user.email,password:current})
  if(verifyError)return json(401,{error:'The current password is incorrect'})

  const{error:updateError}=await admin.auth.admin.updateUserById(userData.user.id,{password:next})
  if(updateError)return json(400,{error:'The new password could not be saved'})

  const{error:auditError}=await admin.from('staff_access_audit').insert({
    shop_id:profile.shop_id,action:'password_changed',target_user_id:userData.user.id,
    target_email:profile.email??userData.user.email,performed_by:userData.user.id,
  })
  if(auditError)return json(500,{error:'Password changed, but the security audit record could not be written. Contact an administrator.'})
  return json(200,{complete:true})
})
