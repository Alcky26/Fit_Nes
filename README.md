# Fitness Tracker

A private, offline-first personal fitness tracker. 100% client-side — no
backend, no account, no telemetry. All data lives in IndexedDB on your
device; you control export/import.

## Updating from an older version

Your data lives in IndexedDB under the site's origin, so deploying a new
version to the same GitHub Pages URL keeps it. New features only add
*optional* fields (for example an exercise's target reps and rest time);
the database version is unchanged and no migration runs. Exercises, sets
and entries saved by an older version load exactly as before, and old JSON
backups still import. As a precaution, export a JSON backup from Settings
before deploying any update.

## Stack

React + TypeScript + Vite, IndexedDB (via `idb`), React Router (Hash
routing), Recharts, `vite-plugin-pwa`. See the architecture notes from
project chat for why each was chosen.

## Local development

```bash
npm install
npm run dev
```

`npm install` generates `package-lock.json` on first run — commit that file.
The CI workflow currently uses `npm install` (not `npm ci`) and doesn't
cache dependencies, specifically because no lockfile was committed yet.
Once one is, switch `.github/workflows/deploy.yml`'s install step back to
`npm ci` and re-add `cache: npm` to `actions/setup-node@v4` for faster,
fully reproducible CI installs.

## Build

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

The `tsc -b` project-reference graph (composite/emit settings across
`tsconfig.json` and `tsconfig.node.json`) has been validated against the
real TypeScript compiler, not just read by eye.

## Tests

```bash
npm test
```

18 test files covering repositories (including the delete+undo/trash flow),
the analytics engine (daily/weekly/monthly/yearly, personal records,
exercise progress, calendar/period date math — with explicit leap-year and
timezone-safety cases), backup export/import (encode/decode round-trip,
merge semantics, and resilience to a single photo failing to encode),
CSV export, form components, and the app shell.

## Development phases

Tracking progress against the full project plan. Each phase keeps the app
runnable.

- [x] Phase 1 — Foundation (project setup, routing, types, styling)
- [x] Phase 2 — Database (IndexedDB schema, migrations, repositories)
- [x] Phase 3 — Exercises (CRUD, photos, custom statistics)
- [x] Phase 4 — Workouts (sessions, entries, sets, notes, undo)
- [x] Phase 5 — Dashboard
- [x] Phase 6 — Analytics engine (daily/weekly/monthly/yearly)
- [x] Phase 7 — Personal records & improvement calculations
- [x] Phase 8 — Exercise progress & period comparisons
- [x] Phase 9 — History & calendar
- [x] Phase 10 — Backup (JSON/CSV export/import, photo backup)
- [x] Phase 11 — PWA (manifest, service worker, offline, icons)
- [x] Phase 12 — GitHub Pages + GitHub Actions deployment
- [x] Phase 13 — Testing, accessibility, performance, polish

## Installing as a PWA

Once deployed (or running a production build locally via `npm run preview`),
the app is installable:

- **Android / desktop Chrome or Edge**: an install icon appears in the
  address bar, or use the **Install App** button in Settings.
- **iPhone/iPad (Safari)**: tap **Share**, then **Add to Home Screen** —
  iOS doesn't support the automatic install prompt.

After installing, the app shell and static assets are precached by the
service worker, so opening the app — and recording a workout — never
requires a network connection. `npm run dev` intentionally does not run
the service worker (`devOptions.enabled: false` in `vite.config.ts`), so
test PWA/offline behavior against a production build, not the dev server.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment → Source**: select
   **GitHub Actions** (not "Deploy from a branch").
3. Push to `main` — `.github/workflows/deploy.yml` installs, runs the test
   suite, builds, and deploys automatically. You can also trigger it
   manually from the **Actions** tab (`Run workflow`).
4. The live URL appears in the deploy job summary and under
   **Settings → Pages**: `https://<username>.github.io/<repo>/`.
5. Because the app uses a relative Vite `base` and hash-based routing,
   routes look like `.../#/exercises` — this is expected, and it's what
   lets the same build work from any repo name/subpath without extra
   config.

## Privacy

No analytics, ads, or tracking. No workout data ever leaves your device
except through backups you explicitly export.
