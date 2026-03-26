import { CURIOSITY_INSTRUMENTS } from '../nasa.js'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Curiosity rover browse: sol prev/next and camera (no Earth date inputs).
 */
export function roverBrowseControlsHtml({
  sol = 0,
  camera = '',
  loading = false,
}) {
  const camOpts = CURIOSITY_INSTRUMENTS.map(
    (o) =>
      `<option value="${escapeHtml(o.value)}" ${camera === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`,
  ).join('')

  const solDisabled = loading ? 'disabled' : ''
  return `
    <div class="roverBrowseBar">
      <div class="roverBrowseRow">
        <button type="button" class="btnGhost roverSolNav" data-sol-delta="-1" aria-label="Previous sol" ${solDisabled}>‹</button>
        <span class="roverSolNumber mono" aria-label="Current sol">${escapeHtml(sol)}</span>
        <button type="button" class="btnGhost roverSolNav" data-sol-delta="1" aria-label="Next sol" ${solDisabled}>›</button>
      </div>

      <div class="roverBrowseRow roverBrowseRow--camera">
        <label class="roverBrowseField roverBrowseField--grow">
          <span class="muted">Camera</span>
          <select class="roverCameraSelect mono" id="roverCameraSelect" ${solDisabled}>
            ${camOpts}
          </select>
        </label>
        <button type="button" class="btnGhost" id="roverApplyCamera" ${solDisabled}>Apply</button>
      </div>
    </div>
  `
}
