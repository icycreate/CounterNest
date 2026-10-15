import { createClient } from '@supabase/supabase-js'
import { validatePublicConfig } from './config'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const config = validatePublicConfig({url, publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY})

export const configurationError = config.error
export const supabaseConfigured = !configurationError
export const supabase = supabaseConfigured ? createClient(config.url!, config.key!) : null
export const demoEnabled = import.meta.env.VITE_ENABLE_DEMO === 'true' || (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO !== 'false')
