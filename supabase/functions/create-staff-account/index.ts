import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json(401, { error: 'Authentication required' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json(500, { error: 'Server configuration is incomplete' })

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const token = authorization.slice(7)
  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !callerData.user) return json(401, { error: 'Invalid or expired session' })

  const { data: caller } = await admin.from('staff_profiles')
    .select('shop_id,role,active,must_change_password').eq('user_id', callerData.user.id).maybeSingle()
  if (!caller?.active || caller.role !== 'admin') return json(403, { error: 'Administrator access required' })
  if(caller.must_change_password)return json(403,{error:'Complete the initial password change before managing staff'})

  let body: { email?: string; display_name?: string; role?: string; temporary_password?: string; confirm_password?: string }
  try { body = await request.json() } catch { return json(400, { error: 'Invalid request body' }) }
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.values(body).some(value=>typeof value!=='string'))return json(400,{error:'Request fields must be text values'})
  const email = body.email?.trim().toLowerCase() ?? ''
  const displayName = body.display_name?.trim() ?? ''
  const role = body.role === 'admin' ? 'admin' : body.role === 'employee' ? 'employee' : ''
  const password = body.temporary_password ?? ''
  const confirmPassword = body.confirm_password ?? ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Enter a valid email address' })
  if (displayName.length < 2 || displayName.length > 80) return json(400, { error: 'Display name must be 2–80 characters' })
  if (!role) return json(400, { error: 'Select a valid staff role' })
  if (password !== confirmPassword) return json(400, { error: 'Temporary passwords do not match' })
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return json(400, { error: 'Temporary password must be at least 12 characters and include upper-case, lower-case, and a number' })
  }

  if(role==='admin'){
    const{data:callerState,error:ownerCheckError}=await admin.rpc('workspace_actor_state',{p_actor:callerData.user.id})
    if(ownerCheckError||!callerState?.is_owner)return json(403,{error:'Workspace owner access required'})
  }
  const { data: existing } = await admin.from('staff_profiles').select('user_id')
    .eq('shop_id', caller.shop_id).eq('email', email).maybeSingle()
  if (existing) return json(409, { error: 'This email already belongs to a staff account' })

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { display_name: displayName, provisioned_by_pos: true },
  })
  if (createError || !created.user) {
    const duplicate = createError?.message?.toLowerCase().includes('already')
    return json(duplicate ? 409 : 400, { error: duplicate ? 'An account already exists for this email' : 'The staff account could not be created' })
  }

  const profileResult = await admin.from('staff_profiles').insert({
    user_id: created.user.id, shop_id: caller.shop_id, display_name: displayName,
    email, role, active: true, must_change_password: true, created_by: callerData.user.id,
  })
  if (profileResult.error) {
    await admin.auth.admin.deleteUser(created.user.id)
    return json(500, { error: 'The staff profile could not be created; no account was retained' })
  }

  const auditResult = await admin.from('staff_access_audit').insert({
    shop_id: caller.shop_id, action: 'account_created_directly', target_user_id: created.user.id,
    target_email: email, new_role: role, new_active: true, performed_by: callerData.user.id,
  })
  if (auditResult.error) {
    await admin.from('staff_profiles').delete().eq('user_id', created.user.id)
    await admin.auth.admin.deleteUser(created.user.id)
    return json(500, { error: 'The audit record could not be written; no account was retained' })
  }

  return json(201, { user_id: created.user.id, email, display_name: displayName, role, must_change_password: true })
})
