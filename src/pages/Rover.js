import {
  getCuriosityPhotosByEarthDate,
  getCuriosityPhotosBySol,
  getLatestCuriositySol,
} from '../nasa.js'
import { RoverGallery } from '../components/RoverGallery.js'
import { roverBrowseControlsHtml } from '../components/SolPicker.js'
import { openPhotoModal } from '../components/PhotoModal.js'
import { openAuthModal } from '../components/Auth.js'
import { supabase, isSupabaseConfigured } from '../supabase.js'
import { alertIfFavouriteFailed, fetchFavouriteKeys, toggleFavourite } from '../favourites.js'
import { fetchCommentCountsMap } from '../comments.js'

let runId = 0
let marsAuthHandler = null
let marsCommentsHandler = null

function roverHash({ mode, sol, earthDate, camera }) {
  const p = new URLSearchParams()
  if (mode === 'earth') p.set('earth_date', earthDate)
  else p.set('sol', String(sol))
  if (camera) p.set('camera', camera)
  return `#/rover/curiosity?${p.toString()}`
}

export async function renderRover(searchParams) {
  const myRunId = ++runId

  if (marsAuthHandler) {
    window.removeEventListener('mars-auth', marsAuthHandler)
    marsAuthHandler = null
  }
  if (marsCommentsHandler) {
    window.removeEventListener('mars-comments-changed', marsCommentsHandler)
    marsCommentsHandler = null
  }

  const root = document.querySelector('#pageMount')
  if (!root) return

  const camera = (searchParams.get('camera') || '').trim()
  const earthRaw = (searchParams.get('earth_date') || '').trim()
  const solParsed = parseInt(searchParams.get('sol') || '', 10)

  let mode = earthRaw ? 'earth' : 'sol'
  let sol = Number.isFinite(solParsed) && solParsed >= 0 ? solParsed : NaN
  let earthDate = earthRaw

  if (mode === 'earth' && !/^\d{4}-\d{2}-\d{2}$/.test(earthDate)) {
    root.innerHTML = `
      <div class="page">
        <p class="muted">Use a valid Earth date (YYYY-MM-DD).</p>
        <p><a class="link" href="#/rover/curiosity">Curiosity browse</a> · <a class="link" href="#/home">Home</a></p>
      </div>
    `
    return
  }

  if (mode === 'sol' && !Number.isFinite(sol)) {
    const latest = await getLatestCuriositySol()
    const s = latest > 0 ? latest : 0
    window.location.replace(roverHash({ mode: 'sol', sol: s, earthDate: '', camera }))
    return
  }

  const skeletonCount = 24

  const state = {
    mode,
    sol,
    earthDate,
    camera,
    photos: [],
    loading: true,
    error: null,
    usedMock: false,
    apiMore: false,
    apiPage: 0,
    userLoggedIn: false,
    favouriteKeys: new Set(),
    commentCounts: new Map(),
  }

  function scheduleCommentCounts() {
    if (!isSupabaseConfigured()) return
    if (!state.photos.length) return
    fetchCommentCountsMap(state.photos, []).then((map) => {
      if (myRunId !== runId) return
      state.commentCounts = map
      renderPage()
    })
  }

  function renderPage() {
    const mount = document.querySelector('#pageMount')
    if (!mount) return

    const showBanner = state.usedMock === true
    const subtitle =
      state.mode === 'earth'
        ? `Earth date ${state.earthDate} · matching Curiosity frames`
        : `Sol ${state.sol} · Browse prev/next or pick an Earth date`

    mount.innerHTML = `
      <div class="page">
        ${
          showBanner
            ? `
        <div class="nasaApiBanner" role="status">
          <p class="nasaApiBannerText">
            Showing sample NASA Images — Mars feed unavailable. Try again later for live Curiosity raw images.
          </p>
        </div>
        `
            : ''
        }
        <header class="topBar">
          <div>
            <h1 class="appTitle">Curiosity rover</h1>
            <p class="subtitle muted">
              Browse NASA MSL raw images by sol, Earth date, and camera. Same feed as the home page, with more control.
            </p>
          </div>
          <a class="accentPill mono link" href="#/home" style="text-decoration:none;align-self:center">← Home</a>
        </header>

        ${roverBrowseControlsHtml({
          mode: state.mode,
          sol: state.sol,
          earthDate: state.earthDate,
          camera: state.camera,
          apiMore: state.apiMore,
          loading: state.loading,
        })}

        <main class="pageBody roverPageBody">
          ${RoverGallery({
            roverLabel: 'Curiosity',
            photos: state.photos,
            loading: state.loading,
            error: state.error,
            skeletonCount,
            usedMock: state.usedMock === true,
            headerRightLabel: state.mode === 'earth' ? 'Earth date match' : 'raw images',
            sectionSubtitle: subtitle,
            showApodRefresh: false,
            signUpNudgeHtml: state.userLoggedIn
              ? isSupabaseConfigured()
                ? `<a href="#/favourites" class="link">Favourites</a> · <a href="#/collections" class="link">Collections</a>`
                : ''
              : `<a href="#" class="link roverSignUp">Sign up</a> to save favourites`,
            photoSection: 'curiosity',
            showFavourite: state.userLoggedIn && isSupabaseConfigured(),
            favouriteKeys: state.favouriteKeys,
            commentCounts: state.commentCounts,
            interactive: !state.loading && !state.error,
          })}
        </main>
      </div>
    `

    mount.querySelector('.roverSignUp')?.addEventListener('click', (e) => {
      e.preventDefault()
      openAuthModal({ mode: 'signup' })
    })

    mount.querySelectorAll('[data-rover-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.roverMode
        if (next === state.mode) return
        if (next === 'earth') {
          const d = state.earthDate || new Date().toISOString().slice(0, 10)
          window.location.hash = roverHash({
            mode: 'earth',
            sol: state.sol,
            earthDate: d,
            camera: state.camera,
          })
        } else {
          window.location.hash = roverHash({
            mode: 'sol',
            sol: state.sol,
            earthDate: '',
            camera: state.camera,
          })
        }
      })
    })

    const solRow = mount.querySelector('#roverBrowseSolRow')
    const earthRow = mount.querySelector('#roverBrowseEarthRow')

    mount.querySelectorAll('[data-rover-mode]').forEach((btn) => {
      const m = btn.dataset.roverMode
      if ((m === 'sol' && state.mode === 'sol') || (m === 'earth' && state.mode === 'earth')) {
        btn.classList.add('roverModeBtn--active')
      } else {
        btn.classList.remove('roverModeBtn--active')
      }
    })
    if (solRow && earthRow) {
      solRow.hidden = state.mode !== 'sol'
      earthRow.hidden = state.mode !== 'earth'
    }

    mount.querySelectorAll('.roverSolNav').forEach((btn) => {
      const delta = Number(btn.dataset.solDelta)
      btn.disabled = state.loading || (delta < 0 && state.sol <= 0)
      btn.addEventListener('click', () => {
        const next = Math.max(0, state.sol + delta)
        window.location.hash = roverHash({
          mode: 'sol',
          sol: next,
          earthDate: state.earthDate,
          camera: state.camera,
        })
      })
    })

    mount.querySelector('#roverApplySol')?.addEventListener('click', () => {
      const input = mount.querySelector('#roverSolInput')
      const v = parseInt(input?.value || '', 10)
      if (!Number.isFinite(v) || v < 0) return
      window.location.hash = roverHash({
        mode: 'sol',
        sol: v,
        earthDate: '',
        camera: mount.querySelector('#roverCameraSelect')?.value || '',
      })
    })

    mount.querySelector('#roverApplyEarth')?.addEventListener('click', () => {
      const input = mount.querySelector('#roverEarthDateInput')
      const d = (input?.value || '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return
      window.location.hash = roverHash({
        mode: 'earth',
        sol: state.sol,
        earthDate: d,
        camera: mount.querySelector('#roverCameraSelect')?.value || '',
      })
    })

    mount.querySelector('#roverApplyCamera')?.addEventListener('click', () => {
      const cam = mount.querySelector('#roverCameraSelect')?.value || ''
      window.location.hash = roverHash({
        mode: state.mode,
        sol: state.sol,
        earthDate: state.earthDate,
        camera: cam,
      })
    })

    mount.querySelector('#roverLoadMore')?.addEventListener('click', () => {
      if (state.mode !== 'sol' || state.loading) return
      loadSol(false)
    })

    mount.querySelectorAll('.photoCardFavBtn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        const i = Number(btn.dataset.photoIndex)
        const photo = state.photos[i]
        if (!photo) return
        const res = await toggleFavourite(photo, 'curiosity')
        if (!res.ok) {
          if (res.reason === 'auth') openAuthModal({ mode: 'signin' })
          else alertIfFavouriteFailed(res)
          return
        }
        state.favouriteKeys = await fetchFavouriteKeys()
        renderPage()
      })
    })

    mount.querySelectorAll('.photoCard--interactive').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.photoCardFavBtn')) return
        const i = Number(card.dataset.photoIndex)
        const photo = state.photos[i]
        if (!photo) return
        openPhotoModal({
          photo,
          source: 'curiosity',
          roverLabel: 'Curiosity',
          onClosed: () => scheduleCommentCounts(),
        })
      })
    })
  }

  async function loadSol(reset) {
    if (myRunId !== runId) return
    state.loading = true
    state.error = null
    if (reset) {
      state.apiPage = 0
      state.photos = []
    }
    renderPage()

    const page = state.apiPage
    try {
      const r = await getCuriosityPhotosBySol(state.sol, {
        page,
        camera: state.camera,
        perPage: 25,
      })
      if (myRunId !== runId) return
      const merged = reset ? r.photos : [...state.photos, ...r.photos]
      state.photos = merged
      state.apiMore = r.more
      state.apiPage = page + 1
      state.usedMock = r.usedMock
      state.loading = false
      if (merged.length === 0 && !r.more) {
        state.error = new Error('No images for this sol (with current camera filter).')
      }
    } catch (err) {
      if (myRunId !== runId) return
      state.error = err
      state.loading = false
    }
    renderPage()
    scheduleCommentCounts()
  }

  async function loadEarth() {
    if (myRunId !== runId) return
    state.loading = true
    state.error = null
    state.photos = []
    state.apiMore = false
    renderPage()
    try {
      const r = await getCuriosityPhotosByEarthDate(state.earthDate, {
        camera: state.camera,
      })
      if (myRunId !== runId) return
      state.photos = r.photos
      state.usedMock = r.usedMock
      state.loading = false
      if (!r.photos.length) {
        state.error = new Error('No Curiosity images matched that Earth date (try another date or All cameras).')
      }
    } catch (err) {
      if (myRunId !== runId) return
      state.error = err
      state.loading = false
    }
    renderPage()
    scheduleCommentCounts()
  }

  function syncAuthFromSession() {
    if (!isSupabaseConfigured()) return
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (myRunId !== runId) return
        state.userLoggedIn = !!session?.user
        if (state.userLoggedIn) {
          state.favouriteKeys = await fetchFavouriteKeys()
        } else {
          state.favouriteKeys = new Set()
        }
        renderPage()
      })
      .catch((err) => {
        console.warn('[rover] getSession failed', err)
      })
  }

  marsAuthHandler = syncAuthFromSession
  window.addEventListener('mars-auth', marsAuthHandler)
  queueMicrotask(syncAuthFromSession)

  marsCommentsHandler = () => {
    if (myRunId !== runId) return
    scheduleCommentCounts()
  }
  window.addEventListener('mars-comments-changed', marsCommentsHandler)

  renderPage()

  if (state.mode === 'earth') {
    await loadEarth()
  } else {
    await loadSol(true)
  }
}
