/**
 * NASA imagery for Mars Today:
 * - Curiosity: Mars.nasa.gov `raw_image_items` (no API key).
 *
 * Legacy `api.nasa.gov/mars-photos` is archived (404).
 */

/** Only accept MSL rows (API can return other missions). */
function itemMatchesCuriosity(item) {
  if (!item) return false
  return String(item.mission ?? '').toLowerCase() === 'msl'
}

const RAW_IMAGE_ITEMS_URLS = {
  curiosity: [
    'https://mars.nasa.gov/api/v1/raw_image_items/?order=sol+desc%2Cinstrument_sort+asc%2Csample_type_sort+asc%2C+date_taken+desc&per_page=12&page=0&mission=msl',
    'https://mars.nasa.gov/api/v1/raw_image_items?order=sol+desc&per_page=12&page=0&condition_1=msl:mission&search=&extended=thumbnail::sample_type::noteq',
    'https://mars.nasa.gov/api/v1/raw_image_items?order=sol+desc&per_page=12&page=0&condition_1=msl:mission&search=',
  ],
}

/** Map one `raw_image_items` row to the shape the rest of the app expects (matches old Mars Photos API fields we use). */
export function mapRawImageItemToPhoto(item) {
  if (!item) return null
  const earthDate =
    typeof item.date_taken === 'string' && item.date_taken.includes('T')
      ? item.date_taken.split('T')[0]
      : typeof item.date_taken === 'string'
        ? item.date_taken.slice(0, 10)
        : ''
  return {
    id: item.id,
    img_src: item.url,
    earth_date: earthDate,
    sol: item.sol,
    rover: {
      name: 'Curiosity',
    },
    camera: {
      name: item.instrument,
    },
  }
}

/**
 * NASA API-shaped object for dev when the Mars site API fails.
 * `img_src` uses NASA Images (`images-assets.nasa.gov`) JPEGs — reliable in `<img>`.
 */
function mockPhoto({
  id,
  roverId,
  roverName,
  cameraName,
  cameraFull,
  sol,
  earthDate,
  imgSrc,
  landingDate = '2012-08-06',
  launchDate = '2011-11-26',
}) {
  return {
    id,
    sol,
    img_src: imgSrc,
    earth_date: earthDate,
    camera: {
      id: Math.abs(id) % 1000,
      name: cameraName,
      rover_id: roverId,
      full_name: cameraFull,
    },
    rover: {
      id: roverId,
      name: roverName,
      landing_date: landingDate,
      launch_date: launchDate,
      status: 'active',
    },
  }
}

const MOCK_LATEST_BY_ROVER = {
  curiosity: [
    mockPhoto({
      id: -900001,
      roverId: 5,
      roverName: 'Curiosity',
      cameraName: 'MAHLI',
      cameraFull: 'Mars Hand Lens Imager',
      sol: 1065,
      earthDate: '2015-08-05',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA19808/PIA19808~medium.jpg',
    }),
    mockPhoto({
      id: -900002,
      roverId: 5,
      roverName: 'Curiosity',
      cameraName: 'MAHLI',
      cameraFull: 'Mars Hand Lens Imager',
      sol: 532,
      earthDate: '2013-01-31',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA24543/PIA24543~medium.jpg',
    }),
    mockPhoto({
      id: -900003,
      roverId: 5,
      roverName: 'Curiosity',
      cameraName: 'MAST',
      cameraFull: 'Mast Camera',
      sol: 669,
      earthDate: '2014-07-03',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA23240/PIA23240~medium.jpg',
    }),
    mockPhoto({
      id: -900004,
      roverId: 5,
      roverName: 'Curiosity',
      cameraName: 'MAST',
      cameraFull: 'Mast Camera',
      sol: 908,
      earthDate: '2015-02-11',
      imgSrc: 'https://images-assets.nasa.gov/image/PIA21718/PIA21718~medium.jpg',
    }),
  ],
}

function getMockLatestPhotos(rover) {
  const key = String(rover || '').toLowerCase()
  const list = MOCK_LATEST_BY_ROVER[key]
  return Array.isArray(list) ? [...list] : []
}

