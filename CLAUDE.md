# CLAUDE.md — Mars Today

> This file is the source of truth for every decision made in this project.
> Read it fully before touching any code. Update it when anything changes.

---

## Project Overview

**Mars Today** is a Mars rover photo journal web app. Every sol (Martian day), NASA's Curiosity
rover sends back photos from the surface of Mars. This app makes that data beautiful and
personal — users browse daily photo galleries by sol and camera, favourite shots, and build
their own private collections.

Browsing requires no account. Creating an account unlocks favourites and personal collections.

**No AI is used in this app.** It is a pure data + personal collection product.

---

## Core Goals

1. Looks impressive on GitHub — good README, clean code, live demo link
2. Hosted on GitHub Pages (free, static only — no server)
3. New content appears automatically every sol (NASA sends new photos)
4. Users can sign up, favourite photos, and build personal collections
5. Fully browsable without an account (read-only public access)

---

## Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | Vanilla JS + HTML + CSS | No framework = simpler for GitHub Pages |
| Dev server | Vite | Fast HMR, bundles for production |
| Database + Auth | Supabase | Free tier, works client-side with RLS |
| NASA data | Mars `raw_image_items` (no key) |
| Hosting | GitHub Pages | Free, deploys from `dist/` via gh-pages |
| Deploy | `gh-pages` npm package | One command: `npm run deploy` |

---

## Project Structure
```
mars-today/
├── CLAUDE.md              ← you are here
├── README.md              ← project description + demo link + screenshots
├── index.html             ← entry point (Vite picks this up)
├── package.json
├── vite.config.js
├── .env.example           ← template (commit this)
├── .env                   ← real keys (NEVER commit — in .gitignore)
├── .gitignore
├── tasks/
│   ├── todo.md            ← active task checklist
│   └── lessons.md         ← mistakes learned, patterns to follow
└── src/
    ├── main.js            ← app entry, shell layout, auth + nav + router init
    ├── style.css          ← global styles
    ├── auth.js            ← Supabase session listener + profile bootstrap
    ├── supabase.js        ← supabase client singleton
    ├── nasa.js            ← NASA API functions
    ├── router.js          ← hash router (uses routeUtils)
    ├── routeUtils.js      ← parse `#/path?query` → path + URLSearchParams
    ├── collections.js     ← collections + collection_photos helpers
    ├── favourites.js      ← favourites toggle + row → photo shape
    ├── components/
    │   ├── Nav.js         ← top navigation bar
    │   ├── PhotoCard.js   ← individual photo tile
    │   ├── PhotoModal.js  ← full-screen photo + metadata
    │   ├── RoverGallery.js← grid of photos for a sol
    │   ├── SolPicker.js   ← sol prev/next + camera filter
    │   └── Auth.js        ← login / signup modal
    └── pages/
        ├── Home.js        ← core page: minimal hero + sol picker + Curiosity photo grid
        ├── Favourites.js  ← hearted photos (`#/favourites`)
        ├── Collection.js  ← `#/collections` list + `#/collections/:id` grid
        └── Profile.js     ← user profile page (planned)
```

---

## Page Map

| Route | Page | Notes |
|-------|------|-------|
| `#/` | Home | **Core experience.** Minimal hero, sol picker, Curiosity grid |
| `#/favourites` | Favourites | Auth required |
| `#/collections` | Collections list | Auth required |
| `#/collections/:id` | Collection grid | Auth required |

> The old `#/rover/curiosity` route is **removed**. Home IS the rover browser.

---

## Home Page Design

The home page is the entire app for most visitors. It should feel approachable to someone
who has never heard of a sol or knows nothing about NASA cameras.

### Layout (top → bottom)

1. **Minimal hero strip** — app name + one friendly sentence:
   > *"Real photos beamed back from Mars — updated every sol (a Martian day, ~24h 37m)."*
   Keep it to 1–2 lines max. No paragraphs.

2. **Sol controls bar** — prev sol `‹` · current sol number · next sol `›` · camera dropdown.
   Sol is the only navigation unit. **No Earth date input field** (removed — was unreliable and
   confusing). Earth date is shown on hover over each photo card (already implemented).

3. **Photo grid** — Curiosity photos for the selected sol. Responsive: 1 col mobile → 2 tablet
→ 3+ desktop. Skeleton loaders while fetching. Lazy-loaded images. If a camera filter returns
zero photos for the current sol, show an explicit empty-state panel with a quick reset to
“All cameras”.

4. **Load more** button below the grid if more photos exist for that sol.

### Camera filter

