import { getLatestPhotos } from '../nasa.js'
import { RoverGallery } from '../components/RoverGallery.js'

const ROVERS = [
  { key: 'curiosity', label: 'Curiosity' },
  { key: 'perseverance', label: 'Perseverance' },
]

let runId = 0

function renderPage({ curiosity, perseverance }) {
  const root = document.querySelector('#pageMount')
  if (!root) return

  root.innerHTML = `
    <div class="page">
      <header class="topBar">
        <div>
          <h1 class="appTitle">Mars Today</h1>
          <p class="subtitle muted">
            Two rover feeds from NASA. Thumbnails load fast, and the grid stays usable while photos fetch.
          </p>
        </div>
        <div class="accentPill mono">latest photos</div>
      </header>

      <main class="pageBody">
        ${RoverGallery({
          roverLabel: 'Curiosity',
          photos: curiosity.photos,
          loading: curiosity.loading,
          error: curiosity.error,
          skeletonCount: curiosity.skeletonCount,
        })}

        ${RoverGallery({
          roverLabel: 'Perseverance',
          photos: perseverance.photos,
          loading: perseverance.loading,
          error: perseverance.error,
          skeletonCount: perseverance.skeletonCount,
        })}
      </main>
    </div>
  `
}

export async function renderHome() {
  const myRunId = ++runId

  const skeletonCount = 12
  const state = {
    curiosity: { photos: [], loading: true, error: null, skeletonCount },
    perseverance: { photos: [], loading: true, error: null, skeletonCount },
  }

  renderPage(state)

  const tasks = [
    getLatestPhotos(ROVERS[0].key)
      .then((photos) => {
        if (myRunId !== runId) return
        state.curiosity = { ...state.curiosity, photos, loading: false, error: null }
        renderPage(state)
      })
      .catch((err) => {
        if (myRunId !== runId) return
        state.curiosity = { ...state.curiosity, photos: [], loading: false, error: err }
        renderPage(state)
      }),

    getLatestPhotos(ROVERS[1].key)
      .then((photos) => {
        if (myRunId !== runId) return
        state.perseverance = { ...state.perseverance, photos, loading: false, error: null }
        renderPage(state)
      })
      .catch((err) => {
        if (myRunId !== runId) return
        state.perseverance = { ...state.perseverance, photos: [], loading: false, error: err }
        renderPage(state)
      }),
  ]

  return Promise.allSettled(tasks)
}

