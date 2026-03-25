# Phase 1 — Home Page (Curiosity + Perseverance)

## Goal
Build `#/home` to display Curiosity + Perseverance “today’s” rover photos in a responsive photo grid (12 thumbnails per rover) with skeleton placeholders while photos fetch.

## Approach
- Add the missing Phase 1 structure: hash router, NASA API helper, Home page, and small UI components.
- Fetch both rover feeds concurrently from the real NASA API (`latest_photos` → manifest + sol); if the API is down, use hardcoded `mars.nasa.gov` mocks.
- Show a skeleton grid while loading; replace skeletons with real thumbnails on success; show a per-rover error panel on failure.
- Enforce dark-only Mars styling with Mars red accent `#c1440e`.

## Checklist
- [x] `phase1-structure`: Create missing Phase 1 structure (`src/router.js`, `src/pages/Home.js`, `src/components/RoverGallery.js`, `src/components/PhotoCard.js`, `src/nasa.js`).
- [x] `phase1-fetch`: Implement `getLatestPhotos(rover)` and fetch both rovers concurrently with 12 items.
- [x] `phase1-skeleton-ui`: Skeleton loader UI and non-blocking error state.
- [x] `phase1-styles`: Dark-only Mars theme, responsive photo grid, skeleton shimmer animation.
- [x] `phase1-wireup`: Replace starter `src/main.js` to mount the router and default route `#/home`.
- [x] `phase1-verify`: Run `npm run build` to verify no module/runtime errors.

## Follow-up: NASA outage mock + Phase 2 auth
- [x] `nasa-mock`: When the NASA API fails, `getLatestPhotos()` returns 3–4 hardcoded `mars.nasa.gov` image URLs per rover (API still attempted first).
- [x] `phase2-supabase`: Add `src/supabase.js` client + `isSupabaseConfigured()`.
- [x] `phase2-auth-ui`: Add `src/components/Auth.js` (email/password sign-in + sign-up modal) and `src/components/Nav.js`.
- [x] `phase2-profile`: `src/auth.js` ensures a `profiles` row on `SIGNED_IN` / `INITIAL_SESSION`.
- [x] `phase2-shell`: `main.js` renders `#navMount` + `#pageMount`; router targets `#pageMount`.

