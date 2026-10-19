import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && key)

// Null when env vars are missing so the app can show a setup screen instead of crashing.
export const supabase = isSupabaseConfigured ? createClient(url, key) : null
