import { supabase, isSupabaseConfigured } from '../supabase.js'
import {
  countPhotosInCollection,
  fetchCollectionById,
  fetchCollectionPhotos,
  fetchMyCollections,
  collectionRowToPhoto,
} from '../collections.js'
import { PhotoCard } from '../components/PhotoCard.js'
import { openPhotoModal } from '../components/PhotoModal.js'
import {
  alertIfFavouriteFailed,
  fetchFavouriteKeys,
  favouriteKey,
  toggleFavourite,
} from '../favourites.js'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function withCounts(collections) {
  const out = []
  for (const c of collections) {
    const n = await countPhotosInCollection(c.id)
    out.push({ ...c, _count: n })
  }
  return out
}

export async function renderCollectionsList() {
  const root = document.querySelector('#pageMount')
  if (!root) return

  if (!isSupabaseConfigured()) {
    root.innerHTML = `
      <div class="page">
        <p class="muted">Configure Supabase in <code class="mono">.env</code> to use collections.</p>
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
          <h1 class="appTitle">Collections</h1>
          <p class="subtitle muted">Sign in to create and manage photo collections.</p>
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
          <h1 class="appTitle">Collections</h1>
          <p class="subtitle muted">Your photo collections.</p>
        </div>
        <a class="accentPill mono link" href="#/home" style="text-decoration:none;align-self:center">← Home</a>
      </header>
      <main class="pageBody">
        <p class="muted" id="collectionsLoading">Loading…</p>
        <section id="collectionsMineSection" hidden></section>
      </main>
    </div>
  `

  const loading = root.querySelector('#collectionsLoading')
  const mineSec = root.querySelector('#collectionsMineSection')
  const [mineRaw] = await Promise.all([fetchMyCollections()])
  const mine = await withCounts(mineRaw)

  if (loading) loading.hidden = true

  mineSec.hidden = false
  mineSec.innerHTML = `
    <h2 class="collectionsSectionTitle">Your collections</h2>
    <div class="collectionsGrid" id="collectionsMineGrid"></div>
  `
  const mineGrid = mineSec.querySelector('#collectionsMineGrid')
  if (!mine.length) {
    mineGrid.innerHTML = `<p class="muted">No collections yet — add photos from the photo modal (📁).</p>`
  } else {
    mineGrid.innerHTML = mine
      .map(
        (c) => `
      <article class="collectionCard" data-collection-id="${c.id}">
        <a class="collectionCardLink" href="#/collections/${c.id}">
          <h3 class="collectionCardTitle">${escapeHtml(c.name)}</h3>
          <p class="collectionCardMeta mono muted">${c._count} photo${c._count === 1 ? '' : 's'}</p>
        </a>
      </article>
    `,
      )
      .join('')
  }
}

export async function renderCollectionDetail(collectionId) {
  const root = document.querySelector('#pageMount')
  if (!root) return

  const id = Number(collectionId)
  if (!isSupabaseConfigured() || !Number.isFinite(id) || id <= 0) {
    root.innerHTML = `
      <div class="page">
        <p class="muted">Collection not found.</p>
        <p><a class="link" href="#/collections">← Collections</a> · <a class="link" href="#/home">Home</a></p>
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
          <h1 class="appTitle">Collection</h1>
          <p class="subtitle muted">Sign in to view collections.</p>
        </header>
        <p><a class="link" href="#/home">← Home</a></p>
      </div>
    `
    return
  }

  const col = await fetchCollectionById(id)
  if (!col) {
    root.innerHTML = `
      <div class="page">
        <p class="muted">Collection not found or you do not have access.</p>
        <p><a class="link" href="#/collections">← Collections</a></p>
      </div>
    `
    return
  }

  const rows = await fetchCollectionPhotos(id)
  const curiosityRows = (rows || []).filter((r) => r.rover !== 'apod')
  const favouriteKeys = await fetchFavouriteKeys()

  root.innerHTML = `
    <div class="page">
      <header class="topBar">
        <div>
          <h1 class="appTitle">${escapeHtml(col.name)}</h1>
          <p class="subtitle muted mono">Your collection</p>
        </div>
        <a class="accentPill mono link" href="#/collections" style="text-decoration:none;align-self:center">← Collections</a>
      </header>
      <main class="pageBody">
        <p class="muted" id="collectionDetailEmpty" hidden>This collection is empty.</p>
        <div class="photoGrid" id="collectionDetailGrid"></div>
      </main>
    </div>
  `

  const grid = root.querySelector('#collectionDetailGrid')
  const empty = root.querySelector('#collectionDetailEmpty')

  if (!curiosityRows.length) {
    empty.hidden = false
    return
  }

  grid.innerHTML = curiosityRows
    .map((row, index) => {
      const photo = collectionRowToPhoto(row)
      return PhotoCard({
        photo,
        roverLabel: 'Curiosity',
        showSampleBadge: false,
        showFavourite: true,
        isFavourited: favouriteKeys.has(favouriteKey(photo, 'curiosity')),
        photoSection: 'curiosity',
        photoIndex: index,
        interactive: true,
      })
    })
    .join('')

  grid.querySelectorAll('.photoCardFavBtn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      const i = Number(btn.dataset.photoIndex)
      if (Number.isNaN(i)) return
      const row = curiosityRows[i]
      if (!row) return
      const photo = collectionRowToPhoto(row)
      const res = await toggleFavourite(photo, 'curiosity')
      if (!res.ok) {
        if (res.reason !== 'auth') alertIfFavouriteFailed(res)
        return
      }
      renderCollectionDetail(collectionId)
    })
  })

  grid.querySelectorAll('.photoCard--interactive').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.photoCardFavBtn')) return
      const i = Number(card.dataset.photoIndex)
      if (Number.isNaN(i)) return
      const row = curiosityRows[i]
      if (!row) return
      const photo = collectionRowToPhoto(row)
      openPhotoModal({
        photo,
        source: 'curiosity',
        roverLabel: 'Curiosity',
        onClosed: () => renderCollectionDetail(collectionId),
      })
    })
  })
}
