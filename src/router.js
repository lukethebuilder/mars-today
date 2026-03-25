import { getHashRoute } from './routeUtils.js'
import { renderHome } from './pages/Home.js'
import { renderFavourites } from './pages/Favourites.js'
import { renderCollectionsList, renderCollectionDetail } from './pages/Collection.js'
import { renderRover } from './pages/Rover.js'

export function initRouter() {
  const render = () => {
    const { path, searchParams } = getHashRoute()

    const root = document.querySelector('#pageMount')
    if (!root) return

    root.innerHTML = ''

    if (path === '/home') {
      renderHome()
      return
    }

    if (path === '/favourites') {
      renderFavourites()
      return
    }

    if (path === '/collections') {
      renderCollectionsList()
      return
    }

    const detailMatch = /^\/collections\/(\d+)$/.exec(path)
    if (detailMatch) {
      renderCollectionDetail(detailMatch[1])
      return
    }

    if (path === '/rover/curiosity') {
      renderRover(searchParams)
      return
    }

    root.innerHTML = `
      <div class="page">
        <h1>Not Found</h1>
        <p>Unknown route: <code>${path}</code></p>
        <p><a class="link" href="#/home">Go to Home</a></p>
      </div>
    `
  }

  window.addEventListener('hashchange', render)
  render()
}
