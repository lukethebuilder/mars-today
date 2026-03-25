## Home `renderHome` must paint before `await`

The router clears `#pageMount` then calls `renderHome()` (async). If `renderHome` **awaits** `supabase.auth.getSession()` before the first `renderPage()`, the main area stays empty until the network returns (or forever if the call hangs/fails). **Call `renderPage()` synchronously first**, then await session and re-render.

## Never `await getSession()` before NASA fetches or nav paint

If `getSession()` is slow or hangs (bad Supabase URL, network, ad blocker), code that ran **after** `await getSession()` never runs — **Curiosity/APOD grids stay on skeletons forever**. **Nav** that waited on `getSession()` before `innerHTML` stayed **empty**. Fix: paint **nav** and **home** immediately; call `getSession()` with `.then()` only. Start `getLatestPhotos` / `getAPODPhotos` **without** waiting on Supabase.

## Mars 2020 `raw_image_items` — abandoned on Home

NASA’s Mars 2020 raw image API filters (`condition_1`, `mission=`, etc.) often returned **empty `items`** or **wrong-mission rows**. The second Home column was removed and replaced with **APOD** (`getAPODPhotos()`, `VITE_NASA_API_KEY`) — random space imagery, image-only (drop `media_type === 'video'`).

## NASA API reliability: `latest_photos` and `earth_date`

The NASA `latest_photos` endpoint can be empty or flaky. The `photos?earth_date=...` path can return `404` when there are no images for that Earth date (not always an empty JSON array).

`getLatestPhotos()` now prefers:

1. `latest_photos` when it returns photos.
2. Otherwise `GET /manifests/{rover}` for `max_sol`, then `GET /rovers/{rover}/photos?sol=...`, walking back up to 30 sols if needed.

Sol-based queries match the documented API and are more reliable than Earth-date walks in practice.

## NASA outage + UI development

When `api.nasa.gov` is down, `getLatestPhotos()` falls back to a small hardcoded list of **NASA Images** (`images-assets.nasa.gov`) JPEGs — same public archive as NASA.gov — so `<img>` thumbnails load reliably (hotlink/CORS issues on some `mars.nasa.gov` raw paths). The Home page shows a dismissible amber banner when `usedMock` is true.

## Supabase Auth + profiles

Use `onAuthStateChange` and treat `INITIAL_SESSION` like a restored login so `profiles` is ensured after refresh, not only on `SIGNED_IN`.

**Do not `await` inside `onAuthStateChange`.** GoTrueClient `await`s each subscriber callback before finishing `signInWithPassword`. An `async` handler that `await ensureProfile()` blocks sign-in until PostgREST returns — slow or hanging DB calls make the modal submit look stuck (button disabled). Run `void ensureProfile().catch(...)` instead.

## `getSession().catch()` must not sign the user out

If `supabase.auth.getSession()` rejects (transient network, client glitch), a `.catch` that sets `userLoggedIn = false` hides hearts and favourites UI **even when the session is still valid** (nav can still show the email). **Log the error only**; optionally `queueMicrotask` a second sync after attaching `mars-auth` so INITIAL_SESSION is not missed.

