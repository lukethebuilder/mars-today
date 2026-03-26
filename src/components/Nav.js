import { supabase, isSupabaseConfigured } from '../supabase.js'
import { openAuthModal } from './Auth.js'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function signedOutHtml() {
  return `
    <div class="navInner">
      <a href="#/home" class="navBrand">Mars Today</a>
      <div class="navActions">
        <button type="button" class="btnPrimary" id="navSignIn">Sign in</button>
        <button type="button" class="btnGhost" id="navSignUp">Sign up</button>
      </div>
    </div>
  `
}

function signedInHtml(displayLabel) {
  const label = displayLabel ? escapeHtml(displayLabel) : ''
  return `
    <div class="navInner">
      <a href="#/home" class="navBrand">Mars Today</a>
      <div class="navActions">
        <a href="#/favourites" class="navFavouritesLink mono">Favourites</a>
        <a href="#/collections" class="navFavouritesLink mono">Collections</a>
        <span class="userLabel mono">${label}</span>
        <button type="button" class="btnGhost" id="navSignOut">Sign out</button>
      </div>
    </div>
  `
}

function wireNavActions(mount) {
  mount.querySelector('#navSignOut')?.addEventListener('click', async () => {
    await supabase.auth.signOut()
  })
  mount.querySelector('#navSignIn')?.addEventListener('click', () =>
    openAuthModal({ mode: 'signin' }),
  )
  mount.querySelector('#navSignUp')?.addEventListener('click', () =>
    openAuthModal({ mode: 'signup' }),
  )
}

export function initNav(mount) {
  if (!mount) return

  async function applySessionNav(session) {
    if (!isSupabaseConfigured()) return
    const user = session?.user ?? null
    if (!user) {
      mount.innerHTML = signedOutHtml()
      wireNavActions(mount)
      return
    }

    let displayLabel = user?.email ? String(user.email) : ''
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.username) displayLabel = profile.username
    } catch {
      /* ignore profile lookup failures */
    }

    mount.innerHTML = signedInHtml(displayLabel)
    wireNavActions(mount)
  }

  function refreshFromSession() {
    if (!isSupabaseConfigured()) return
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        void applySessionNav(session)
      })
      .catch(() => {
        mount.innerHTML = signedOutHtml()
        wireNavActions(mount)
      })
  }

  window.addEventListener('mars-auth', () => {
    refreshFromSession()
  })

  if (!isSupabaseConfigured()) {
    mount.innerHTML = `
      <div class="navInner">
        <a href="#/home" class="navBrand">Mars Today</a>
        <div class="navActions">
          <span class="navMuted mono">Supabase in .env for sign-in & saves</span>
        </div>
      </div>
    `
    return
  }

  // Paint signed-out shell immediately — never await getSession before first paint.
  mount.innerHTML = signedOutHtml()
  wireNavActions(mount)
  refreshFromSession()
}
