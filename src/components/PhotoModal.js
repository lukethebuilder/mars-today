import { supabase, isSupabaseConfigured } from '../supabase.js'
import { openAuthModal } from './Auth.js'
import { cameraCodeToLabel } from '../nasa.js'
import {
  alertIfFavouriteFailed,
  fetchFavouriteKeys,
  favouriteKey,
  isPhotoFavourited,
  toggleFavourite,
} from '../favourites.js'
import {
  addPhotoToCollection,
  createCollection,
  fetchMembershipCollectionIds,
  fetchMyCollections,
  removePhotoFromCollection,
} from '../collections.js'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function closePhotoModal() {
  const el = document.getElementById('photo-modal-root')
  if (el?._cleanup) el._cleanup()
  else el?.remove()
}

/**
 * @param {object} opts
 * @param {object} opts.photo — app photo shape
 * @param {'curiosity'|'apod'} opts.source
 * @param {string} [opts.roverLabel]
 * @param {() => void} [opts.onClosed]
 */
export function openPhotoModal({ photo, source, roverLabel, onClosed } = {}) {
  if (!photo) return

  closePhotoModal()

  const overlay = document.createElement('div')
  overlay.id = 'photo-modal-root'
  overlay.className = 'photoModalOverlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')

  const roverName = photo.rover?.name || roverLabel || 'Rover'
  const cameraLabel = photo.camera?.name ? cameraCodeToLabel(photo.camera.name) : 'Camera'
  const earth = photo.earth_date || '—'
  const sol = photo.sol != null && photo.sol !== '' ? String(photo.sol) : '—'

  overlay.innerHTML = `
    <div class="photoModalInner">
      <button type="button" class="photoModalClose" aria-label="Close">&times;</button>
      <div class="photoModalGrid">
        <div class="photoModalImgCol">
          <div class="photoModalImgWrap">
            <img class="photoModalImg" src="${escapeHtml(photo.img_src || '')}" alt="${escapeHtml(`${roverName} — ${cameraLabel}`)}" />
          </div>
          <div class="photoModalToolbar" id="photoModalToolbar">
            <button type="button" class="photoModalFavBtn" id="photoModalFavBtn" aria-label="Favourite" hidden>
              <span class="photoModalFavIcon" aria-hidden="true">♡</span>
            </button>
            <div class="photoModalCollWrap" id="photoModalCollWrap" hidden>
              <button type="button" class="photoModalFolderBtn" id="photoModalFolderBtn" aria-expanded="false" aria-label="Collections">📁</button>
              <div class="photoModalCollPopover" id="photoModalCollPopover" hidden></div>
            </div>
          </div>
        </div>
        <div class="photoModalSide">
          <div class="photoModalMeta">
            <p class="photoModalMetaLine mono"><span class="muted">Rover</span> ${escapeHtml(roverName)}</p>
            <p class="photoModalMetaLine mono"><span class="muted">Camera</span> ${escapeHtml(cameraLabel)}</p>
            <p class="photoModalMetaLine mono"><span class="muted">Earth date</span> ${escapeHtml(earth)}</p>
            <p class="photoModalMetaLine mono"><span class="muted">Sol</span> ${escapeHtml(sol)}</p>
          </div>
        </div>
      </div>
    </div>
  `

  let marsAuthHandler = null

  function teardown() {
    document.removeEventListener('keydown', onKey)
    document.removeEventListener('mousedown', onDocMouseDown)
    if (marsAuthHandler) window.removeEventListener('mars-auth', marsAuthHandler)
    overlay.remove()
    onClosed?.()
  }

  overlay._cleanup = teardown

  document.body.appendChild(overlay)

  const inner = overlay.querySelector('.photoModalInner')
  const favBtn = overlay.querySelector('#photoModalFavBtn')
  const collWrap = overlay.querySelector('#photoModalCollWrap')
  const folderBtn = overlay.querySelector('#photoModalFolderBtn')
  const popover = overlay.querySelector('#photoModalCollPopover')

  let favouriteKeys = new Set()
  let membership = new Set()
  let myCollections = []
  let popoverOpen = false

  function onDocMouseDown(e) {
    if (!popoverOpen) return
    if (popover.contains(e.target) || folderBtn.contains(e.target)) return
    closePopover()
  }

  function closePopover() {
    popoverOpen = false
    popover.hidden = true
    folderBtn.setAttribute('aria-expanded', 'false')
  }

  function openPopover() {
    popoverOpen = true
    popover.hidden = false
    folderBtn.setAttribute('aria-expanded', 'true')
    renderPopoverContent()
  }

  function renderPopoverContent() {
    const showNew = popover.dataset.showNew === '1'
    const rows = myCollections
      .map((c) => {
        const checked = membership.has(c.id)
        return `
          <label class="photoModalCollRow mono">
            <input type="checkbox" data-collection-id="${c.id}" ${checked ? 'checked' : ''} />
            <span>${escapeHtml(c.name)}</span>
          </label>
        `
      })
      .join('')

    popover.innerHTML = `
      <p class="photoModalCollTitle">Add to collection</p>
      <div class="photoModalCollList">${rows || '<p class="muted photoModalCollEmpty">No collections yet.</p>'}</div>
      <div class="photoModalCollNew">
        ${showNew
          ? `
          <input type="text" class="photoModalCollInput mono" id="photoModalNewCollName" placeholder="Collection name" maxlength="120" />
          <button type="button" class="btnPrimary photoModalCollCreate" id="photoModalCreateColl">Create</button>
        `
          : `<button type="button" class="btnGhost photoModalCollNewBtn" id="photoModalShowNewColl">＋ New collection</button>`
        }
      </div>
    `

    popover.querySelectorAll('input[type="checkbox"][data-collection-id]').forEach((cb) => {
      cb.addEventListener('change', async () => {
        const id = Number(cb.dataset.collectionId)
        const on = cb.checked
        if (on) {
          const r = await addPhotoToCollection(id, photo, source)
          if (!r.ok) {
            cb.checked = false
            window.alert(
              r.reason
                ? `Could not add to collection: ${r.reason}`
                : 'Could not add to collection.',
            )
          } else {
            membership.add(id)
          }
        } else {
          const r = await removePhotoFromCollection(id, photo, source)
          if (!r.ok) {
            cb.checked = true
            window.alert(
              r.reason
                ? `Could not remove from collection: ${r.reason}`
                : 'Could not remove from collection.',
            )
          } else {
            membership.delete(id)
          }
        }
      })
    })

    const showNewBtn = popover.querySelector('#photoModalShowNewColl')
    showNewBtn?.addEventListener('click', () => {
      popover.dataset.showNew = '1'
      renderPopoverContent()
      popover.querySelector('#photoModalNewCollName')?.focus()
    })

    const createBtn = popover.querySelector('#photoModalCreateColl')
    createBtn?.addEventListener('click', async () => {
      const input = popover.querySelector('#photoModalNewCollName')
      const name = input?.value || ''
      const r = await createCollection(name)
      if (!r.ok || !r.id) {
        window.alert(
          r.reason ? `Could not create collection: ${r.reason}` : 'Could not create collection.',
        )
        return
      }
      myCollections = await fetchMyCollections()
      await addPhotoToCollection(r.id, photo, source)
      membership = await fetchMembershipCollectionIds(photo, source)
      popover.dataset.showNew = '0'
      renderPopoverContent()
    })
  }

  async function refreshAuthUi() {
    if (!isSupabaseConfigured()) {
      favBtn.hidden = true
      collWrap.hidden = true
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user ?? null

    // Favourites: show heart for logged-out users; collections require auth.
    favBtn.hidden = false
    collWrap.hidden = !user

    favouriteKeys = user ? await fetchFavouriteKeys() : new Set()

    const fav = isPhotoFavourited(favouriteKeys, photo, source)
    favBtn.querySelector('.photoModalFavIcon').textContent = fav ? '❤️' : '♡'
    favBtn.setAttribute('aria-pressed', fav ? 'true' : 'false')

    if (user) {
      myCollections = await fetchMyCollections()
      membership = await fetchMembershipCollectionIds(photo, source)
    }
  }

  favBtn.addEventListener('click', async (e) => {
    e.stopPropagation()
    const r = await toggleFavourite(photo, source)
    if (!r.ok) {
      if (r.reason === 'auth') openAuthModal({ mode: 'signin' })
      else alertIfFavouriteFailed(r)
      return
    }
    favouriteKeys = await fetchFavouriteKeys()
    const fav = isPhotoFavourited(favouriteKeys, photo, source)
    favBtn.querySelector('.photoModalFavIcon').textContent = fav ? '❤️' : '♡'
    favBtn.setAttribute('aria-pressed', fav ? 'true' : 'false')
  })

  folderBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    if (popoverOpen) closePopover()
    else openPopover()
  })

  inner.addEventListener('click', (e) => e.stopPropagation())
  overlay.querySelector('.photoModalClose').addEventListener('click', teardown)

  overlay.addEventListener('click', teardown)

  function onKey(e) {
    if (e.key === 'Escape') {
      if (popoverOpen) {
        e.preventDefault()
        closePopover()
        return
      }
      teardown()
    }
  }
  document.addEventListener('keydown', onKey)

  document.addEventListener('mousedown', onDocMouseDown)

  marsAuthHandler = () => {
    refreshAuthUi()
  }
  window.addEventListener('mars-auth', marsAuthHandler)

  refreshAuthUi()
}
