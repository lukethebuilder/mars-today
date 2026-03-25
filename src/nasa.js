const BASE = 'https://api.nasa.gov/mars-photos/api/v1'

// Vite exposes `VITE_*` at build time. The NASA key is public-safe.
const KEY = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY'

function buildUrl(path, params = {}) {
  const url = new URL(`${BASE}${path}`)
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue
    url.searchParams.set(k, String(v))
  }
  url.searchParams.set('api_key', KEY)
  return url.toString()
}

export async function getManifest(rover) {
  const url = buildUrl(`/manifests/${rover}`, {})
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`NASA manifest error (${rover}): ${res.status}`)
  }
  const data = await res.json()
  return data.photo_manifest
}

export async function getPhotosBySol(rover, sol, camera = null, page = 1) {
  const params = { sol: String(sol), page: String(page) }
  if (camera) params.camera = camera
  const url = buildUrl(`/rovers/${rover}/photos`, params)
  const res = await fetch(url)
  if (res.status === 404) return []
  if (!res.ok) {
    throw new Error(`NASA API error (${rover}) sol=${sol}: ${res.status}`)
  }
  const data = await res.json()
  return data.photos || []
}

export async function getPhotosByDate(rover, earthDate, camera = null, page = 1) {
  const params = { earth_date: earthDate, page: String(page) }
  if (camera) params.camera = camera
  const url = buildUrl(`/rovers/${rover}/photos`, params)
  const res = await fetch(url)
  if (res.status === 404) return []
  if (!res.ok) {
    throw new Error(`NASA API error (${rover}) earth_date=${earthDate}: ${res.status}`)
  }
  const data = await res.json()
  return data.photos || []
}

/**
 * Latest rover photos. Tries `latest_photos`, then manifest `max_sol` + sol-based
 * fetch (earth_date is unreliable in practice — often 404).
 */
export async function getLatestPhotos(rover) {
  try {
    const url = buildUrl(`/rovers/${rover}/latest_photos`, {})
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      const latest = data.latest_photos || []
      if (latest.length > 0) return latest
    }
  } catch {
    // Fall through to manifest + sol.
  }

  const manifest = await getManifest(rover)
  const maxSol = manifest?.max_sol
  if (typeof maxSol !== 'number' || Number.isNaN(maxSol)) {
    throw new Error(`NASA manifest (${rover}): missing max_sol`)
  }

  const MAX_SOLS_TO_TRY = 30
  for (let i = 0; i < MAX_SOLS_TO_TRY; i++) {
    const sol = maxSol - i
    if (sol < 0) break

    const photos = await getPhotosBySol(rover, sol, null, 1)
    if (photos.length > 0) return photos
  }

  throw new Error(
    `NASA API error (${rover}): no photos in last ${MAX_SOLS_TO_TRY} sols from max_sol=${maxSol}`,
  )
}
