## NASA API reliability: `latest_photos` and `earth_date`

The NASA `latest_photos` endpoint can be empty or flaky. The `photos?earth_date=...` path can return `404` when there are no images for that Earth date (not always an empty JSON array).

`getLatestPhotos()` now prefers:

1. `latest_photos` when it returns photos.
2. Otherwise `GET /manifests/{rover}` for `max_sol`, then `GET /rovers/{rover}/photos?sol=...`, walking back up to 30 sols if needed.

Sol-based queries match the documented API and are more reliable than Earth-date walks in practice.

## NASA outage + UI development

When `api.nasa.gov` is down, `getLatestPhotos()` falls back to a small hardcoded list of `mars.nasa.gov` image URLs shaped like NASA API photo objects so grids still render.

## Supabase Auth + profiles

Use `onAuthStateChange` and treat `INITIAL_SESSION` like a restored login so `profiles` is ensured after refresh, not only on `SIGNED_IN`.

