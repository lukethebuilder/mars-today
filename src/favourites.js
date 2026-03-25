import { supabase, isSupabaseConfigured } from './supabase.js'

const PG_INT_MAX = 2147483647

/** Stable int for photos without a numeric NASA id (fits PostgreSQL INTEGER). */
function hashImgSrcToPhotoId(imgSrc) {
  const s = String(imgSrc || '')
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  const n = Math.abs(h) % PG_INT_MAX || 1
  return n
}

/**
 * Curiosity: positive NASA `id`. APOD: negative YYYYMMDD so we never collide with rover ids
 * (DB unique is on user_id + nasa_photo_id only).
 */
export function nasaPhotoIdForFavourite(photo, source) {
  if (source === 'apod') {
    const d = photo.earth_date
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return -parseInt(d.replace(/-/g, ''), 10)
    }
    return -hashImgSrcToPhotoId(photo.img_src)
  }
  const id = photo.id
  if (typeof id === 'number' && Number.isFinite(id) && id !== 0) {
    const n = Math.trunc(id)
    return n > PG_INT_MAX || n < -PG_INT_MAX ? hashImgSrcToPhotoId(photo.img_src) : n
  }
  if (typeof id === 'string' && /^\d+$/.test(id)) {
    const n = parseInt(id, 10)
    if (n !== 0) return n > PG_INT_MAX ? hashImgSrcToPhotoId(photo.img_src) : n
  }
  return hashImgSrcToPhotoId(photo.img_src)
}

export function favouriteKey(photo, source) {
  return `${source}:${nasaPhotoIdForFavourite(photo, source)}`
}

export function isPhotoFavourited(favouriteKeys, photo, source) {
  if (!favouriteKeys || !(favouriteKeys instanceof Set)) return false
  return favouriteKeys.has(favouriteKey(photo, source))
}

/** Non-blocking feedback when favourite toggle fails (RLS, network, missing env). */
export function alertIfFavouriteFailed(r, title = 'Favourite') {
  if (r.ok) return
  if (r.reason === 'auth') return
  if (r.reason === 'not_configured') {
    window.alert(
      'Supabase is not configured in this build. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env and restart the dev server (or redeploy with secrets).',
    )
    return
  }
  window.alert(`${title} could not be saved: ${r.reason || 'unknown error'}`)
}

export async function fetchFavouriteKeys() {
  if (!isSupabaseConfigured()) return new Set()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return new Set()

  const { data, error } = await supabase
    .from('favourites')
    .select('rover, nasa_photo_id')
    .eq('user_id', session.user.id)

  if (error) {
    console.warn('[favourites] list failed', error)
    return new Set()
  }

  const keys = new Set()
  for (const row of data || []) {
    keys.add(`${row.rover}:${row.nasa_photo_id}`)
  }
  return keys
}

export async function toggleFavourite(photo, source) {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'not_configured' }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { ok: false, reason: 'auth' }

  const uid = session.user.id
  const nasa_photo_id = nasaPhotoIdForFavourite(photo, source)
  if (nasa_photo_id === 0) return { ok: false, reason: 'bad_id' }

  const rover = source === 'apod' ? 'apod' : 'curiosity'
  const earth_date = photo.earth_date || ''
  const sol = photo.sol != null ? photo.sol : 0
  const camera_name = String(photo.camera?.name || '')
  const img_src = photo.img_src || ''

  const { data: existing, error: selErr } = await supabase
    .from('favourites')
    .select('id')
    .eq('user_id', uid)
    .eq('nasa_photo_id', nasa_photo_id)
    .eq('rover', rover)
    .maybeSingle()

  if (selErr) {
    console.warn('[favourites] select failed', selErr)
    return { ok: false, reason: selErr.message }
  }

  if (existing?.id) {
    const { error } = await supabase.from('favourites').delete().eq('id', existing.id)
    return { ok: !error, reason: error?.message }
  }

  const { error } = await supabase.from('favourites').insert({
    user_id: uid,
    nasa_photo_id,
    rover,
    earth_date,
    sol,
    camera_name,
    img_src,
  })

  return { ok: !error, reason: error?.message }
}

/** Map DB row to PhotoCard photo shape */
export function rowToPhoto(row) {
  const isApod = row.rover === 'apod'
  return {
    id: row.nasa_photo_id,
    img_src: row.img_src,
    earth_date: row.earth_date,
    sol: row.sol === 0 && isApod ? null : row.sol,
    rover: { name: isApod ? 'APOD' : 'Curiosity' },
    camera: { name: row.camera_name || '' },
  }
}

export async function fetchFavouriteRows() {
  if (!isSupabaseConfigured()) return []
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return []

  const { data, error } = await supabase
    .from('favourites')
    .select('rover, nasa_photo_id, earth_date, sol, camera_name, img_src, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[favourites] fetch rows failed', error)
    return []
  }
  return data || []
}