async function fetchLatestPhotosFromMarsApi(rover) {
  const key = String(rover || '').toLowerCase()
  const urls = RAW_IMAGE_ITEMS_URLS[key]
  if (!urls?.length) {
    throw new Error(`Unknown rover: ${rover}`)
  }

  let lastStatus = null
  for (const url of urls) {
    const res = await fetch(url)
    lastStatus = res.status
    if (!res.ok) continue

    const data = await res.json()
    const items = (data.items || []).filter((item) => itemMatchesCuriosity(item))
    const photos = items.map(mapRawImageItemToPhoto).filter(Boolean)
    if (photos.length > 0) {
      return photos
    }
  }

  throw new Error(
    `Mars raw_image_items returned no images (${rover})` +
      (lastStatus != null ? ` (last HTTP ${lastStatus})` : ''),
  )
}

/**
 * Latest rover photos from `mars.nasa.gov`. On failure, returns NASA Images mock data.
 *
 * @returns {{ photos: object[], usedMock: boolean }}
 */
export async function getLatestPhotos(rover) {
  try {
    const photos = await fetchLatestPhotosFromMarsApi(rover)
    return { photos, usedMock: false }
  } catch (err) {
    console.warn('[nasa] Mars API unavailable — using mock photos for', rover, err)
    return { photos: getMockLatestPhotos(rover), usedMock: true }
  }
}

/** Curiosity (MSL) landing — sol 0 reference (UTC noon). */
const MSL_LANDING_MS = Date.parse('2012-08-06T12:00:00Z')
/** Mean Martian sol length in milliseconds (~24h 39m 35s). */
const MS_PER_SOL = 88775250

/**
 * Rough Earth-date → sol mapping for search seeding (MSL).
 * @param {string} earthDate `YYYY-MM-DD`
 */
export function estimateSolFromEarthDate(earthDate) {
  const t = Date.parse(`${earthDate}T12:00:00Z`)
  if (Number.isNaN(t)) return 0
  const sol = Math.round((t - MSL_LANDING_MS) / MS_PER_SOL)
  return Math.max(0, Math.min(sol, 20000))
}

/**
 * Instrument codes returned by `raw_image_items` for MSL (subset; "All" = no filter).
 */
const CAMERA_NAMES = {
  '': 'All cameras',
  FHAZ: 'Front Hazard Cam',
  RHAZ: 'Rear Hazard Cam',
  MAST: 'Mast Camera',
  CHEMCAM: 'Chemistry Camera',
  MAHLI: 'Hand Lens Imager',
  MARDI: 'Descent Imager',
  NAVCAM: 'Navigation Camera',
  PANCAM: 'Panoramic Camera',
  NAVCAM_LEFT: 'Navigation Camera Left',
  NAVCAM_RIGHT: 'Navigation Camera Right',
  NAV_LEFT_B: 'Navigation Camera Left B',
  NAV_RIGHT_B: 'Navigation Camera Right B',
  MAST_LEFT: 'Mast Camera Left',
  MAST_RIGHT: 'Mast Camera Right',
  MCZ_LEFT: 'Mastcam-Z Left',
  MCZ_RIGHT: 'Mastcam-Z Right',
  FRONT_HAZCAM_LEFT_A: 'Front Hazcam Left',
  FRONT_HAZCAM_RIGHT_A: 'Front Hazcam Right',
  REAR_HAZCAM_LEFT: 'Rear Hazcam Left',
  REAR_HAZCAM_RIGHT: 'Rear Hazcam Right',
  SHERLOC_WATSON: 'WATSON Camera',
}

export function cameraCodeToLabel(cameraCode) {
  const code = String(cameraCode || '').trim()
  const exact = CAMERA_NAMES[code]
  if (exact) return exact

  // Fallback for unknown codes (best-effort prettification).
  return code
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => `${w.slice(0, 1).toUpperCase()}${w.slice(1).toLowerCase()}`)
    .join(' ')
}

export const CURIOSITY_INSTRUMENTS = [
  { value: '', label: cameraCodeToLabel('') },
  { value: 'MAST_LEFT', label: cameraCodeToLabel('MAST_LEFT') },
  { value: 'MAST_RIGHT', label: cameraCodeToLabel('MAST_RIGHT') },
  { value: 'NAV_LEFT_B', label: cameraCodeToLabel('NAV_LEFT_B') },
  { value: 'NAV_RIGHT_B', label: cameraCodeToLabel('NAV_RIGHT_B') },
  { value: 'FHAZ', label: cameraCodeToLabel('FHAZ') },
  { value: 'RHAZ', label: cameraCodeToLabel('RHAZ') },
  { value: 'CHEMCAM', label: cameraCodeToLabel('CHEMCAM') },
  { value: 'MAHLI', label: cameraCodeToLabel('MAHLI') },
  { value: 'MARDI', label: cameraCodeToLabel('MARDI') },
]

