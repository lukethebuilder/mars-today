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
    </div>
  `
}

initSupabaseAuth()
initNav(document.querySelector('#navMount'))
initRouter()
