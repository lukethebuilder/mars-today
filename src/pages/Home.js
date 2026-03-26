import { CURIOSITY_INSTRUMENTS, getCuriosityPhotosBySol, getLatestCuriositySol } from '../nasa.js'
import { openAuthModal } from '../components/Auth.js'
import { openPhotoModal } from '../components/PhotoModal.js'
import { supabase, isSupabaseConfigured } from '../supabase.js'
import { alertIfFavouriteFailed, favouriteKey, fetchFavouriteKeys, toggleFavourite } from '../favourites.js'
import { PhotoCard } from '../components/PhotoCard.js'
import { getHashRoute } from '../routeUtils.js'

const NASA_BANNER_DISMISS_KEY = 'marsTodayNasaApiBannerDismissed'

let marsAuthHandler = null
let loadId = 0

function isNasaApiBannerDismissed() {
  try {
    return sessionStorage.getItem(NASA_BANNER_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

let runId = 0

export async function renderHome() {
  const myRunId = ++runId

  if (marsAuthHandler) {
    window.removeEventListener('mars-auth', marsAuthHandler)
    marsAuthHandler = null
  }

  const skeletonCount = 12
  const perPage = skeletonCount
  const state = {
    sol: 0,
    camera: '',
    photos: [],
    loading: true,
    error: null,
    noResults: false,
    usedMock: false,
    apiMore: false,
    apiPage: 0,
    favouriteKeys: new Set(),
  }

  function selectedCameraLabel() {
    if (!state.camera) return 'All cameras'
    const match = CURIOSITY_INSTRUMENTS.find((o) => o.value === state.camera)
    return match?.label || state.camera
  }

  function solControlsHtml() {
    const camOpts = CURIOSITY_INSTRUMENTS.map(
      (o) =>
        `<option value="${escapeHtml(o.value)}" ${state.camera === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`,
    ).join('')

    const prevDisabled = state.loading || state.sol <= 0 ? 'disabled' : ''
    const nextDisabled = state.loading ? 'disabled' : ''

    return `
      <div class="solControlsBar mono">
        <div class="solRow" aria-label="Browse photos by day">
          <button
            type="button"
            class="btnGhost solNavBtn"
            id="homePrevSol"
            aria-label="Browse older photos"
            ${prevDisabled}
          >
            ‹ Older photos
          </button>

          <span class="solNumberWrap" aria-label="Current sol">
            <span class="muted">Sol</span>
            <span class="solNumber mono" id="homeSolNumber">${escapeHtml(state.sol)}</span>
          </span>

          <button
            type="button"
            class="btnGhost solNavBtn"
            id="homeNextSol"
            aria-label="Browse newer photos"
            ${nextDisabled}
          >
            Newer photos ›
          </button>
        </div>

        <label class="homeCameraSelectLabel roverBrowseField roverBrowseField--grow">
          <span class="muted">Camera</span>
          <select class="roverCameraSelect mono" id="homeCameraSelect" ${state.loading ? 'disabled' : ''}>
            ${camOpts}
          </select>
        </label>
      </div>
    `
  }

  function skeletonCard(i) {
    return `
      <article class="photoCard skeleton" aria-hidden="true" data-skel="${i}">
        <div class="skeletonImg" />
      </article>
    `
  }

  function photoGridHtml() {
    if (state.loading) {
      return `
        <div class="photoGrid">
          ${Array.from({ length: skeletonCount })
            .map((_, i) => skeletonCard(i))
            .join('')}
        </div>
      `
    }

    if (state.error) {
      return `
        <div class="panel">
          <p class="muted">Could not load Curiosity photos.</p>
          <p class="mono">${escapeHtml(String(state.error?.message || state.error))}</p>
        </div>
      `
    }

    if (state.noResults) {
      const camLabel = selectedCameraLabel()
      const solLabel = String(state.sol)
      const resetBtn =
        state.camera && state.camera !== ''
          ? `<button type="button" class="btnGhost mono" id="homeResetCamera">All cameras</button>`
          : ''
      const details = state.apiMore
        ? `No photos for ${camLabel} on this day yet. Try “Load more photos” to search earlier frames.`
        : `No photos for ${camLabel} on this day yet. Some cameras update only occasionally — try another day or switch to “All cameras”.`
      return `
        <div class="panel homeNoResultsPanel">
          <p class="muted">${escapeHtml(details)}</p>
          ${resetBtn}
        </div>
      `
    }

    const photoSection = 'curiosity'
    const roverLabel = 'Curiosity'
    const interactive = !state.loading && !state.error

    const showFavourite = isSupabaseConfigured()
    const cards = state.photos.map((p, i) => {
        const isFavourited = state.favouriteKeys instanceof Set && state.favouriteKeys.has(favouriteKey(p, photoSection))
        return PhotoCard({
          photo: p,
          roverLabel,
          showSampleBadge: state.usedMock === true,
          showFavourite,
          isFavourited,
          photoSection,
          photoIndex: i,
          interactive,
        })
      }).join('')

    return `<div class="photoGrid">${cards}</div>`
  }

  function renderPage() {
    const root = document.querySelector('#pageMount')
    if (!root) return

    const showBanner = state.usedMock === true && !isNasaApiBannerDismissed()

    root.innerHTML = `
    <div class="page">
      ${
        showBanner
          ? `
      <div class="nasaApiBanner" role="status">
        <p class="nasaApiBannerText">
          ⚠️ Some NASA feeds are temporarily unavailable — these are sample images, not live data.
          The app will show real imagery when NASA's APIs respond.
          <span class="nasaApiBannerLinkWrap">
            <a href="https://api.nasa.gov" target="_blank" rel="noopener noreferrer">api.nasa.gov</a>
          </span>
        </p>
        <button type="button" class="nasaApiBannerClose" aria-label="Dismiss notification">&times;</button>
      </div>
      `
          : ''
      }
      <header class="heroStrip">
        <div>
          <h1 class="appTitle">Mars Today</h1>
          <p class="subtitle muted">
            Real photos beamed back from Mars — updated every sol (a Martian day, ~24h 37m).
          </p>
          <p class="subtitle muted">
            Taken by NASA's Curiosity rover, exploring Mars since 2012.
          </p>
        </div>
      </header>

      <main class="pageBody">
        ${solControlsHtml()}
        ${photoGridHtml()}

        ${
          !state.loading && !state.error && state.apiMore
            ? `
          <div class="homeLoadMoreWrap">
            <button type="button" class="btnGhost mono" id="homeLoadMore">Load more photos</button>
          </div>
          `
            : ''
        }
      </main>
    </div>
  `

    root.querySelector('.nasaApiBannerClose')?.addEventListener('click', () => {
      try {
        sessionStorage.setItem(NASA_BANNER_DISMISS_KEY, '1')
      } catch {
        /* ignore */
      }
      renderPage()
    })

    root.querySelector('#homePrevSol')?.addEventListener('click', () => {
      if (state.loading) return
      const nextSol = Math.max(0, state.sol - 1)
      if (nextSol === state.sol) return
      state.sol = nextSol
      state.apiPage = 0
      state.apiMore = false
      state.photos = []
      fetchCuriositySol({ reset: true })
    })

    root.querySelector('#homeNextSol')?.addEventListener('click', () => {
      if (state.loading) return
      state.sol += 1
      state.apiPage = 0
      state.apiMore = false
      state.photos = []
      fetchCuriositySol({ reset: true })
    })

    root.querySelector('#homeCameraSelect')?.addEventListener('change', (e) => {
      const v = (e.target?.value || '').trim()
      if (v === state.camera) return
      state.camera = v
      state.apiPage = 0
      state.apiMore = false
      state.photos = []
      state.noResults = false
      fetchCuriositySol({ reset: true })
    })

    root.querySelector('#homeResetCamera')?.addEventListener('click', () => {
      state.camera = ''
      state.apiPage = 0
      state.apiMore = false
      state.photos = []
      state.noResults = false
      fetchCuriositySol({ reset: true })
    })

    root.querySelectorAll('.photoCardFavBtn').forEach((btn) => {
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

    root.querySelectorAll('.photoCard--interactive').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.photoCardFavBtn')) return
        const i = Number(card.dataset.photoIndex)
        const photo = state.photos[i]
        if (!photo) return
        openPhotoModal({
          photo,
          source: 'curiosity',
          roverLabel: 'Curiosity',
        })
      })
    })

    root.querySelector('#homeLoadMore')?.addEventListener('click', async () => {
      if (state.loading || !state.apiMore) return
      await fetchCuriositySol({ reset: false })
    })
  }

  async function fetchCuriositySol({ reset }) {
    if (myRunId !== runId) return
    const nextLoadId = ++loadId
    state.loading = true
    state.error = null
    state.noResults = false
    if (reset) {
      state.photos = []
      state.apiPage = 0
      state.apiMore = false
      state.noResults = false
    }
    renderPage()

    const page = reset ? 0 : state.apiPage
    try {
      const result = await getCuriosityPhotosBySol(state.sol, {
        page,
        camera: state.camera,
        perPage,
      })
      if (nextLoadId !== loadId) return
      if (myRunId !== runId) return
      if (getHashRoute().path !== '/home') return

      const photos = Array.isArray(result?.photos) ? result.photos : []
      const usedMock = result?.usedMock === true
      if (reset) state.photos = photos
      else state.photos = [...state.photos, ...photos]

      state.usedMock = usedMock
      state.apiMore = result?.more === true
      state.apiPage = page + 1
      state.loading = false
      state.error = null
      state.noResults = state.photos.length === 0

      // No results are shown via the explicit empty-state, not as an error panel.
      renderPage()
    } catch (err) {
      if (nextLoadId !== loadId) return
      if (myRunId !== runId) return
      if (getHashRoute().path !== '/home') return
      state.loading = false
      state.error = err
      state.noResults = false
      renderPage()
    }
  }

  function syncAuthFromSession() {
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (myRunId !== runId) return
        if (getHashRoute().path !== '/home') return
        const userLoggedIn = !!session?.user
        if (userLoggedIn) {
          state.favouriteKeys = await fetchFavouriteKeys()
        } else {
          state.favouriteKeys = new Set()
        }
        renderPage()
      })
      .catch((err) => {
        console.warn('[home] getSession failed', err)
      })
  }

  marsAuthHandler = syncAuthFromSession
  window.addEventListener('mars-auth', marsAuthHandler)
  queueMicrotask(syncAuthFromSession)

  // Paint immediately — router cleared #pageMount; do not await Supabase before first render.
  renderPage()

  getLatestCuriositySol()
    .then((latest) => {
      if (myRunId !== runId) return
      if (getHashRoute().path !== '/home') return
      state.sol = Number.isFinite(latest) && latest >= 0 ? Math.floor(latest) : 0
      fetchCuriositySol({ reset: true })
    })
    .catch(() => {
      if (myRunId !== runId) return
      if (getHashRoute().path !== '/home') return
      state.sol = 0
      fetchCuriositySol({ reset: true })
    })
}