Show a `<select>` with human-readable camera names (e.g. "Mast Camera", "Navigation Camera").
Default: "All cameras". Filter is applied client-side on the `raw_image_items` response.

### What to remove from the old Home
- APOD "From the Universe" column → removed entirely from the app
- Section bridge copy and welcome explainer strip → replaced by the single hero sentence
- Sign-up nudge banner → remove; auth prompt appears naturally when a user tries to favourite

---

## Environment Variables

These go in `.env` (local only) and get baked into the bundle at build time by Vite.
```bash
# .env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**CRITICAL RULES:**
- `VITE_` prefix = Vite bakes it into the bundle (accessible as `import.meta.env.VITE_*`)
- NEVER use the Supabase `service_role` key — only the `anon` key
- The anon key is safe to expose publicly IF RLS is enabled on all tables (it is — see below)
- `.env` must be in `.gitignore` — commit `.env.example` with blank values instead

---

## NASA Data Sources

### Curiosity — `GET /raw_image_items` (Mars.nasa.gov)

**Base URL:** `https://mars.nasa.gov/api/v1` — **Auth:** none.

Primary query uses `mission=msl`. If `items` is empty, `src/nasa.js` retries older
`condition_1=msl:mission` URLs. Rows are **filtered to `item.mission === 'msl'`**.

**Example:**
```
GET https://mars.nasa.gov/api/v1/raw_image_items/?order=sol+desc%2Cinstrument_sort+asc%2Csample_type_sort+asc%2C+date_taken+desc&per_page=12&page=0&mission=msl
```

**Response:** `{ items: [ ... ] }` — each item includes `id`, `sol`, `instrument`, `url`,
`date_taken`, `mission`.

### Camera Names (for display)
```js
const CAMERA_NAMES = {
  FHAZ: 'Front Hazard Cam',
  RHAZ: 'Rear Hazard Cam',
  MAST: 'Mast Camera',
  CHEMCAM: 'Chemistry Camera',
  MAHLI: 'Hand Lens Imager',
  MARDI: 'Descent Imager',
  NAVCAM: 'Navigation Camera',
  PANCAM: 'Panoramic Camera',
  NAVCAM_LEFT: 'Navigation Camera Left',
  NAVCAM_RIGHT: 'Navigation Camera Right',
  MCZ_LEFT: 'Mastcam-Z Left',
  MCZ_RIGHT: 'Mastcam-Z Right',
  FRONT_HAZCAM_LEFT_A: 'Front Hazcam Left',
  FRONT_HAZCAM_RIGHT_A: 'Front Hazcam Right',
  REAR_HAZCAM_LEFT: 'Rear Hazcam Left',
  REAR_HAZCAM_RIGHT: 'Rear Hazcam Right',
  SHERLOC_WATSON: 'WATSON Camera',
}
```

### nasa.js
```js
export async function getLatestPhotos(rover) { ... } // 'curiosity' only
export function mapRawImageItemToPhoto(item) { ... }
```

---

## Supabase Setup

### Database Tables

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE favourites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nasa_photo_id INTEGER NOT NULL,
  rover TEXT NOT NULL,
  earth_date TEXT NOT NULL,
  sol INTEGER NOT NULL,
  camera_name TEXT NOT NULL,
  img_src TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, nasa_photo_id)
);

CREATE TABLE collections (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE collection_photos (
  id BIGSERIAL PRIMARY KEY,
  collection_id BIGINT REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  nasa_photo_id INTEGER NOT NULL,
  img_src TEXT NOT NULL,
  rover TEXT NOT NULL,
  earth_date TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, nasa_photo_id)
);
```

> `comments` table is **removed** from the schema. If it exists in your database, it can be
> left in place safely — it is simply unused by the app.

### Row Level Security (RLS) Policies

```sql
-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- FAVOURITES
ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own favourites"
  ON favourites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own favourites"
  ON favourites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favourites"
  ON favourites FOR DELETE USING (auth.uid() = user_id);

-- COLLECTIONS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own collections"
  ON collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own collections"
  ON collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own collections"
  ON collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own collections"
  ON collections FOR DELETE USING (auth.uid() = user_id);

-- COLLECTION_PHOTOS
ALTER TABLE collection_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collection photos follow collection visibility"
  ON collection_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );
CREATE POLICY "Collection owners can add photos"
  ON collection_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );
CREATE POLICY "Collection owners can remove photos"
  ON collection_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );
```

> Collections are now **personal only** — the old `is_public` community browse is removed.
> The `is_public` column can stay in the DB but is no longer surfaced in the UI.

### supabase.js — Client singleton
```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## GitHub Pages Deployment

