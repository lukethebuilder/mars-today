import { CURIOSITY_INSTRUMENTS } from '../nasa.js'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Curiosity rover browse: sol / Earth date, camera, prev-next, apply.
 */
export function roverBrowseControlsHtml({
  mode = 'sol',
  sol = 0,
  earthDate = '',
  camera = '',
  apiMore = false,
  loading = false,
}) {
  const camOpts = CURIOSITY_INSTRUMENTS.map(
    (o) =>
      `<option value="${escapeHtml(o.value)}" ${camera === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`,
  ).join('')

  const solDisabled = loading ? 'disabled' : ''
  const earthMode = mode === 'earth'

  return `
    <div class="roverBrowseBar">
      <div class="roverBrowseModes mono">
        <button type="button" class="roverModeBtn ${!earthMode ? 'roverModeBtn--active' : ''}" data-rover-mode="sol">By sol</button>
        <button type="button" class="roverModeBtn ${earthMode ? 'roverModeBtn--active' : ''}" data-rover-mode="earth">By Earth date</button>
      </div>

      <div class="roverBrowseRow" id="roverBrowseSolRow" ${earthMode ? 'hidden' : ''}>
        <button type="button" class="btnGhost roverSolNav" data-sol-delta="-1" aria-label="Previous sol" ${solDisabled}>← Prev sol</button>
        <label class="roverBrowseField">
          <span class="muted">Sol</span>
          <input type="number" class="roverSolInput mono" id="roverSolInput" min="0" max="25000" value="${sol}" ${solDisabled} />
        </label>
        <button type="button" class="btnGhost roverSolNav" data-sol-delta="1" aria-label="Next sol" ${solDisabled}>Next sol →</button>
        <button type="button" class="btnPrimary" id="roverApplySol" ${solDisabled}>Apply</button>
      </div>

      <div class="roverBrowseRow" id="roverBrowseEarthRow" ${!earthMode ? 'hidden' : ''}>
        <label class="roverBrowseField">
          <span class="muted">Earth date</span>
          <input type="date" class="roverDateInput mono" id="roverEarthDateInput" value="${escapeHtml(earthDate)}" ${solDisabled} />
        </label>
        <button type="button" class="btnPrimary" id="roverApplyEarth" ${solDisabled}>Find photos</button>
      </div>

      <div class="roverBrowseRow roverBrowseRow--camera">
        <label class="roverBrowseField roverBrowseField--grow">
          <span class="muted">Camera</span>
          <select class="roverCameraSelect mono" id="roverCameraSelect" ${solDisabled}>
            ${camOpts}
          </select>
        </label>
        <button type="button" class="btnGhost" id="roverApplyCamera" ${solDisabled}>Apply camera</button>
      </div>

      ${
        !earthMode && apiMore
          ? `<button type="button" class="btnGhost roverLoadMore" id="roverLoadMore" ${loading ? 'disabled' : ''}>Load more (this sol)</button>`
          : ''
      }
    </div>
  `
}
