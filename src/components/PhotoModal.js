import { supabase, isSupabaseConfigured } from '../supabase.js'
import { openAuthModal } from './Auth.js'
import {
  alertIfFavouriteFailed,
  fetchFavouriteKeys,
  favouriteKey,
  isPhotoFavourited,
  toggleFavourite,
} from '../favourites.js'
import {
  deleteComment,
  fetchCommentsForPhoto,
  postComment,
} from '../comments.js'
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

function formatTimestamp(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return String(iso || '')
  }
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
  const cameraName = photo.camera?.name || 'Camera'
  const earth = photo.earth_date || '—'
  const sol = photo.sol != null && photo.sol !== '' ? String(photo.sol) : '—'

  overlay.innerHTML = `
    <div class="photoModalInner">
      <button type="button" class="photoModalClose" aria-label="Close">&times;</button>
      <div class="photoModalGrid">
        <div class="photoModalImgCol">
          <div class="photoModalImgWrap">
            <img class="photoModalImg" src="${escapeHtml(photo.img_src || '')}" alt="${escapeHtml(`${roverName} — ${cameraName}`)}" />
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
            <p class="photoModalMetaLine mono"><span class="muted">Camera</span> ${escapeHtml(String(cameraName).replace(/_/g, ' '))}</p>
            <p class="photoModalMetaLine mono"><span class="muted">Earth date</span> ${escapeHtml(earth)}</p>
            <p class="photoModalMetaLine mono"><span class="muted">Sol</span> ${escapeHtml(sol)}</p>
          </div>
          <div class="photoModalComments" id="photoModalComments">
            <h3 class="photoModalCommentsTitle">Comments</h3>
            <p class="muted photoModalCommentsLoading" id="photoModalCommentsLoading">Loading…</p>
            <ul class="photoModalCommentList" id="photoModalCommentList" hidden></ul>
            <div class="photoModalComposer" id="photoModalComposer"></div>
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
  const listEl = overlay.querySelector('#photoModalCommentList')
  const loadingEl = overlay.querySelector('#photoModalCommentsLoading')
  const composerEl = overlay.querySelector('#photoModalComposer')

  let favouriteKeys = new Set()
  let membership = new Set()
  let myCollections = []
  let currentUserId = null
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
      composerEl.innerHTML =
        '<p class="muted">Sign in to comment.</p> <a href="#" class="link" id="photoModalSignIn">Sign in</a>'
      composerEl.querySelector('#photoModalSignIn')?.addEventListener('click', (e) => {
        e.preventDefault()
        openAuthModal({ mode: 'signin' })
      })
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    currentUserId = session?.user?.id ?? null

    if (session?.user) {
      favBtn.hidden = false
      collWrap.hidden = false
      favouriteKeys = await fetchFavouriteKeys()
      const fav = isPhotoFavourited(favouriteKeys, photo, source)
      favBtn.querySelector('.photoModalFavIcon').textContent = fav ? '❤️' : '♡'
      favBtn.setAttribute('aria-pressed', fav ? 'true' : 'false')

      myCollections = await fetchMyCollections()
      membership = await fetchMembershipCollectionIds(photo, source)

      composerEl.innerHTML = `
        <label class="photoModalLabel muted" for="photoModalCommentBody">Add a comment</label>
        <textarea id="photoModalCommentBody" class="photoModalTextarea mono" rows="3" maxlength="500" placeholder="Up to 500 characters"></textarea>
        <button type="button" class="btnPrimary" id="photoModalPostComment">Post</button>
        <p class="photoModalComposerErr mono" id="photoModalComposerErr" hidden></p>
      `
      const postBtn = composerEl.querySelector('#photoModalPostComment')
      const bodyEl = composerEl.querySelector('#photoModalCommentBody')
      const errEl = composerEl.querySelector('#photoModalComposerErr')
      postBtn.addEventListener('click', async () => {
        errEl.hidden = true
        const r = await postComment(photo, source, bodyEl.value)
        if (!r.ok) {
          errEl.textContent = r.reason === 'auth' ? 'Sign in to comment.' : String(r.reason || 'Could not post')
          errEl.hidden = false
          return
        }
        bodyEl.value = ''
        await renderComments()
        window.dispatchEvent(new CustomEvent('mars-comments-changed'))
      })
    } else {
      favBtn.hidden = true
      collWrap.hidden = true
      composerEl.innerHTML =
        '<p class="muted">Sign in to comment.</p> <a href="#" class="link" id="photoModalSignIn2">Sign in</a>'
      composerEl.querySelector('#photoModalSignIn2')?.addEventListener('click', (e) => {
        e.preventDefault()
        openAuthModal({ mode: 'signin' })
      })
    }
  }

  async function renderComments() {
    loadingEl.hidden = false
    listEl.hidden = true
    const rows = await fetchCommentsForPhoto(photo, source)
    loadingEl.hidden = true
    listEl.hidden = false
    if (!rows.length) {
      listEl.innerHTML = '<li class="photoModalCommentEmpty muted">No comments yet.</li>'
      return
    }
    listEl.innerHTML = rows
      .map((c) => {
        const own = currentUserId && c.user_id === currentUserId
        const del = own
          ? `<button type="button" class="photoModalCommentDel mono" data-comment-id="${c.id}">Delete</button>`
          : ''
        return `
          <li class="photoModalComment" data-comment-id="${c.id}">
            <div class="photoModalCommentHead">
              <span class="photoModalCommentAuthor mono">${escapeHtml(c.authorLabel)}</span>
              <span class="photoModalCommentTime mono muted">${escapeHtml(formatTimestamp(c.created_at))}</span>
            </div>
            <p class="photoModalCommentBody">${escapeHtml(c.body)}</p>
            ${del}
          </li>
        `
      })
      .join('')

    listEl.querySelectorAll('.photoModalCommentDel').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.commentId)
        await deleteComment(id)
        await renderComments()
        window.dispatchEvent(new CustomEvent('mars-comments-changed'))
      })
    })
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
    refreshAuthUi().then(() => renderComments())
  }
  window.addEventListener('mars-auth', marsAuthHandler)

  refreshAuthUi().then(() => renderComments())
}
