# Phase 1 — Home Page (Curiosity + Perseverance)

## Goal
Build `#/home` to display Curiosity + Perseverance “today’s” rover photos in a responsive photo grid (12 thumbnails per rover) with skeleton placeholders while photos fetch.

## Approach
- Add the missing Phase 1 structure: hash router, NASA API helper, Home page, and small UI components.
- Fetch both rover feeds concurrently from NASA’s `latest_photos` endpoint.
- Show a skeleton grid while loading; replace skeletons with real thumbnails on success; show a per-rover error panel on failure.
- Enforce dark-only Mars styling with Mars red accent `#c1440e`.

## Checklist
- [x] `phase1-structure`: Create missing Phase 1 structure (`src/router.js`, `src/pages/Home.js`, `src/components/RoverGallery.js`, `src/components/PhotoCard.js`, `src/nasa.js`).
- [x] `phase1-fetch`: Implement `getLatestPhotos(rover)` and fetch both rovers concurrently with 12 items.
- [x] `phase1-skeleton-ui`: Skeleton loader UI and non-blocking error state.
- [x] `phase1-styles`: Dark-only Mars theme, responsive photo grid, skeleton shimmer animation.
- [x] `phase1-wireup`: Replace starter `src/main.js` to mount the router and default route `#/home`.
- [x] `phase1-verify`: Run `npm run build` to verify no module/runtime errors.

## Follow-up: NASA `latest_photos` fallback
- [x] Update `src/nasa.js#getLatestPhotos()` to fall back to `photos?earth_date=...` and walk back up to 10 days.

