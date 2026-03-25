import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Placeholders keep the bundle import-safe without a local `.env`; real calls are gated behind `isSupabaseConfigured()`.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey)
}
