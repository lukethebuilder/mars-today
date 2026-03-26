import { cameraCodeToLabel } from '../nasa.js'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Curiosity: "CAMERA · Sol n · YYYY-MM-DD". APOD: image title only. */
function hoverCaption(photo, roverLabel) {
  if (roverLabel === 'From the Universe') {
    return photo.camera?.name || 'APOD'
  }
  const cam = photo.camera?.name ? cameraCodeToLabel(photo.camera.name) : 'Camera'
  const sol = photo.sol != null ? String(photo.sol) : '—'
  const date = photo.earth_date || '—'
  return `${cam} · Sol ${sol} · ${date}`
}

export function PhotoCard({
  photo,
  roverLabel,
  showSampleBadge = false,
  showFavourite = false,
  isFavourited = false,
  photoSection = '',
  photoIndex = 0,
  interactive = false,
}) {
  if (!photo) return ''

  const roverName = photo.rover?.name || roverLabel || 'Rover'
  const cameraLabel = photo.camera?.name ? cameraCodeToLabel(photo.camera.name) : 'Camera'
  const alt = escapeHtml(
    `${roverName} - ${cameraLabel} (${photo.earth_date || 'unknown date'})`,
  )

  const badge = showSampleBadge
    ? '<span class="photoSampleBadge" aria-label="Sample image, not live feed">SAMPLE</span>'
    : ''

  const caption = escapeHtml(hoverCaption(photo, roverLabel))

  const favBtn =
    showFavourite && photoSection
      ? `
    <button
      type="button"
      class="photoCardFavBtn"
      aria-label="${isFavourited ? 'Remove from favourites' : 'Add to favourites'}"
      aria-pressed="${isFavourited ? 'true' : 'false'}"
      data-photo-section="${photoSection}"
      data-photo-index="${photoIndex}"
    >
      <span class="photoCardFavIcon" aria-hidden="true">${isFavourited ? '❤️' : '♡'}</span>
    </button>
  `
      : ''

  const interactiveClass = interactive ? ' photoCard--interactive' : ''
  const sectionAttr =
    interactive && photoSection
      ? ` data-photo-section="${photoSection}" data-photo-index="${photoIndex}"`
      : ''

  return `
    <article class="photoCard${interactiveClass}"${sectionAttr}>
      <div class="photoCardMedia">
        <img
          class="photoImg"
          src="${photo.img_src || ''}"
          alt="${alt}"
          loading="lazy"
          decoding="async"
        />
        <div class="photoCardCaptionOverlay" aria-hidden="true">
          <span class="photoCardCaptionText">${caption}</span>
        </div>
        ${favBtn}
        ${badge}
      </div>
    </article>
  `
}
