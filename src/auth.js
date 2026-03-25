import { supabase, isSupabaseConfigured } from './supabase.js'

function sanitizeUsernameBase(email) {
  const base = (email || 'explorer').split('@')[0] || 'explorer'
  const cleaned = base.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return cleaned.slice(0, 24) || 'explorer'
}

export async function ensureProfile(user) {
  if (!isSupabaseConfigured()) return
  if (!user?.id) return

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    console.error('[auth] profile lookup failed', selectError)
    return
  }
  if (existing) return

  const base = sanitizeUsernameBase(user.email)
  let username = base
  for (let i = 0; i < 6; i++) {
    const { error } = await supabase.from('profiles').insert({ id: user.id, username })
    if (!error) return
    if (error.code !== '23505') {
      console.error('[auth] profile insert failed', error)
      return
    }
    username = `${base}_${user.id.slice(0, 6)}_${i + 1}`
  }
}

export function initSupabaseAuth() {
  if (!isSupabaseConfigured()) return

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      await ensureProfile(session.user)
    }
    window.dispatchEvent(new CustomEvent('mars-auth', { detail: { event, session } }))
  })
}
