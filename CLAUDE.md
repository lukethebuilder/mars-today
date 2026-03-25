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
| NASA data | Mars Rover Photos API | Free, 1000 req/hr with key |
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
    ├── router.js          ← simple hash router (#/home, #/rover/curiosity, etc.)
    ├── components/
    │   ├── Nav.js         ← top navigation bar
    │   ├── PhotoCard.js   ← individual photo tile
    │   ├── PhotoModal.js  ← full-screen photo + comments
    │   ├── RoverGallery.js← grid of photos for a sol
    │   ├── SolPicker.js   ← sol/date navigation controls
    │   └── Auth.js        ← login / signup modal
    └── pages/
        ├── Home.js        ← today's featured photos, all rovers
        ├── Rover.js       ← browse a specific rover by sol
        ├── Collection.js  ← a user's saved favourites
        └── Profile.js     ← user profile page
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
- The NASA API key is public-safe (rate limited by key, not secret)
- `.env` must be in `.gitignore` — commit `.env.example` with blank values instead

---

## NASA API Reference

**Base URL:** `https://api.nasa.gov/mars-photos/api/v1`

**API Key:** Free at https://api.nasa.gov — 1000 requests/hour with key, 50/day with DEMO_KEY

### Key Endpoints
```
# Get photos for a rover on a specific Earth date
GET /rovers/{rover}/photos?earth_date=YYYY-MM-DD&api_key=KEY

# Get photos for a rover by sol (Martian day)
GET /rovers/{rover}/photos?sol=1000&api_key=KEY

# Filter by camera
GET /rovers/{rover}/photos?sol=1000&camera=FHAZ&api_key=KEY

# Get the latest photos for a rover
GET /rovers/{rover}/latest_photos?api_key=KEY

# Mission manifest (total sols, photo counts, dates)
GET /manifests/{rover}?api_key=KEY
```

**Rovers:** `curiosity` | `perseverance` | `opportunity` | `spirit`
- Curiosity: Active since 2012-08-06
- Perseverance: Active since 2021-02-18
- Opportunity: Active 2004–2018
- Spirit: Active 2004–2010

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

### nasa.js — All NASA API functions live here
```js
// src/nasa.js
const BASE = 'https://api.nasa.gov/mars-photos/api/v1'
const KEY = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY'

// getLatestPhotos tries the real API first; if it fails (outage, etc.), it returns
// a small hardcoded set of mars.nasa.gov image URLs so the UI still works.

export async function getLatestPhotos(rover) { ... }
export async function getPhotosByDate(rover, earthDate, camera = null, page = 1) { ... }
export async function getPhotosBySol(rover, sol, camera = null, page = 1) { ... }
export async function getManifest(rover) { ... }
```

---

## Supabase Setup

### Database Tables

Run this SQL in the Supabase SQL Editor to create all tables:
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
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

-- COMMENTS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are public"
  ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment"
  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE USING (auth.uid() = user_id);

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
- [ ] Home page: today's photos from Curiosity + Perseverance
- [ ] Rover page: browse by sol with prev/next navigation
- [ ] Photo modal: full-size image, metadata (rover, camera, earth date, sol)
- [ ] Camera filter: filter gallery by camera type
- [ ] Date picker: jump to any Earth date

### Phase 2 — Auth
- [x] Sign up / Log in modal (Supabase Auth, email + password)
- [x] Profile created on first login
- [x] Auth state persisted across page refreshes

### Phase 3 — Social
- [ ] Favourite a photo (heart button, requires auth)
- [ ] View your favourites page
- [ ] Leave a comment on a photo
- [ ] See comment count on photo cards

### Phase 4 — Collections
- [ ] Create a named collection
- [ ] Add any photo to a collection
- [ ] View a collection (grid)
- [ ] Make collection public/private
- [ ] Browse public collections from other users

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
4. **NASA API returns max 25 photos per call** — use a "Load more" button to paginate.
5. **Supabase free tier**: 500MB database, 50k MAU — more than enough.
6. **Always run `npm run deploy`** to publish changes to GitHub Pages.

---

## Common Patterns

### Fetching NASA photos
```js
export async function getLatestPhotos(rover) {
  const url = `${BASE}/rovers/${rover}/latest_photos?api_key=${KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`NASA API error: ${res.status}`)
  const data = await res.json()
  return data.latest_photos
}
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
# Edit .env with your NASA key + Supabase URL + anon key
npm run dev
```

---

*Last updated: project start. Update this file as the project evolves.*