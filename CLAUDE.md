# CLAUDE.md — Mars Today

> This file is the source of truth for every decision made in this project.
> Read it fully before touching any code. Update it when anything changes.

---

## Project Overview

**Mars Today** is a Mars rover photo journal web app. Every sol (Martian day), NASA's rovers
send back photos from the surface of Mars. This app makes that data beautiful and social —
users browse daily galleries by rover and sol, favourite shots, leave comments, and build
personal collections.

**No AI is used in this app.** It is a pure data + community product.

---

## Core Goals

1. Looks impressive on GitHub — good README, clean code, live demo link
2. Hosted on GitHub Pages (free, static only — no server)
3. New content appears automatically every day (NASA sends new photos)
4. Users can sign up, favourite photos, comment, build collections
5. Browsable without an account (read-only public access)

---

## Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | Vanilla JS + HTML + CSS | No framework = simpler for GitHub Pages |
| Dev server | Vite | Fast HMR, bundles for production |
| Database + Auth | Supabase | Free tier, works client-side with RLS |
| NASA data | Mars `raw_image_items` (no key) + APOD (`api.nasa.gov`, `VITE_NASA_API_KEY`) |
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
    ├── comments.js        ← Supabase comments (batch counts, CRUD)
    ├── collections.js     ← collections + collection_photos helpers
    ├── favourites.js      ← favourites toggle + row → photo shape
    ├── components/
    │   ├── Nav.js         ← top navigation bar
    │   ├── PhotoCard.js   ← individual photo tile
    │   ├── PhotoModal.js  ← full-screen photo + comments
    │   ├── RoverGallery.js← grid of photos for a sol
    │   ├── SolPicker.js   ← Curiosity browse bar (sol / Earth date / camera)
    │   └── Auth.js        ← login / signup modal
    └── pages/
        ├── Home.js        ← today's featured photos, all rovers
        ├── Rover.js       ← `#/rover/curiosity` — sol / Earth date / camera browse
        ├── Favourites.js  ← hearted photos
        ├── Collection.js  ← `#/collections` list + `#/collections/:id` grid
        ├── Rover.js       ← browse a specific rover by sol (planned)
        └── Profile.js     ← user profile page (planned)
```

---

## Environment Variables

These go in `.env` (local only) and get baked into the bundle at build time by Vite.
```bash
# .env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_NASA_API_KEY=your-nasa-api-key-here
```

**CRITICAL RULES:**
- `VITE_` prefix = Vite bakes it into the bundle (accessible as `import.meta.env.VITE_*`)
- NEVER use the Supabase `service_role` key — only the `anon` key
- The anon key is safe to expose publicly IF RLS is enabled on all tables (it is — see below)
- **APOD** on the Home page uses `VITE_NASA_API_KEY` (same key as https://api.nasa.gov — free tier). Curiosity rover imagery uses Mars.nasa.gov’s public `raw_image_items` API — **no key** for that feed.
- `.env` must be in `.gitignore` — commit `.env.example` with blank values instead

---

## NASA data sources (Home page)

The legacy **Mars Rover Photos API** at `https://api.nasa.gov/mars-photos/api/v1` is **archived by NASA** and returns **404**. Curiosity uses Mars.nasa.gov’s **`raw_image_items`** JSON API (no key). The second Home column is **APOD** (Astronomy Picture of the Day), not Mars 2020 — NASA’s Mars 2020 `raw_image_items` filters were unreliable, so that section was replaced with thematic space imagery.

### Curiosity — `GET /raw_image_items` (Mars.nasa.gov)

**Base URL:** `https://mars.nasa.gov/api/v1` — **Auth:** none.

Primary query uses `mission=msl` and the same sort order as NASA’s MSL raw-images page. If `items` is empty, `src/nasa.js` retries older `condition_1=msl:mission` URLs. Rows are **filtered to `item.mission === 'msl'`** so stray mission data is ignored.

**Example:**
```
GET https://mars.nasa.gov/api/v1/raw_image_items/?order=sol+desc%2Cinstrument_sort+asc%2Csample_type_sort+asc%2C+date_taken+desc&per_page=12&page=0&mission=msl
```

**Response:** `{ items: [ ... ] }` — each item includes `id`, `sol`, `instrument`, `url`, `date_taken`, `mission` (expect `msl` for Curiosity).

### Home — APOD (`getAPODPhotos()`)

**Endpoint:** `GET https://api.nasa.gov/planetary/apod?count=16&api_key=VITE_NASA_API_KEY`

Returns **an array** when `count` > 1. Each object includes `title`, `url`, `date`, `media_type` (`image` | `video`), `explanation`.

**Required behavior:** keep only `media_type === 'image'` entries (videos are often YouTube links — exclude them). Take the **first 12** images after filtering. Map each to the app photo shape: `id: date`, `img_src: url`, `earth_date: date`, `sol: null`, `rover: { name: 'APOD' }`, `camera: { name: title }`.

On failure or missing key: `{ photos: MOCK_APOD_PHOTOS, usedMock: true }` (hardcoded `apod.nasa.gov` image URLs).

- Curiosity (MSL): active since 2012-08-06
- Opportunity / Spirit: not wired in Phase 1

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

### nasa.js — Mars imagery + APOD + mock fallbacks
```js
// src/nasa.js
// getLatestPhotos('curiosity') — mars.nasa.gov raw_image_items; mock: NASA Images JPEGs.
// getAPODPhotos() — api.nasa.gov/planetary/apod?count=16; images only; mock: MOCK_APOD_PHOTOS.

export async function getLatestPhotos(rover) { ... } // 'curiosity' only
export async function getAPODPhotos() { ... }
export function mapRawImageItemToPhoto(item) { ... }
```

