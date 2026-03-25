import { supabase, isSupabaseConfigured } from './supabase.js'
import { favouriteKey, nasaPhotoIdForFavourite } from './favourites.js'

function roverString(source) {
  return source === 'apod' ? 'apod' : 'curiosity'
}

/**
 * Returns Map keyed by `favouriteKey(photo, source)` → count (only keys with count > 0 need appear).
 */
export async function fetchCommentCountsMap(curiosityPhotos = [], apodPhotos = []) {
  const map = new Map()
  if (!isSupabaseConfigured()) return map

  async function addCounts(rover, photos, source) {
    const ids = []
    const seen = new Set()
    for (const p of photos) {
      const nid = nasaPhotoIdForFavourite(p, source)
      if (nid === 0 || seen.has(nid)) continue
      seen.add(nid)
      ids.push(nid)
    }
    if (!ids.length) return

    const { data, error } = await supabase
      .from('comments')
      .select('nasa_photo_id')
      .eq('rover', rover)
      .in('nasa_photo_id', ids)

    if (error) {
      console.warn('[comments] count batch failed', error)
      return
    }
    const tally = new Map()
    for (const row of data || []) {
      const k = row.nasa_photo_id
      tally.set(k, (tally.get(k) || 0) + 1)
    }
    for (const p of photos) {
      const nid = nasaPhotoIdForFavourite(p, source)
      const c = tally.get(nid)
      if (c) map.set(favouriteKey(p, source), c)
    }
  }

  await addCounts('curiosity', curiosityPhotos, 'curiosity')
  await addCounts('apod', apodPhotos, 'apod')
  return map
}

/** Batch counts for favourite rows `{ rover, nasa_photo_id }[]` */
export async function fetchCommentCountsForRows(rows = []) {
  const map = new Map()
  if (!isSupabaseConfigured() || !rows.length) return map

  const byRover = { curiosity: [], apod: [] }
  for (const row of rows) {
    const r = row.rover === 'apod' ? 'apod' : 'curiosity'
    if (!byRover[r].includes(row.nasa_photo_id)) byRover[r].push(row.nasa_photo_id)
  }

  for (const rover of ['curiosity', 'apod']) {
    const ids = byRover[rover]
    if (!ids.length) continue
    const { data, error } = await supabase
      .from('comments')
      .select('nasa_photo_id')
      .eq('rover', rover)
      .in('nasa_photo_id', ids)

    if (error) {
      console.warn('[comments] count rows failed', error)
      continue
    }
    const tally = new Map()
    for (const row of data || []) {
      const k = row.nasa_photo_id
      tally.set(k, (tally.get(k) || 0) + 1)
    }
    for (const fr of rows) {
      const r = fr.rover === 'apod' ? 'apod' : 'curiosity'
      if (r !== rover) continue
      const c = tally.get(fr.nasa_photo_id)
      if (c) map.set(`${fr.rover}:${fr.nasa_photo_id}`, c)
    }
  }
  return map
}

/** Prefer public `profiles.email` (synced from Auth on login), then username. */
function formatAuthor(userId, profile) {
  if (profile && typeof profile === 'object') {
    const em = profile.email != null && String(profile.email).trim()
    if (em) return String(profile.email).trim()
    const un = profile.username != null && String(profile.username).trim()
    if (un) return un
  }
  if (!userId) return 'Unknown'
  return `${String(userId).slice(0, 8)}…`
}

export async function fetchCommentsForPhoto(photo, source) {
  if (!isSupabaseConfigured()) return []
  const nasa_photo_id = nasaPhotoIdForFavourite(photo, source)
  const rover = roverString(source)
  if (nasa_photo_id === 0) return []

  const { data: rows, error } = await supabase
    .from('comments')
    .select('id, user_id, body, created_at, nasa_photo_id, rover')
    .eq('nasa_photo_id', nasa_photo_id)
    .eq('rover', rover)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[comments] fetch failed', error)
    return []
  }

  const list = rows || []
  const userIds = [...new Set(list.map((r) => r.user_id).filter(Boolean))]
  let profileMap = new Map()
  if (userIds.length) {
    const { data: profs, error: profErr } = await supabase
      .from('profiles')
      .select('id, username, email')
      .in('id', userIds)
    if (profErr) {
      const { data: fallback } = await supabase.from('profiles').select('id, username').in('id', userIds)
      profileMap = new Map(
        (fallback || []).map((p) => [p.id, { username: p.username, email: null }]),
      )
    } else {
      profileMap = new Map(
        (profs || []).map((p) => [p.id, { username: p.username, email: p.email }]),
      )
    }
  }

  return list.map((r) => ({
    ...r,
    authorLabel: formatAuthor(r.user_id, profileMap.get(r.user_id)),
  }))
}

export async function postComment(photo, source, body) {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'not_configured' }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { ok: false, reason: 'auth' }

  const text = String(body || '').trim()
  if (text.length < 1 || text.length > 500) return { ok: false, reason: 'length' }

  const nasa_photo_id = nasaPhotoIdForFavourite(photo, source)
  const rover = roverString(source)
  if (nasa_photo_id === 0) return { ok: false, reason: 'bad_id' }

  const { error } = await supabase.from('comments').insert({
    user_id: session.user.id,
    nasa_photo_id,
    rover,
    body: text,
  })

  return { ok: !error, reason: error?.message }
}

export async function deleteComment(commentId) {
  if (!isSupabaseConfigured()) return { ok: false }
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  return { ok: !error, reason: error?.message }
}