### vite.config.js
```js
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/mars-today/',
})
```

### package.json scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "vite build && gh-pages -d dist"
  }
}
```

### Deploy Command
```bash
npm run deploy
```

### GitHub Pages Settings (after first deploy)

1. Go to repo → Settings → Pages
2. Source: Deploy from a branch
3. Branch: `gh-pages` / `/ (root)`
4. Save → live at `https://lukethebuilder.github.io/mars-today/`

### .gitignore
```
node_modules/
dist/
.env
.DS_Store
```

---

## App Features

### Core (done)
- [x] Home page: minimal hero + sol picker (prev/next sol + camera filter) + Curiosity photo grid
- [x] Sol navigation — prev/next sol only. No Earth date input field.
- [x] Earth date shown on photo card hover (not as a search input)
- [x] Camera filter: human-readable names, client-side filter on `raw_image_items`
- [x] Photo modal: full-size image + metadata (rover, camera, earth date, sol)
- [x] Load more photos per sol
- [x] Skeleton loaders, lazy images

### Auth
- [x] Sign up / Log in modal (Supabase Auth, email + password)
- [x] Profile created on first login
- [x] Auth state persisted across page refreshes

### Personal features (auth required)
- [x] Favourite a photo (heart button → `favourites` table)
- [x] View favourites page (`#/favourites`)
- [x] Create named collections + add photos (`#/collections`, `#/collections/:id`)

### Removed from scope
- ✗ Community collections (public browse of other users' collections)
- ✗ Comments on photos
- ✗ Earth date search input
- ✗ Separate `#/rover/curiosity` route (merged into Home)

---

## Design Principles

- **Dark theme only.** Space is dark. Use deep blacks and very dark grays.
- **The photos are the hero.** Let NASA's images breathe — minimal UI chrome.
- **Mars color palette:** accent is Mars red `#c1440e` or dust orange `#e07a47`
- **Approachable language.** Visitors likely don't know what a sol is. Explain lightly in context — never assume knowledge.
- **Monospace font for technical data** (sol numbers, Earth dates, camera names)
- **Mobile first.** Photo grid is responsive — 1 col mobile, 2 tablet, 3+ desktop.
- **Skeleton loaders** while photos fetch — never a blank white flash.
- **Lazy loading images** — `loading="lazy"` on all `<img>` tags.

---

## Key Constraints

1. **No server.** Everything runs in the browser. Supabase is the only backend.
2. **No framework.** Vanilla JS only. No React, Vue, or Svelte.
3. **No TypeScript.** Plain `.js` files.
4. **Supabase free tier**: 500MB database, 50k MAU — more than enough.
5. **Always run `npm run deploy`** to publish changes to GitHub Pages.

---

## Common Patterns

### Fetching Curiosity photos by sol
```js
const res = await fetch(
  `https://mars.nasa.gov/api/v1/raw_image_items/?order=sol+desc%2Cinstrument_sort+asc%2Csample_type_sort+asc%2C+date_taken+desc&per_page=24&page=0&mission=msl&sol=${sol}`
)
const { items } = await res.json()
```

### Checking auth state
```js
import { supabase } from './supabase.js'

const { data: { session } } = await supabase.auth.getSession()
const user = session?.user ?? null
```

### Favouriting a photo
```js
async function toggleFavourite(photo, userId) {
  const { data: existing } = await supabase
    .from('favourites')
    .select('id')
    .eq('user_id', userId)
    .eq('nasa_photo_id', photo.id)
    .single()

  if (existing) {
    await supabase.from('favourites').delete().eq('id', existing.id)
  } else {
    await supabase.from('favourites').insert({
      user_id: userId,
      nasa_photo_id: photo.id,
      rover: photo.rover.name.toLowerCase(),
      earth_date: photo.earth_date,
      sol: photo.sol,
      camera_name: photo.camera.name,
      img_src: photo.img_src,
    })
  }
}
```

---

## Task Management

Before starting any work, write a plan to `tasks/todo.md`.
After any user correction, write what was learned to `tasks/lessons.md`.

---

## Git Workflow
```bash
git add .
git commit -m "feat: consolidate rover browser into home page"
git push origin main
npm run deploy
```

---

## Getting Started (First Run)
```bash
npm install
cp .env.example .env
# Edit .env with your Supabase URL + anon key + NASA API key
npm run dev
```

---

*Last updated: Scope simplification — Curiosity browser is now Home; removed comments, community collections, Earth date search, and separate rover route.*