async function fetchRawImageItemsUrl(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Mars raw_image_items HTTP ${res.status}`)
  return res.json()
}

/**
 * One page of Curiosity images for a given sol (mission=msl).
 * @returns {{ photos: object[], more: boolean, page: number, total: number }}
 */
export async function fetchCuriosityPageBySol(sol, page = 0, perPage = 25) {
  const s = Number(sol)
  if (!Number.isFinite(s) || s < 0) {
    return { photos: [], more: false, page: 0, total: 0 }
  }

  const q = new URLSearchParams({
    order: 'sol desc',
    per_page: String(perPage),
    page: String(page),
    mission: 'msl',
  })
  q.set('condition_1', `${Math.floor(s)}:sol`)

  const url = `https://mars.nasa.gov/api/v1/raw_image_items/?${q.toString()}`
  const data = await fetchRawImageItemsUrl(url)
  const items = (data.items || []).filter((item) => itemMatchesCuriosity(item))
  const photos = items.map(mapRawImageItemToPhoto).filter(Boolean)
  return {
    photos,
    more: data.more === true,
    page: data.page ?? page,
    total: typeof data.total === 'number' ? data.total : photos.length,
  }
}

function filterByCamera(photos, camera) {
  const c = String(camera || '').trim()
  if (!c) return photos
  return photos.filter((p) => String(p.camera?.name || '') === c)
}

function filterByEarthDatePrefix(photos, earthDate) {
  const prefix = String(earthDate || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prefix)) return photos
  return photos.filter((p) => String(p.earth_date || '').startsWith(prefix))
}

/**
 * Latest sol number from the default MSL feed (first photo), or 0.
 */
export async function getLatestCuriositySol() {
  try {
    const { photos } = await getLatestPhotos('curiosity')
    const sol = photos?.[0]?.sol
    if (sol != null && Number.isFinite(Number(sol))) return Math.floor(Number(sol))
  } catch {
    /* ignore */
  }
  return 0
}

/**
 * Photos for one sol, optional camera filter (client-side), paginated.
 */
export async function getCuriosityPhotosBySol(sol, { page = 0, camera = '', perPage = 25 } = {}) {
  try {
    const { photos, more, total } = await fetchCuriosityPageBySol(sol, page, perPage)
    return {
      photos: filterByCamera(photos, camera),
      more,
      page,
      total,
      usedMock: false,
    }
  } catch (err) {
    console.warn('[nasa] sol fetch failed', err)
    const mock = getMockLatestPhotos('curiosity')
    return {
      photos: filterByCamera(mock, camera),
      more: false,
      page: 0,
      total: mock.length,
      usedMock: true,
    }
  }
}

/**
 * Find images whose Earth date matches `earthDate` by searching around an estimated sol window.
 */
export async function getCuriosityPhotosByEarthDate(earthDate, { camera = '' } = {}) {
  const d = String(earthDate || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return { photos: [], usedMock: false, searchedSols: 0 }
  }

  const center = estimateSolFromEarthDate(d)
  const maxRadius = 120
  const seen = new Set()
  const out = []

  try {
    for (let r = 0; r <= maxRadius && out.length < 48; r++) {
      for (const delta of [0, r, -r]) {
        if (r !== 0 && delta === 0) continue
        const sol = center + delta
        if (sol < 0 || seen.has(sol)) continue
        seen.add(sol)

        const batch = await fetchCuriosityPageBySol(sol, 0, 50)
        const matched = filterByEarthDatePrefix(
          filterByCamera(batch.photos, camera),
          d,
        )
        for (const p of matched) {
          out.push(p)
          if (out.length >= 48) break
        }
        if (out.length >= 48) break
      }
    }
    return { photos: out.slice(0, 24), usedMock: false, searchedSols: seen.size }
  } catch (err) {
    console.warn('[nasa] earth date search failed', err)
    const mock = filterByEarthDatePrefix(
      filterByCamera(getMockLatestPhotos('curiosity'), camera),
      d,
    )
    return { photos: mock, usedMock: true, searchedSols: 0 }
  }
}

// APOD removed from the app: only Curiosity raw_image_items remain.
