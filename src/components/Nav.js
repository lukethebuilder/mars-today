import { supabase, isSupabaseConfigured } from '../supabase.js'
import { openAuthModal } from './Auth.js'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function initNav(mount) {
  if (!mount) return

  async function render() {
    if (!isSupabaseConfigured()) {
      mount.innerHTML = `
        <div class="navInner">
          <a href="#/home" class="navBrand">Mars Today</a>
          <div class="navActions">
            <span class="navMuted mono">Configure Supabase in .env</span>
          </div>
        </div>
      `
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user ?? null
    const label = user?.email ? escapeHtml(user.email) : ''

    mount.innerHTML = `
      <div class="navInner">
        <a href="#/home" class="navBrand">Mars Today</a>
        <div class="navActions">
          ${
            user
              ? `<span class="userLabel mono">${label}</span>
                 <button type="button" class="btnGhost" id="navSignOut">Sign out</button>`
              : `<button type="button" class="btnPrimary" id="navSignIn">Sign in</button>
                 <button type="button" class="btnGhost" id="navSignUp">Sign up</button>`
          }
        </div>
      </div>
    `

    mount.querySelector('#navSignOut')?.addEventListener('click', async () => {
      await supabase.auth.signOut()
    })
    mount.querySelector('#navSignIn')?.addEventListener('click', () => openAuthModal({ mode: 'signin' }))
    mount.querySelector('#navSignUp')?.addEventListener('click', () => openAuthModal({ mode: 'signup' }))
  }

  window.addEventListener('mars-auth', () => {
    render()
  })

  render()
}
