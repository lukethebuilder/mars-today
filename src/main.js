import './style.css'

import { initSupabaseAuth } from './auth.js'
import { initNav } from './components/Nav.js'
import { initRouter } from './router.js'

const app = document.querySelector('#app')
if (app) {
  app.innerHTML = `
    <div class="appShell">
      <header id="navMount" class="navBar"></header>
      <div id="pageMount" class="pageOutlet"></div>
      <footer class="siteFooter" aria-label="Credits and transparency">
        <div class="siteFooterInner">
          <p class="siteFooterLine">
            Created by
            <a href="https://www.linkedin.com/in/lukehurt/" class="link" target="_blank" rel="noopener noreferrer">Luke Hurt</a>.
          </p>
          <p class="siteFooterLine siteFooterTransparency muted mono">
            Transparency: built with
            <a href="https://claude.ai" class="link" target="_blank" rel="noopener noreferrer">Claude</a>
            and
            <a href="https://cursor.com" class="link" target="_blank" rel="noopener noreferrer">Cursor</a>.
          </p>
        </div>
      </footer>
    </div>
  `
}

initSupabaseAuth()
initNav(document.querySelector('#navMount'))
initRouter()
