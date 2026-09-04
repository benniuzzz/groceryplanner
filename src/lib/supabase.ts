import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const resolvedKey = publishableKey ?? anonKey

export const isSupabaseConfigured = Boolean(url && resolvedKey)

export const supabaseUrl = url ?? 'http://localhost'
export const supabaseKey = resolvedKey ?? 'public'

export const supabase = createClient(supabaseUrl, supabaseKey)