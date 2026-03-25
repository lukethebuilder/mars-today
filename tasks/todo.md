# Phase 1 — Home Page (Curiosity + APOD)

## Goal
Build `#/home` with **Curiosity** Mars rover photos (`raw_image_items`) and **From the Universe** — random **APOD** images (`planetary/apod?count=16`, image-only, 12 shown) — each in a responsive grid with skeleton loaders.

**Note:** Mars 2020 raw-image queries via `raw_image_items` were **abandoned** — NASA’s filters returned no usable data; the second Home column was replaced by APOD.

## Approach
- Hash router, NASA helpers in `src/nasa.js`, Home + `RoverGallery` / `PhotoCard`.
- Fetch Curiosity + APOD concurrently; `usedMock` + banner + SAMPLE badges on fallback.
- Dark Mars styling, accent `#c1440e`.

## Checklist
- [x] `phase1-structure`: Phase 1 structure (`router`, `Home`, `RoverGallery`, `PhotoCard`, `nasa.js`).
- [x] `phase1-fetch`: `getLatestPhotos('curiosity')` + `getAPODPhotos()` with 12 items.
- [x] `phase1-skeleton-ui`: Skeleton loader UI and non-blocking error state.
- [x] `phase1-styles`: Dark Mars theme, responsive photo grid, skeleton shimmer.
- [x] `phase1-wireup`: `main.js` + default `#/home`.
- [x] `phase1-verify`: `npm run build`.

## Follow-up: NASA outage mock + Phase 2 auth
- [x] `nasa-mock`: Curiosity mock uses NASA Images JPEGs; APOD mock uses `MOCK_APOD_PHOTOS` (`apod.nasa.gov` URLs); banner when `usedMock`.
- [x] `phase2-supabase`: `src/supabase.js` + `isSupabaseConfigured()`.
- [x] `phase2-auth-ui`: `Auth.js`, `Nav.js`.
- [x] `phase2-profile`: `auth.js` + `profiles` on sign-in.
- [x] `phase2-shell`: `main.js` renders `#navMount` + `#pageMount`.

## Home UX (onboarding + polish)
- [x] Curiosity card hover: unique line per photo (`CAMERA · Sol n · date`); APOD keeps title-only hover.
- [x] APOD **↻ New selection** refresh (subtle mono) re-fetches `getAPODPhotos()` with skeletons.
- [x] Welcome strip (3 columns / stack on mobile) explaining Mars feed, APOD archive, favourites.
- [x] Section bridge copy between Curiosity and APOD.
- [x] Logged-out sign-up nudge under Curiosity header (link opens auth modal); hidden when signed in.
- [x] **Favourites (Phase 3 slice):** heart buttons on home grids when signed in + Supabase configured; `favourites` table; `#/favourites` page; nav link. Collections still Phase 4.

## Phase 3 — Comments + Phase 4 — Collections (one pass)

- [x] `src/comments.js`: batch counts, fetch with author names, post, delete.
- [x] `src/components/PhotoModal.js`: image, metadata, heart, 📁 collections popover, comments, ESC/backdrop close.
- [x] `PhotoCard` + `RoverGallery` + `Home` + `Favourites`: comment badges, modal open on card click, batch counts.
- [x] `src/collections.js`: list mine, community, counts, membership, create, toggle public.
- [x] `src/pages/Collection.js`: `#/collections` list + `#/collections/:id` detail + community section.
- [x] `router.js`, `Nav.js`, `style.css`, `CLAUDE.md` checkboxes; `npm run build`.

## Phase 1 — Rover browse (remaining checklist items)

- [x] `#/rover/curiosity` — `routeUtils.js`, `Rover.js`, `SolPicker.js`, `nasa.js` helpers (`fetchCuriosityPageBySol`, Earth-date search, camera list).
- [x] Nav + Home link to Curiosity browse; `npm run build`.
