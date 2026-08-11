import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseKey = publishableKey ?? anonKey

export const isSupabaseConfigured = Boolean(url && supabaseKey)

export const supabase = createClient(
  url ?? 'http://localhost',
  supabaseKey ?? 'public',
)