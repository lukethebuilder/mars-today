# Scope Alignment (Mars Today)

This repo has moved to the simplified scope in `CLAUDE.md`:

- `#/home` is the Curiosity rover sol browser (hero strip → sol controls → photo grid).
- `#/apod` has been removed (APOD route/page/nav no longer exists).
- Comments are removed entirely from the UI and code (`src/comments.js` deleted).
- Collections are personal only (no community section, no public toggle).
- The legacy `#/rover/curiosity` route/page has been removed.

## Checklist

- [x] `route-nav-apod`: remove `#/apod` route + nav link (so it 404s / shows Not Found)
- [x] `home-curiosity-refactor`: new `#/home` layout (sol prev/next + camera filter + load more)
- [x] `add-apod-page`: delete `src/pages/APOD.js` (APOD removed)
- [x] `remove-comments`: delete `src/comments.js` and remove comment UI/badges
- [x] `collections-personal-only`: remove community collections + public toggle
- [x] `remove-rover-page`: delete `src/pages/Rover.js`
- [x] `cleanup-verify`: remove leftover Earth-date UI (`SolPicker.js`), ensure no dead imports, run `npm run build`, smoke-test routes
