import { PhotoCard } from './PhotoCard.js'

function skeletonCard(i) {
  return `
    <article class="photoCard skeleton" aria-hidden="true" data-skel="${i}">
      <div class="skeletonImg" />
    </article>
  `
}

export function RoverGallery({
  roverLabel,
  photos = [],
  loading = false,
  error = null,
  skeletonCount = 12,
}) {
  const body = (() => {
    if (loading) {
      return `
        <div class="photoGrid">
          ${Array.from({ length: skeletonCount })
            .map((_, i) => skeletonCard(i))
            .join('')}
        </div>
      `
    }

    if (error) {
      return `
        <div class="panel">
          <p class="muted">Could not load ${roverLabel} photos.</p>
          <p class="mono">${String(error?.message || error)}</p>
        </div>
      `
    }

    return `
      <div class="photoGrid">
        ${photos.slice(0, skeletonCount).map((p) => PhotoCard({ photo: p, roverLabel })).join('')}
      </div>
    `
  })()

  return `
    <section class="roverSection">
      <div class="roverHeader">
        <h2 class="roverTitle">${roverLabel}</h2>
        <div class="roverMeta mono">latest photos</div>
      </div>
      ${body}
    </section>
  `
}

