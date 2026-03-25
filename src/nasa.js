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

/** NASA API-shaped object for dev when api.nasa.gov is down. Images are real rover assets on mars.nasa.gov. */
function mockPhoto({
  id,
  roverId,
  roverName,
  cameraName,
  cameraFull,
  sol,
  earthDate,
  imgSrc,
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
      landing_date: '2012-08-06',
      launch_date: '2011-11-26',
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
      cameraName: 'FHAZ',
      cameraFull: 'Front Hazard Camera',
      sol: 1000,
      earthDate: '2015-05-30',
      imgSrc:
        'https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/01000/opgs/edr/fcam/FLB_486264257EDR_F0481570FCCAM02013M_.JPG',
    }),
    mockPhoto({
      id: -900002,
      roverId: 5,
      roverName: 'Curiosity',
      cameraName: 'RHAZ',
      cameraFull: 'Rear Hazard Camera',
      sol: 1000,
      earthDate: '2015-05-30',
      imgSrc:
        'https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/01000/opgs/edr/rcam/RRB_486264257EDR_F0481570RHAZ02000M_.JPG',
    }),
    mockPhoto({
      id: -900003,
      roverId: 5,
      roverName: 'Curiosity',
      cameraName: 'NAVCAM',
      cameraFull: 'Navigation Camera',
      sol: 1000,
      earthDate: '2015-05-30',
      imgSrc:
        'https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/01000/opgs/edr/nacam/NLA_486264257EDR_F0481570NCAM02000M_.JPG',
    }),
    mockPhoto({
      id: -900004,
      roverId: 5,
      roverName: 'Curiosity',
      cameraName: 'FHAZ',
      cameraFull: 'Front Hazard Camera',
      sol: 1000,
      earthDate: '2015-05-30',
      imgSrc:
        'https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/01000/opgs/edr/fcam/FRB_486264257EDR_F0481570FCCAM02013M_.JPG',
    }),
  ],
  perseverance: [
    mockPhoto({
      id: -910001,
      roverId: 8,
      roverName: 'Perseverance',
      cameraName: 'FRONT_HAZCAM_LEFT_A',
      cameraFull: 'Front Hazcam Left',
      sol: 1,
      earthDate: '2021-02-19',
      imgSrc:
        'https://mars.nasa.gov/mars2020/multimedia/raw-images/NLB_0001_0667022786_04ECM_N0040048NCAM02000_06_0J02.jpg',
    }),
    mockPhoto({
      id: -910002,
      roverId: 8,
      roverName: 'Perseverance',
      cameraName: 'FRONT_HAZCAM_RIGHT_A',
      cameraFull: 'Front Hazcam Right',
      sol: 1,
      earthDate: '2021-02-19',
      imgSrc:
        'https://mars.nasa.gov/mars2020/multimedia/raw-images/NRB_0001_0667022786_04ECM_N0040048NCAM02000_06_0J02.jpg',
    }),
    mockPhoto({
      id: -910003,
      roverId: 8,
      roverName: 'Perseverance',
      cameraName: 'MCZ_LEFT',
      cameraFull: 'Mastcam-Z Left',
      sol: 2,
      earthDate: '2021-02-20',
      imgSrc:
        'https://mars.nasa.gov/mars2020/multimedia/raw-images/ZLF_0001_0670168336_02ECN0031040000LFCCON00_10A0JPG01.jpg',
    }),
    mockPhoto({
      id: -910004,
      roverId: 8,
      roverName: 'Perseverance',
      cameraName: 'MCZ_RIGHT',
      cameraFull: 'Mastcam-Z Right',
      sol: 2,
      earthDate: '2021-02-20',
      imgSrc:
        'https://mars.nasa.gov/mars2020/multimedia/raw-images/ZRF_0001_0670168336_02ECN0031040000RFCCON00_10A0JPG01.jpg',
    }),
  ],
}

function getMockLatestPhotos(rover) {
  const key = String(rover || '').toLowerCase()
  return MOCK_LATEST_BY_ROVER[key] || MOCK_LATEST_BY_ROVER.curiosity
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

async function fetchLatestPhotosFromApi(rover) {
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

/**
 * Latest rover photos. Tries the real NASA API first; if it fails (outage, network, etc.),
 * returns a small hardcoded set so the UI keeps working offline from NASA.
 */
export async function getLatestPhotos(rover) {
  try {
    return await fetchLatestPhotosFromApi(rover)
  } catch (err) {
    console.warn('[nasa] API unavailable — using mock Mars photos for', rover, err)
    return getMockLatestPhotos(rover)
  }
}
