import { supabase, isSupabaseConfigured } from '../supabase.js'
import {
  countPhotosInCollection,
  fetchCollectionById,
  fetchCollectionPhotos,
  fetchCommunityCollections,
  fetchMyCollections,
  collectionRowToPhoto,
  setCollectionPublic,
} from '../collections.js'
import { PhotoCard } from '../components/PhotoCard.js'
import { openPhotoModal } from '../components/PhotoModal.js'
import { fetchCommentCountsForRows } from '../comments.js'
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
          <p class="subtitle muted">Your boards and public collections from the community.</p>
        </div>
        <a class="accentPill mono link" href="#/home" style="text-decoration:none;align-self:center">← Home</a>
      </header>
      <main class="pageBody">
        <p class="muted" id="collectionsLoading">Loading…</p>
        <section id="collectionsMineSection" hidden></section>
        <section id="collectionsCommunitySection" hidden></section>
      </main>
    </div>
  `

  const loading = root.querySelector('#collectionsLoading')
  const mineSec = root.querySelector('#collectionsMineSection')
  const commSec = root.querySelector('#collectionsCommunitySection')

  const [mineRaw, communityRaw] = await Promise.all([
    fetchMyCollections(),
    fetchCommunityCollections(),
  ])
  const mine = await withCounts(mineRaw)
  const community = await withCounts(communityRaw)

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
        <label class="collectionPublicToggle mono">
          <input type="checkbox" data-collection-id="${c.id}" ${c.is_public ? 'checked' : ''} />
          Public
        </label>
      </article>
    `,
      )
      .join('')

    mineGrid.querySelectorAll('.collectionPublicToggle input').forEach((cb) => {
      cb.addEventListener('change', async () => {
        const id = Number(cb.dataset.collectionId)
        await setCollectionPublic(id, cb.checked)
      })
    })
  }

  commSec.hidden = false
  commSec.innerHTML = `
    <h2 class="collectionsSectionTitle">Community collections</h2>
    <div class="collectionsGrid" id="collectionsCommunityGrid"></div>
  `
  const commGrid = commSec.querySelector('#collectionsCommunityGrid')
  if (!community.length) {
    commGrid.innerHTML = `<p class="muted">No other public collections yet.</p>`
  } else {
    commGrid.innerHTML = community
      .map(
        (c) => `
      <article class="collectionCard collectionCard--community">
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

  const isOwnCollection = col.user_id === session.user.id
  let creatorUsername = ''
  if (!isOwnCollection) {
    const { data: creatorRow } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', col.user_id)
      .maybeSingle()
    creatorUsername = creatorRow?.username ? String(creatorRow.username).trim() : ''
  }

  const rows = await fetchCollectionPhotos(id)
  const rowsForCounts = rows.map((r) => ({
    rover: r.rover,
    nasa_photo_id: r.nasa_photo_id,
  }))
  const commentCounts = await fetchCommentCountsForRows(rowsForCounts)
  const favouriteKeys = await fetchFavouriteKeys()

  root.innerHTML = `
    <div class="page">
      <header class="topBar">
        <div>
          <h1 class="appTitle">${escapeHtml(col.name)}</h1>
          <p class="subtitle muted mono">${col.is_public ? 'Public' : 'Private'} collection</p>
          ${
            !isOwnCollection
              ? `<p class="collectionCreatedBy muted mono">Created by ${escapeHtml(creatorUsername || 'Unknown user')}</p>`
              : ''
          }
        </div>
        <a class="accentPill mono link" href="#/collections" style="text-decoration:none;align-self:center">← All collections</a>
      </header>
      <main class="pageBody">
        <p class="muted" id="collectionDetailEmpty" hidden>This collection is empty.</p>
        <div class="photoGrid" id="collectionDetailGrid"></div>
      </main>
    </div>
  `

  const grid = root.querySelector('#collectionDetailGrid')
  const empty = root.querySelector('#collectionDetailEmpty')

  if (!rows.length) {
    empty.hidden = false
    return
  }

  grid.innerHTML = rows
    .map((row, index) => {
      const photo = collectionRowToPhoto(row)
      const isApod = row.rover === 'apod'
      const section = isApod ? 'apod' : 'curiosity'
      const key = `${row.rover}:${row.nasa_photo_id}`
      const cc = commentCounts.get(key) || 0
      return PhotoCard({
        photo,
        roverLabel: isApod ? 'From the Universe' : 'Curiosity',
        showSampleBadge: false,
        showFavourite: true,
        isFavourited: favouriteKeys.has(favouriteKey(photo, section)),
        photoSection: section,
        photoIndex: index,
        commentCount: cc,
        interactive: true,
      })
    })
    .join('')

  grid.querySelectorAll('.photoCardFavBtn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      const section = btn.dataset.photoSection
      const i = Number(btn.dataset.photoIndex)
      if (!section || Number.isNaN(i)) return
      const row = rows[i]
      if (!row) return
      const photo = collectionRowToPhoto(row)
      const src = section === 'apod' ? 'apod' : 'curiosity'
      const res = await toggleFavourite(photo, src)
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
      const section = card.dataset.photoSection
      const i = Number(card.dataset.photoIndex)
      if (!section || Number.isNaN(i)) return
      const row = rows[i]
      if (!row) return
      const photo = collectionRowToPhoto(row)
      const src = section === 'apod' ? 'apod' : 'curiosity'
      const roverLabel = section === 'apod' ? 'From the Universe' : 'Curiosity'
      openPhotoModal({
        photo,
        source: src,
        roverLabel,
        onClosed: () => renderCollectionDetail(collectionId),
      })
    })
  })
}
