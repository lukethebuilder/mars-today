import { renderHome } from './pages/Home.js'

function getRoute() {
  const raw = window.location.hash || '#/home'
  if (raw === '#/' || raw === '#') return '#/home'
  return raw
}

export function initRouter() {
  const render = () => {
    const route = getRoute()

    const root = document.querySelector('#pageMount')
    if (!root) return

    root.innerHTML = ''

    if (route === '#/home') {
      renderHome()
      return
    }

    root.innerHTML = `
      <div class="page">
        <h1>Not Found</h1>
        <p>Unknown route: <code>${route}</code></p>
        <p><a class="link" href="#/home">Go to Home</a></p>
      </div>
    `
  }

  window.addEventListener('hashchange', render)
  render()
}