---

## Supabase Setup

### Database Tables

Run this SQL in the Supabase SQL Editor to create all tables:
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

CREATE TABLE comments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nasa_photo_id INTEGER NOT NULL,
  rover TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
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

**Existing databases:** add the column once in the SQL Editor:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
```

The app syncs `profiles.email` from Supabase Auth on each login (`ensureProfile`). Because `profiles` uses `SELECT USING (true)`, that email is readable in the client for comment labels; tighten RLS only if you need to hide it.

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

-- COMMENTS (use explicit roles so inserts work with the anon key + user JWT)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are public"
  ON comments FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can comment"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- COLLECTIONS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public collections are viewable by all"
  ON collections FOR SELECT USING (is_public = true OR auth.uid() = user_id);
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
      WHERE id = collection_id
      AND (is_public = true OR user_id = auth.uid())
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

### RLS troubleshooting (`violates row-level security policy`)

1. In **SQL Editor**, inspect policies:  
   `SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments';`
2. If `comments` still blocks inserts, **drop every policy on that table** and recreate (avoids typos / duplicates). Example for `comments` only:

```sql
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'comments'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.comments', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.comments TO authenticated;

CREATE POLICY "comments_select_public"
  ON public.comments FOR SELECT TO public USING (true);

CREATE POLICY "comments_insert_authenticated_own_row"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete_own"
  ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

3. **Sign out and sign in** after policy changes, then hard-refresh the app.

### supabase.js — Client singleton
```js
// src/supabase.js
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

## App Features — Build in this order

### Phase 1 — Core browsing (no auth needed)
- [x] Home page: Curiosity (Mars) + APOD “From the Universe” (welcome explainer strip, section bridge copy, APOD refresh, Curiosity hover shows camera · sol · date, sign-up nudge when logged out)
- [x] Rover page: `#/rover/curiosity` — browse by sol with prev/next, optional Earth date search, camera filter (MSL `instrument`), load more per sol
- [x] Photo modal: full-size image, metadata (rover, camera, earth date, sol)
- [x] Camera filter: on rover page (`CURIOSITY_INSTRUMENTS` + client filter on `raw_image_items`)
- [x] Date picker: Earth date (`YYYY-MM-DD`) on rover page — searches nearby estimated sols for matching `date_taken`

### Phase 2 — Auth
- [x] Sign up / Log in modal (Supabase Auth, email + password)
- [x] Profile created on first login
- [x] Auth state persisted across page refreshes

### Phase 3 — Social
- [x] Favourite a photo (heart button, requires auth + Supabase)
- [x] View your favourites page (`#/favourites`)
- [x] Leave a comment on a photo (`PhotoModal`, `comments` table; author from `profiles.username`)
- [x] See comment count on photo cards (batch fetch; badge when count > 0)

### Phase 4 — Collections
- [x] Create a named collection (modal + `#/collections`)
- [x] Add any photo to a collection (`collection_photos`, modal 📁 popover)
- [x] View a collection (grid) — `#/collections/:id`
- [x] Make collection public/private (toggle on list cards)
- [x] Browse public collections from other users (“Community collections” on `#/collections`)

---

## Design Principles

- **Dark theme only.** Space is dark. Use deep blacks and very dark grays.
- **The photos are the hero.** Let NASA's images breathe — minimal UI chrome.
- **Mars color palette:** accent color is Mars red `#c1440e` or dust orange `#e07a47`
- **Monospace font for technical data** (sol numbers, Earth dates, camera names)
- **Mobile first.** Photo grid is responsive — 1 col mobile, 2 tablet, 3+ desktop.
- **Skeleton loaders** while photos fetch — never a blank white flash.
- **Lazy loading images** — `loading="lazy"` on all `<img>` tags.

---

## Key Constraints

1. **No server.** Everything runs in the browser. Supabase is the only backend.
2. **No framework.** Vanilla JS only. No React, Vue, or Svelte.
3. **No TypeScript.** Plain `.js` files.
4. **Home grid** requests **12** Curiosity images from `raw_image_items` and **12** APOD images (`count=16` then filter to images); add pagination later if needed.
5. **Supabase free tier**: 500MB database, 50k MAU — more than enough.
6. **Always run `npm run deploy`** to publish changes to GitHub Pages.

---

## Common Patterns

### Fetching Mars rover photos
```js
// Curiosity — primary `mission=msl` (see `src/nasa.js` for fallbacks)
const res = await fetch(
  'https://mars.nasa.gov/api/v1/raw_image_items/?order=sol+desc%2Cinstrument_sort+asc%2Csample_type_sort+asc%2C+date_taken+desc&per_page=12&page=0&mission=msl',
)
const { items } = await res.json()
```

### Fetching APOD (Home)
```js
import { getAPODPhotos } from './nasa.js'
const { photos, usedMock } = await getAPODPhotos()
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
git commit -m "feat: add photo modal with full-size image and metadata"
git push origin main
npm run deploy
```

---

## Getting Started (First Run)
```bash
npm install
cp .env.example .env
# Edit .env with your Supabase URL + anon key
npm run dev
```

---

*Last updated: Phase 1 rover browse (`#/rover/curiosity`, sol / Earth date / camera).*