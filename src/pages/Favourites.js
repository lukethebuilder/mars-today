import {
  alertIfFavouriteFailed,
  fetchFavouriteRows,
  rowToPhoto,
  toggleFavourite,
} from '../favourites.js'
import { supabase, isSupabaseConfigured } from '../supabase.js'
import { PhotoCard } from '../components/PhotoCard.js'
import { openPhotoModal } from '../components/PhotoModal.js'
import { fetchCommentCountsForRows } from '../comments.js'

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
  const loading = root.querySelector('#favouritesLoading')
  const grid = root.querySelector('#favouritesGrid')
  const empty = root.querySelector('#favouritesEmpty')
  if (loading) loading.hidden = true

  if (!rows.length) {
    empty.hidden = false
    return
  }

  const rowsForCounts = rows.map((r) => ({
    rover: r.rover,
    nasa_photo_id: r.nasa_photo_id,
  }))
  const commentCounts = await fetchCommentCountsForRows(rowsForCounts)

  grid.innerHTML = rows
    .map((row, index) => {
      const photo = rowToPhoto(row)
      const isApod = row.rover === 'apod'
      const section = isApod ? 'apod' : 'curiosity'
      const key = `${row.rover}:${row.nasa_photo_id}`
      const cc = commentCounts.get(key) || 0
      return PhotoCard({
        photo,
        roverLabel: isApod ? 'From the Universe' : 'Curiosity',
        showSampleBadge: false,
        showFavourite: true,
        isFavourited: true,
        photoSection: section,
        photoIndex: index,
        commentCount: cc,
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
      const row = rows[index]
      if (!row) return
      const photo = rowToPhoto(row)
      const source = row.rover === 'apod' ? 'apod' : 'curiosity'
      const res = await toggleFavourite(photo, source)
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
      const row = rows[index]
      if (!row) return
      const photo = rowToPhoto(row)
      const src = row.rover === 'apod' ? 'apod' : 'curiosity'
      const roverLabel = src === 'apod' ? 'From the Universe' : 'Curiosity'
      openPhotoModal({
        photo,
        source: src,
        roverLabel,
        onClosed: () => renderFavourites(),
      })
    })
  })
}
