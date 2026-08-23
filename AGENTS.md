# AGENTS.md

React 19 + Vite + TypeScript app (a household grocery planner) backed by Supabase. No test framework; verification is `lint` + `build`.

## Commands

- `npm run dev` — Vite dev server
- `npm run lint` — oxlint (`.oxlintrc.json`)
- `npm run build` — `tsc -b && vite build`; this is the typecheck gate, run it before finishing
- `npm run preview` — preview the production build

## TypeScript conventions (build will fail if violated)

- `verbatimModuleSyntax` is on: type-only imports must use `import type { ... }`
- `erasableSyntaxOnly` is on: no `enum`, `namespace`, or parameter properties
- `noUnusedLocals` / `noUnusedParameters` are on
- Imports use explicit extensions because `allowImportingTsExtensions` is on: `import App from './App.tsx'`

## Supabase

- No auth and no RLS — one shared household dataset, all tables have RLS disabled. Do not add auth.
- Schema lives in `supabase/schema.sql` and is applied manually via the Supabase SQL Editor. When changing tables/functions, update the file and re-run it in the dashboard. The app calls four Postgres functions via RPC: `get_or_create_item(text)`, `cook_meal(uuid)`, `uncook_meal(uuid)`, and `purchase_wishlist(uuid[], date, numeric)` (`src/lib/api.ts`).
- Stock deduction happens in the DB, not the client: `cook_meal` marks a meal cooked and consumes its allocations FEFO. Client-side inventory math (`src/lib/inventory.ts:computeInventory`) only excludes allocations belonging to cooked meals for display.
- Meal wishlist: `meal_wishlist` rows (unbought groceries chosen from `allowed_items` per meal) gate cooking — `cook_meal` raises if a meal has any. Buying an item in the Shopping tab's Meal Wishlist section via `purchase_wishlist` turns its rows into stock entries + inventory allocations and deletes them.
- Env vars: `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (legacy fallback `VITE_SUPABASE_ANON_KEY`). `.env.production` is committed intentionally with real publishable credentials; `.env.local` (gitignored) is for local dev. Without env vars the app shows a setup screen (`App.tsx:SetupScreen`) instead of crashing.

## Frontend

- Tailwind v4, CSS-first config: no `tailwind.config.js`; theme/tokens go in `src/index.css` via `@theme`. Don't add a JS config file.
- No router — tab switching is plain `useState` in `src/App.tsx`. New views go in `src/components/` and are registered in `NAV_ITEMS` (`src/components/nav.tsx`).
- Data flow: `AppDataProvider` (`src/hooks/`) fetches all four tables in parallel and exposes `useAppData()`. Mutations call `api.*` (in `src/lib/api.ts`) wrapped in `run(fn)`, which refreshes data and alerts on error. Use `run` for every mutation.
- Shared class strings live in `src/components/ui.ts` (`btnPrimary`, `inputCls`, etc.) — reuse them instead of restyling.
- PWA: `vite-plugin-pwa` in `vite.config.ts` generates the manifest + service worker (auto-update, precached app shell). Manifest icons are PNGs generated from `public/favicon.svg` via `@vite-pwa/assets-generator` (config in `pwa-assets.config.ts`; run `npx @vite-pwa/assets-generator public/favicon.svg` after changing it). Supabase traffic is not cached; offline only serves the shell.

## Deploy

- Push to `main` triggers `.github/workflows/deploy.yml`: `npm ci` → `npm run build` → GitHub Pages. `base: '/groceryplanner/'` in `vite.config.ts` is required for the Pages subpath — don't remove it.