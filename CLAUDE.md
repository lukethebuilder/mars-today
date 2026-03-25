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