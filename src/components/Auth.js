import { supabase, isSupabaseConfigured } from '../supabase.js'

function closeAuthModal() {
  document.getElementById('auth-modal-root')?.remove()
}

export function openAuthModal({ mode = 'signin' } = {}) {
  if (!isSupabaseConfigured()) {
    window.alert('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
    return
  }

  closeAuthModal()

  const overlay = document.createElement('div')
  overlay.id = 'auth-modal-root'
  overlay.className = 'authOverlay'
  overlay.innerHTML = `
    <div class="authModal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button type="button" class="authClose" aria-label="Close">&times;</button>
      <h2 id="auth-title" class="authTitle">${mode === 'signup' ? 'Create account' : 'Sign in'}</h2>
      <p class="authHint muted">Email + password (Supabase Auth).</p>
      <form class="authForm" id="authForm">
        <label class="authLabel">
          <span>Email</span>
          <input class="authInput" name="email" type="email" autocomplete="email" required />
        </label>
        <label class="authLabel">
          <span>Password</span>
          <input class="authInput" name="password" type="password" autocomplete="current-password" minlength="6" required />
        </label>
        <p class="authError mono" id="authError" hidden></p>
        <button type="submit" class="btnPrimary authSubmit" id="authSubmit">
          ${mode === 'signup' ? 'Sign up' : 'Sign in'}
        </button>
        <button type="button" class="btnGhost authToggle" id="authToggle">
          ${mode === 'signup' ? 'Have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </form>
    </div>
  `

  document.body.appendChild(overlay)

  let currentMode = mode

  const form = overlay.querySelector('#authForm')
  const errEl = overlay.querySelector('#authError')
  const titleEl = overlay.querySelector('#auth-title')
  const submitBtn = overlay.querySelector('#authSubmit')

  function showError(msg) {
    if (!msg) {
      errEl.hidden = true
      errEl.textContent = ''
      return
    }
    errEl.hidden = false
    errEl.textContent = msg
  }

  function setMode(next) {
    currentMode = next
    titleEl.textContent = next === 'signup' ? 'Create account' : 'Sign in'
    submitBtn.textContent = next === 'signup' ? 'Sign up' : 'Sign in'
    overlay.querySelector('#authToggle').textContent =
      next === 'signup' ? 'Have an account? Sign in' : 'Need an account? Sign up'
    showError('')
  }

  overlay.querySelector('.authClose').addEventListener('click', closeAuthModal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthModal()
  })
  overlay.querySelector('#authToggle').addEventListener('click', () => {
    setMode(currentMode === 'signup' ? 'signin' : 'signup')
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(form)
    const email = String(fd.get('email') || '').trim()
    const password = String(fd.get('password') || '')

    showError('')
    submitBtn.disabled = true

    try {
      if (currentMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        closeAuthModal()
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      closeAuthModal()
    } catch (err) {
      showError(String(err?.message || err))
    } finally {
      submitBtn.disabled = false
    }
  })

  return { close: closeAuthModal }
}
