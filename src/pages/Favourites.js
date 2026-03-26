import {
  alertIfFavouriteFailed,
  fetchFavouriteRows,
  rowToPhoto,
  toggleFavourite,
} from '../favourites.js'
import { supabase, isSupabaseConfigured } from '../supabase.js'
import { PhotoCard } from '../components/PhotoCard.js'
import { openPhotoModal } from '../components/PhotoModal.js'

export async function renderFavourites() {
  const root = document.querySelector('#pageMount')
  if (!root) return

  if (!isSupabaseConfigured()) {
    root.innerHTML = `
      <div class="page">
        <p class="muted">Configure Supabase in <code class="mono">.env</code> to use favourites.</p>
        <p><a class="link" href="#/home">← Home</a></p>
      </div>
    `
    return
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    root.innerHTML = `
      <div class="page">
        <header class="topBar">
          <h1 class="appTitle">Favourites</h1>
          <p class="subtitle muted">Sign in to see photos you have saved.</p>
        </header>
        <p><a class="link" href="#/home">← Home</a></p>
      </div>
    `
    return
  }

  root.innerHTML = `
    <div class="page">
      <header class="topBar">
        <div>
          <h1 class="appTitle">Your favourites</h1>
          <p class="subtitle muted">Photos you have hearted from the home page.</p>
        </div>
        <a class="accentPill mono link" href="#/home" style="text-decoration:none;align-self:center">← Home</a>
      </header>
      <main class="pageBody">
        <p class="muted" id="favouritesLoading">Loading…</p>
        <div class="photoGrid" id="favouritesGrid" hidden></div>
        <p class="muted" id="favouritesEmpty" hidden>No favourites yet — heart photos on the home page.</p>
      </main>
    </div>
  `

  const rows = await fetchFavouriteRows()
  const curiosityRows = (rows || []).filter((r) => r.rover !== 'apod')
  const loading = root.querySelector('#favouritesLoading')
  const grid = root.querySelector('#favouritesGrid')
  const empty = root.querySelector('#favouritesEmpty')
  if (loading) loading.hidden = true

  if (!curiosityRows.length) {
    empty.hidden = false
    return
  }

  grid.innerHTML = curiosityRows
    .map((row, index) => {
      const photo = rowToPhoto(row)
      return PhotoCard({
        photo,
        roverLabel: 'Curiosity',
        showSampleBadge: false,
        showFavourite: true,
        isFavourited: true,
        photoSection: 'curiosity',
        photoIndex: index,
        interactive: true,
      })
    })
    .join('')

  grid.hidden = false

  grid.querySelectorAll('.photoCardFavBtn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      const index = Number(btn.dataset.photoIndex)
      const row = curiosityRows[index]
      if (!row) return
      const photo = rowToPhoto(row)
      const res = await toggleFavourite(photo, 'curiosity')
      if (!res.ok) {
        if (res.reason !== 'auth') alertIfFavouriteFailed(res)
        return
      }
      renderFavourites()
    })
  })

  grid.querySelectorAll('.photoCard--interactive').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.photoCardFavBtn')) return
      const index = Number(card.dataset.photoIndex)
      const row = curiosityRows[index]
      if (!row) return
      const photo = rowToPhoto(row)
      openPhotoModal({
        photo,
        source: 'curiosity',
        roverLabel: 'Curiosity',
        onClosed: () => renderFavourites(),
      })
    })
  })
}
