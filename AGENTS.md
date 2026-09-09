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

- No auth — one shared household dataset. RLS is enabled on all tables but with permissive anon+authenticated policies (kept so the Supabase security advisor stays quiet); RPC functions are security definer. Do not add auth.
- Schema lives in `supabase/schema.sql` and is applied manually via the Supabase SQL Editor. When changing tables/functions, update the file and re-run it in the dashboard. The app calls these Postgres functions via RPC (`src/lib/api.ts`): `get_or_create_item(text)`, `cook_meal(uuid)`, `uncook_meal(uuid)`, `purchase_wishlist(uuid[], double precision[], date, numeric)`, `remove_stock(uuid, double precision)`, `clear_inventory()`, `clear_purchases()`, `unit_in_use(text)`; the push Edge Function also calls `claim_daily_meal_plan(boolean)`.
- Stock deduction happens in the DB, not the client: `cook_meal` marks a meal cooked and consumes its allocations FEFO. Client-side inventory math (`src/lib/inventory.ts:computeInventory`) only excludes allocations belonging to cooked meals for display.
- Meal wishlist: `meal_wishlist` rows (unbought groceries chosen from `allowed_items` per meal) gate cooking — `cook_meal` raises if a meal has any. Buying an item in the Groceries tab's To-Buy List via `purchase_wishlist` turns its rows into stock entries + inventory allocations, logs the purchase, and deletes them.
- Purchase history is an immutable log, not derived from stock: the `purchases` table gets one row per To-Buy List purchase action (written only by `purchase_wishlist`, aggregated per item+unit with the name/unit snapshotted at purchase time). Rows are never updated — no consumed/removed statuses — and direct inventory additions are not logged. `clear_inventory()` and `clear_purchases()` each wipe only their own table.
- Meal recipe extras: `meals.recipe_url` / `meals.photo_path` / `meals.remarks` are optional per-meal fields edited in `AllocationModal`. Photos go to the public `meal-photos` storage bucket (bucket + anon policies in `schema.sql`) at `${mealId}/${timestamp}.jpg`; the client compresses images before upload (`src/lib/image.ts`) via `api.uploadMealPhoto`/`deleteMealPhoto`/`mealPhotoUrl` in `src/lib/api.ts`. Storage cleanup is the client's job — there is no DB trigger: every meal-delete path must pass the photo path(s) along (`deleteMeal(id, photoPath)`, `clearUncookedMeals(photoPaths)`, `clearCookedMeals(photoPaths)` → `deleteMealPhotos`), rows are deleted first so a failed storage call only leaves an orphan rather than a dangling `photo_path`. `api.cleanupOrphanedMealPhotos()` (Settings → "Meal photo storage", `StorageCleanupSection`) re-reads live meal ids and sweeps bucket folders whose name isn't a meal id.
- Env vars: `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (legacy fallback `VITE_SUPABASE_ANON_KEY`). `.env.production` is committed intentionally with real publishable credentials; `.env.local` (gitignored) is for local dev. Without env vars the app shows a setup screen (`App.tsx:SetupScreen`) instead of crashing.
- Daily meal push: `push_subscriptions` (one row per device) + `push_settings` (singleton: enabled, `HH:MM`, timezone, `last_sent_on`). A pg_cron + pg_net job (bottom of `schema.sql`) wakes the `send-meal-push` Edge Function (`supabase/functions/`) every 15 min; `claim_daily_meal_plan()` (timezone-aware, race-safe claim) returns today's meals (Mon=0 index, matching the planner) when a send is due. The function pushes via `web-push` (npm: import, runs under Edge Runtime Node compat). Edge Function secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (`npx web-push generate-vapid-keys`), `VAPID_SUBJECT` (mailto:), `PUSH_ALLOWED_KEY` (= publishable key; callers send it as `Authorization: Bearer`). Client subscribe/unsubscribe lives in `src/lib/push.ts`; the toggle UI is `src/components/DailyNotificationSection.tsx`. `VITE_VAPID_PUBLIC_KEY` must match the function's `VAPID_PUBLIC_KEY`.

## Frontend

- Tailwind v4, CSS-first config: no `tailwind.config.js`; theme/tokens go in `src/index.css` via `@theme`. Don't add a JS config file.
- No router — tab switching is plain `useState` in `src/App.tsx`. New views go in `src/components/` and are registered in `NAV_ITEMS` (`src/components/nav.tsx`).
- Data flow: `AppDataProvider` (`src/hooks/`) fetches all tables in parallel and exposes `useAppData()`. Mutations call `api.*` (in `src/lib/api.ts`) wrapped in `run(fn)`, which refreshes data and alerts on error. Use `run` for every mutation.
- Shared class strings live in `src/components/ui.ts` (`btnPrimary`, `inputCls`, etc.) — reuse them instead of restyling.
- PWA: `vite-plugin-pwa` in `vite.config.ts` uses the `injectManifest` strategy — the service worker is hand-written at `src/sw.ts` (workbox precaching + `push`/`notificationclick` handlers; tapping opens the app at `?tab=planner`, which `App.tsx` reads on load since there is no router). Manifest icons are PNGs generated from `public/favicon.svg` via `@vite-pwa/assets-generator` (config in `pwa-assets.config.ts`; run `npx @vite-pwa/assets-generator public/favicon.svg` after changing it). Supabase traffic is not cached; offline only serves the shell.

## Deploy

- Push to `main` triggers `.github/workflows/deploy.yml`: `npm ci` → `npm run build` → GitHub Pages. `base: '/groceryplanner/'` in `vite.config.ts` is required for the Pages subpath — don't remove it.