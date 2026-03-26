import { supabase, isSupabaseConfigured } from './supabase.js'
import { nasaPhotoIdForFavourite } from './favourites.js'

function roverString(source) {
  return source === 'apod' ? 'apod' : 'curiosity'
}

export async function fetchMyCollections() {
  if (!isSupabaseConfigured()) return []
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return []

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[collections] list mine failed', error)
    return []
  }
  return data || []
}

export async function countPhotosInCollection(collectionId) {
  if (!isSupabaseConfigured()) return 0
  const { count, error } = await supabase
    .from('collection_photos')
    .select('id', { count: 'exact', head: true })
    .eq('collection_id', collectionId)
    .eq('rover', 'curiosity')

  if (error) {
    console.warn('[collections] count failed', error)
    return 0
  }
  return count ?? 0
}

export async function fetchCollectionById(collectionId) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', collectionId)
    .maybeSingle()

  if (error) {
    console.warn('[collections] fetch one failed', error)
    return null
  }
  return data
}

export async function fetchCollectionPhotos(collectionId) {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from('collection_photos')
    .select('*')
    .eq('collection_id', collectionId)
    .eq('rover', 'curiosity')
    .order('added_at', { ascending: false })

  if (error) {
    console.warn('[collections] photos failed', error)
    return []
  }
  return data || []
}

/** Set of collection_ids (owned by current user) that contain this photo */
export async function fetchMembershipCollectionIds(photo, source) {
  if (!isSupabaseConfigured()) return new Set()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return new Set()

  const nasa_photo_id = nasaPhotoIdForFavourite(photo, source)
  const rover = roverString(source)
  if (nasa_photo_id === 0) return new Set()

  const { data: mine } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', session.user.id)

  const colIds = (mine || []).map((c) => c.id)
  if (!colIds.length) return new Set()

  const { data: rows, error } = await supabase
    .from('collection_photos')
    .select('collection_id')
    .eq('nasa_photo_id', nasa_photo_id)
    .eq('rover', rover)
    .in('collection_id', colIds)

  if (error) {
    console.warn('[collections] membership failed', error)
    return new Set()
  }
  return new Set((rows || []).map((r) => r.collection_id))
}

export async function createCollection(name) {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'not_configured' }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { ok: false, reason: 'auth' }

  const n = String(name || '').trim()
  if (!n.length) return { ok: false, reason: 'empty' }

  const { data, error } = await supabase
    .from('collections')
    .insert({ user_id: session.user.id, name: n })
    .select('id')
    .single()

  return { ok: !error, id: data?.id, reason: error?.message }
}

export async function addPhotoToCollection(collectionId, photo, source) {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'not_configured' }
  const nasa_photo_id = nasaPhotoIdForFavourite(photo, source)
  const rover = roverString(source)
  if (nasa_photo_id === 0) return { ok: false, reason: 'bad_id' }

  const { error } = await supabase.from('collection_photos').insert({
    collection_id: collectionId,
    nasa_photo_id,
    img_src: photo.img_src || '',
    rover,
    earth_date: photo.earth_date || '',
  })

  return { ok: !error, reason: error?.message }
}

export async function removePhotoFromCollection(collectionId, photo, source) {
  if (!isSupabaseConfigured()) return { ok: false }
  const nasa_photo_id = nasaPhotoIdForFavourite(photo, source)
  const { error } = await supabase
    .from('collection_photos')
    .delete()
    .eq('collection_id', collectionId)
    .eq('nasa_photo_id', nasa_photo_id)

  return { ok: !error, reason: error?.message }
}

/** Map collection_photos row + rover to PhotoCard shape */
export function collectionRowToPhoto(row) {
  const isApod = row.rover === 'apod'
  return {
    id: row.nasa_photo_id,
    img_src: row.img_src,
    earth_date: row.earth_date,
    sol: null,
    rover: { name: isApod ? 'APOD' : 'Curiosity' },
    camera: { name: isApod ? 'APOD' : 'Camera' },
  }
}
