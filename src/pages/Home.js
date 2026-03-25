import { getLatestPhotos, getAPODPhotos } from '../nasa.js'
import { RoverGallery } from '../components/RoverGallery.js'
import { openAuthModal } from '../components/Auth.js'
import { openPhotoModal } from '../components/PhotoModal.js'
import { supabase, isSupabaseConfigured } from '../supabase.js'
import { alertIfFavouriteFailed, fetchFavouriteKeys, toggleFavourite } from '../favourites.js'
import { fetchCommentCountsMap } from '../comments.js'

const NASA_BANNER_DISMISS_KEY = 'marsTodayNasaApiBannerDismissed'

/** Incremented on each APOD fetch (initial or refresh); stale responses are ignored. */
let apodLoadId = 0
let marsAuthHandler = null
let marsCommentsHandler = null

function isNasaApiBannerDismissed() {
  try {
    return sessionStorage.getItem(NASA_BANNER_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function curiositySectionSubtitle(photos) {
  const first = photos && photos[0]
  const sol = first != null && first.sol != null ? String(first.sol) : '—'
  return `Sol ${sol} · Latest from Mars surface · <a href="#/rover/curiosity" class="link">Browse by sol</a>`
}

function welcomeStripHtml() {
  return `
    <div class="welcomeStrip">
      <div class="welcomeStripGrid">
        <div class="welcomeCard">
          <p class="welcomeCardTitle">🔴 Raw from Mars</p>
          <p class="welcomeCardBody muted">
            These are unedited photos taken by NASA's Curiosity rover on the surface of Mars today. No filters, no processing.
          </p>
        </div>
        <div class="welcomeCard">
          <p class="welcomeCardTitle">🌌 From the archive</p>
          <p class="welcomeCardBody muted">
            Curated astronomy images from NASA's daily photo program going back to 1995. Hit refresh for a new selection.
          </p>
        </div>
        <div class="welcomeCard">
          <p class="welcomeCardTitle">❤️ Save your favourites</p>
          <p class="welcomeCardBody muted">
            Sign up to heart photos and build personal collections. Free, no spam.
          </p>
        </div>
      </div>
    </div>
  `
}

function sectionBridgeHtml() {
  return `
    <p class="sectionBridge mono muted" role="presentation">
      — while Curiosity explores Mars, here's what else is out there —
    </p>
  `
}

function signUpNudgeHtml() {
  return `Sign up to ❤️ favourite photos and save collections.`.replace(
    'Sign up',
    '<a href="#" class="link homeSignUpLink">Sign up</a>',
  )
}

function loggedInFavouritesNudgeHtml() {
  return `Tap ♡ to save · click a photo for full size and comments. <a href="#/favourites" class="link">Favourites</a> · <a href="#/collections" class="link">Collections</a>`
}

let runId = 0

export async function renderHome() {
  const myRunId = ++runId

  if (marsAuthHandler) {
    window.removeEventListener('mars-auth', marsAuthHandler)
    marsAuthHandler = null
  }
  if (marsCommentsHandler) {
    window.removeEventListener('mars-comments-changed', marsCommentsHandler)
    marsCommentsHandler = null
  }

  const skeletonCount = 12
  const state = {
    curiosity: {
      photos: [],
      loading: true,
      error: null,
      skeletonCount,
      usedMock: false,
    },
    apod: {
      photos: [],
      loading: true,
      error: null,
      skeletonCount,
      usedMock: false,
    },
    userLoggedIn: false,
    favouriteKeys: new Set(),
    commentCounts: new Map(),
  }

  function scheduleCommentCounts() {
    if (!isSupabaseConfigured()) return
    const c = state.curiosity.photos
    const a = state.apod.photos
    if (!c.length && !a.length) return
    fetchCommentCountsMap(c, a).then((map) => {
      if (myRunId !== runId) return
      state.commentCounts = map
      renderPage()
    })
  }

  function renderPage() {
    const root = document.querySelector('#pageMount')
    if (!root) return

    const { curiosity, apod } = state
    const nasaApiUnavailable =
      curiosity.usedMock === true || apod.usedMock === true
    const showBanner = nasaApiUnavailable && !isNasaApiBannerDismissed()

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
      <header class="topBar">
        <div>
          <h1 class="appTitle">Mars Today</h1>
          <p class="subtitle muted">
            Daily raw photos from NASA's Curiosity rover on Mars, alongside stunning imagery from the universe.
          </p>
        </div>
        <div class="accentPill mono">latest photos</div>
      </header>

      ${welcomeStripHtml()}

      <main class="pageBody">
        ${RoverGallery({
          roverLabel: 'Curiosity',
          photos: curiosity.photos,
          loading: curiosity.loading,
          error: curiosity.error,
          skeletonCount: curiosity.skeletonCount,
          usedMock: curiosity.usedMock === true,
          headerRightLabel: 'latest photos',
          sectionSubtitle: curiositySectionSubtitle(curiosity.photos),
          showApodRefresh: false,
          signUpNudgeHtml: state.userLoggedIn
            ? isSupabaseConfigured()
              ? loggedInFavouritesNudgeHtml()
              : ''
            : signUpNudgeHtml(),
          photoSection: 'curiosity',
          showFavourite: state.userLoggedIn && isSupabaseConfigured(),
          favouriteKeys: state.favouriteKeys,
          commentCounts: state.commentCounts,
          interactive: !curiosity.loading && !curiosity.error,
        })}

        ${sectionBridgeHtml()}

        ${RoverGallery({
          roverLabel: 'From the Universe',
          photos: apod.photos,
          loading: apod.loading,
          error: apod.error,
          skeletonCount: apod.skeletonCount,
          usedMock: apod.usedMock === true,
          headerRightLabel: 'random selection from archive',
          sectionSubtitle:
            'Refreshes every visit · NASA astronomy archive 1995–present',
          showApodRefresh: true,
          signUpNudgeHtml: '',
          photoSection: 'apod',
          showFavourite: state.userLoggedIn && isSupabaseConfigured(),
          favouriteKeys: state.favouriteKeys,
          commentCounts: state.commentCounts,
          interactive: !apod.loading && !apod.error,
        })}
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

    root.querySelector('.homeSignUpLink')?.addEventListener('click', (e) => {
      e.preventDefault()
      openAuthModal({ mode: 'signup' })
    })

    root.querySelectorAll('.photoCardFavBtn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        const section = btn.dataset.photoSection
        const i = Number(btn.dataset.photoIndex)
        if (!section || Number.isNaN(i)) return
        const photo =
          section === 'curiosity'
            ? state.curiosity.photos[i]
            : state.apod.photos[i]
        if (!photo) return
        const src = section === 'apod' ? 'apod' : 'curiosity'
        const res = await toggleFavourite(photo, src)
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
        const section = card.dataset.photoSection
        const i = Number(card.dataset.photoIndex)
        if (!section || Number.isNaN(i)) return
        const photo =
          section === 'curiosity'
            ? state.curiosity.photos[i]
            : state.apod.photos[i]
        if (!photo) return
        const src = section === 'apod' ? 'apod' : 'curiosity'
        const roverLabel = section === 'apod' ? 'From the Universe' : 'Curiosity'
        openPhotoModal({
          photo,
          source: src,
          roverLabel,
          onClosed: () => scheduleCommentCounts(),
        })
      })
    })

    root.querySelector('.apodRefreshBtn')?.addEventListener('click', () => {
      const loadId = ++apodLoadId
      state.apod = {
        ...state.apod,
        loading: true,
        photos: [],
        error: null,
      }
      renderPage()
      getAPODPhotos()
        .then((result) => {
          if (loadId !== apodLoadId) return
          if (myRunId !== runId) return
          const photos = Array.isArray(result?.photos) ? result.photos : []
          const usedMock = result?.usedMock === true
          state.apod = {
            ...state.apod,
            photos,
            loading: false,
            error: null,
            usedMock,
          }
          renderPage()
          scheduleCommentCounts()
        })
        .catch((err) => {
          if (loadId !== apodLoadId) return
          if (myRunId !== runId) return
          state.apod = {
            ...state.apod,
            photos: [],
            loading: false,
            error: err,
            usedMock: false,
          }
          renderPage()
        })
    })
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
        console.warn('[home] getSession failed', err)
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

  // Paint immediately — router cleared #pageMount; do not await Supabase before first render.
  renderPage()

  const initialApodLoadId = ++apodLoadId

  const tasks = [
    getLatestPhotos('curiosity')
      .then((result) => {
        if (myRunId !== runId) return
        const photos = Array.isArray(result?.photos) ? result.photos : []
        const usedMock = result?.usedMock === true
        state.curiosity = {
          ...state.curiosity,
          photos,
          loading: false,
          error: null,
          usedMock,
        }
        renderPage()
        scheduleCommentCounts()
      })
      .catch((err) => {
        if (myRunId !== runId) return
        state.curiosity = {
          ...state.curiosity,
          photos: [],
          loading: false,
          error: err,
          usedMock: false,
        }
        renderPage()
      }),

    getAPODPhotos()
      .then((result) => {
        if (initialApodLoadId !== apodLoadId) return
        if (myRunId !== runId) return
        const photos = Array.isArray(result?.photos) ? result.photos : []
        const usedMock = result?.usedMock === true
        state.apod = {
          ...state.apod,
          photos,
          loading: false,
          error: null,
          usedMock,
        }
        renderPage()
        scheduleCommentCounts()
      })
      .catch((err) => {
        if (initialApodLoadId !== apodLoadId) return
        if (myRunId !== runId) return
        state.apod = {
          ...state.apod,
          photos: [],
          loading: false,
          error: err,
          usedMock: false,
        }
        renderPage()
      }),
  ]

  return Promise.allSettled(tasks)
}
