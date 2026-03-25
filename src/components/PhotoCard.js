export function PhotoCard({ photo, roverLabel }) {
  if (!photo) return ''

  const roverName = photo.rover?.name || roverLabel || 'Rover'
  const cameraName = photo.camera?.name || 'Camera'
  const alt = `${roverName} - ${cameraName} (${photo.earth_date || 'unknown date'})`

  return `
    <article class="photoCard">
      <img
        class="photoImg"
        src="${photo.img_src || ''}"
        alt="${alt}"
        loading="lazy"
        decoding="async"
      />
    </article>
  `
}

