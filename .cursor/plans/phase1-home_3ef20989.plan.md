---
name: phase1-home
overview: Implement the Phase 1 Home page (dark theme, Mars red accent) showing NASA “latest” rover photos for Curiosity and Perseverance with a photo grid and skeleton loaders while fetching. Wire it into the app entry/router using the structure described in `CLAUDE.md`.
todos:
  - id: phase1-structure
    content: "Create missing Phase 1 structure: `src/router.js`, `src/pages/Home.js`, `src/components/RoverGallery.js`, `src/components/PhotoCard.js`, and `src/nasa.js`."
    status: completed
  - id: phase1-fetch
    content: Implement NASA `getLatestPhotos(rover)` in `src/nasa.js` (use `VITE_NASA_API_KEY` or fallback to `DEMO_KEY`) and fetch both rovers concurrently in `src/pages/Home.js` with `photos.slice(0, 12)`.
    status: completed
  - id: phase1-skeleton-ui
    content: Add skeleton loader UI (12 placeholders per rover) and swap to real photo grids on success; show a non-blocking error state per rover on failure.
    status: completed
  - id: phase1-styles
    content: "Update `src/style.css` to a dark-only Mars theme: accent `#c1440e`, responsive `photoGrid`, and skeleton shimmer animation."
    status: completed
  - id: phase1-wireup
    content: Replace starter `src/main.js` content to mount the router and default route to `#/home` (hash-based).
    status: completed
  - id: phase1-verify
    content: Run `npm run build` (and optionally `npm run dev`) to verify no runtime/module errors and that the Home page renders.
    status: completed
isProject: false
---

## Goal

Build `#/home` to display Curiosity + Perseverance “today’s” rover photos (per user choice: NASA `latest_photos` endpoint) in a responsive photo grid (12 thumbnails per rover) with skeleton placeholders while data loads.

## Implementation approach

The repo currently contains only the Vite starter (`src/main.js`, `src/style.css`, `src/counter.js`). This Phase 1 work will:

- Introduce the missing app structure described in `CLAUDE.md` (router, NASA API helper, Home page, and small components).
- Replace the starter UI in `src/main.js` with a minimal hash-router mounting `src/pages/Home.js`.
- Update `src/style.css` to a dark theme with Mars-red accent `#c1440e`, plus skeleton loader CSS and responsive grid styling.

### Data flow

```mermaid
graph TD
  Main[main.js] --> Router[router.js]
  Router --> Home[pages/Home.js]
  Home --> NASA[nasa.js (latest photos)]
  NASA --> Home
  Home --> Gallery[components/RoverGallery.js]
  Gallery --> Card[components/PhotoCard.js]
```



## What to build

1. Routing / app bootstrap
  - Create `src/router.js` exporting `initRouter()`.
  - Parse `location.hash` and route `#/home` (and default) to `pages/Home.js`.
  - Update `src/main.js` to call the router init.
2. NASA API helper
  - Create `src/nasa.js` with:
    - `getLatestPhotos(rover)` using base `https://api.nasa.gov/mars-photos/api/v1` and `import.meta.env.VITE_NASA_API_KEY`.
    - Fallback to `DEMO_KEY` if `VITE_NASA_API_KEY` is empty.
  - Home will slice to 12 items per rover: `photos.slice(0, 12)`.
3. Home page UI
  - Create `src/pages/Home.js` rendering:
    - Header area (app title + subtext).
    - Two rover sections: Curiosity and Perseverance.
    - Each rover section uses `RoverGallery` to show either skeletons (loading) or the photo grid.
  - Fetch both rovers concurrently (e.g., `Promise.allSettled`) so one failure doesn’t block the other.
  - Skeleton loaders:
    - While fetching, render a 12-card skeleton grid per rover.
    - Swap to real images when each rover resolves.
4. Components
  - `src/components/RoverGallery.js`
    - Props: `{ roverKey, roverLabel, photos, loading, error, skeletonCount }`.
    - Renders rover title and a grid.
    - Uses `PhotoCard` to render each photo.
  - `src/components/PhotoCard.js`
    - Renders the thumbnail with `loading="lazy"` and an `alt` string derived from rover name + camera name.
5. Styling (dark-only)
  - Update `src/style.css` with:
    - Dark background, text, panels, borders.
    - Accent color `#c1440e`.
    - Responsive `photoGrid` (1 column mobile, 2 on tablet, 3+ on desktop).
    - Skeleton shimmer animation for placeholder cards.

## File-level changes (high confidence)

- Update: `[src/main.js](src/main.js)` (remove starter UI and mount router)
- Update: `[src/style.css](src/style.css)` (dark theme, grid, skeletons)
- Add: `[src/router.js](src/router.js)`
- Add: `[src/nasa.js](src/nasa.js)`
- Add: `[src/pages/Home.js](src/pages/Home.js)`
- Add: `[src/components/RoverGallery.js](src/components/RoverGallery.js)`
- Add: `[src/components/PhotoCard.js](src/components/PhotoCard.js)`

## Acceptance criteria

- Visiting the app at `#/home` shows two grids labeled “Curiosity” and “Perseverance”.
- During fetch, each grid shows 12 skeleton cards (no blank white flash).
- After fetch, skeletons are replaced by real thumbnails (with `loading="lazy"`).
- Theme is dark-only with Mars red accent and a clean responsive grid.

