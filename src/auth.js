import { supabase, isSupabaseConfigured } from './supabase.js'

function sanitizeUsernameBase(email) {
  const base = (email || 'explorer').split('@')[0] || 'explorer'
  const cleaned = base.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return cleaned.slice(0, 24) || 'explorer'
}

export async function ensureProfile(user) {
  if (!isSupabaseConfigured()) return
  if (!user?.id) return

  const email = user.email != null ? String(user.email).trim() || null : null

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    console.error('[auth] profile lookup failed', selectError)
    return
  }

  if (existing) {
    const { error: upErr } = await supabase.from('profiles').update({ email }).eq('id', user.id)
    if (upErr) {
      console.warn('[auth] profile email sync failed (add profiles.email column?)', upErr)
    }
    return
  }

  const base = sanitizeUsernameBase(user.email)
  let username = base
  for (let i = 0; i < 6; i++) {
    const { error } = await supabase.from('profiles').insert({ id: user.id, username, email })
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

  // Supabase awaits onAuthStateChange callbacks before resolving signInWithPassword.
  // Never await network work here — it blocks the sign-in promise and leaves the UI stuck.
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      void ensureProfile(session.user).catch((err) =>
        console.error('[auth] ensureProfile failed', err),
      )
    }
    window.dispatchEvent(new CustomEvent('mars-auth', { detail: { event, session } }))
  })
}
