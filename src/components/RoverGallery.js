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
  usedMock = false,
  headerRightLabel = 'latest photos',
  sectionSubtitle = '',
  showApodRefresh = false,
  signUpNudgeHtml = '',
  photoSection = '',
  showFavourite = false,
  favouriteKeys = null,
  interactive = false,
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
        ${photos
          .slice(0, skeletonCount)
          .map((p, i) =>
            PhotoCard({
              photo: p,
              roverLabel,
              showSampleBadge: usedMock,
              showFavourite: showFavourite && Boolean(photoSection),
              isFavourited:
                favouriteKeys instanceof Set &&
                favouriteKeys.has(favouriteKey(p, photoSection)),
              photoSection,
              photoIndex: i,
              interactive: interactive && Boolean(photoSection),
            }),
          )
          .join('')}
      </div>
    `
  })()

  const subtitleBlock =
    sectionSubtitle && sectionSubtitle.length > 0
      ? `<p class="roverSubtitle muted">${sectionSubtitle}</p>`
      : ''

  const titleRow = showApodRefresh
    ? `
        <div class="roverTitleRow">
          <h2 class="roverTitle">${roverLabel}</h2>
          <button type="button" class="apodRefreshBtn mono" aria-label="Load a new random selection from the archive">
            ↻ New selection
          </button>
        </div>
      `
    : `<h2 class="roverTitle">${roverLabel}</h2>`

  const nudgeBlock =
    signUpNudgeHtml && signUpNudgeHtml.length > 0
      ? `<p class="roverSignUpNudge muted">${signUpNudgeHtml}</p>`
      : ''

  return `
    <section class="roverSection">
      <div class="roverHeader">
        <div class="roverHeaderLeft">
          ${titleRow}
          ${subtitleBlock}
        </div>
        <div class="roverMeta mono">${headerRightLabel}</div>
      </div>
      ${nudgeBlock}
      ${body}
    </section>
  `
}
