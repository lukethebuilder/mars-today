# Mars Today

A **Mars rover and space imagery journal** in the browser: browse Curiosity photos and NASA APOD tiles, sign in to favourite shots, comment, and build public or private collections. **No framework** — vanilla JavaScript, Vite, Supabase, and static hosting on GitHub Pages.

**Live demo:** [lukethebuilder.github.io/mars-today](https://lukethebuilder.github.io/mars-today/)

---

## Features

- **Home** — Latest Curiosity imagery (Mars.nasa.gov) plus a grid of recent **Astronomy Picture of the Day** images (when `VITE_NASA_API_KEY` is set).
- **Rover** — Browse Curiosity by **sol**, **Earth date**, and **camera**, with pagination-friendly loading.
- **Guests** — Full read-only browsing; no account required.
- **Signed-in users** — Favourites, comments on photos, named **collections** (add photos from the lightbox), and a **community** view of other users’ public collections.

---

## Tech stack

| Area | Choice |
|------|--------|
| UI | HTML, CSS, vanilla JS |
| Build | [Vite](https://vitejs.dev/) |
| Backend | [Supabase](https://supabase.com/) (Auth + Postgres + RLS) |
| Data | Mars `raw_image_items`, [NASA APOD API](https://api.nasa.gov/) |
| Hosting | [GitHub Pages](https://pages.github.com/) (`gh-pages` branch) |

Design notes, schema, RLS policies, and deployment details live in **[CLAUDE.md](./CLAUDE.md)** (project source of truth for contributors and AI tooling).

---

## Local development

```bash
npm install
cp .env.example .env
# Edit .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_NASA_API_KEY
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/mars-today/` — the app uses `base: '/mars-today/'` to match GitHub Pages).

---

## Environment variables

Defined in **`.env.example`**. Vite only exposes variables prefixed with **`VITE_`**. Use the Supabase **anon** key only (never the service role key in the client).

---

## Deploy to GitHub Pages

1. Build **with** your real `.env` (or equivalent CI secrets) so API keys are embedded in the production bundle:

   ```bash
   npm run deploy
   ```

   This runs `vite build` and pushes **`dist/`** to the **`gh-pages`** branch.

2. In the repo: **Settings → Pages** → deploy from branch **`gh-pages`**, folder **`/` (root)**.

3. In **Supabase → Authentication → URL configuration**, add your production origin (e.g. `https://lukethebuilder.github.io/mars-today`) so redirects work outside localhost.

---

## Repo layout (short)

```
src/
  main.js, router.js, style.css
  nasa.js, supabase.js, auth.js, comments.js, collections.js, favourites.js
  components/   Nav, PhotoCard, PhotoModal, RoverGallery, SolPicker, Auth
  pages/          Home, Rover, Favourites, Collection
public/           favicon.svg, icons.svg
```

---

## License

No license file
