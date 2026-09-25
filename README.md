# Grocery Planner

A household grocery & meal planner PWA backed by Supabase: pantry stock tracking with expiry awareness, a weekly meal planner, a to-buy wishlist that turns purchases into stock, purchase history, saved recipes, and an optional daily push notification with today's meal plan.

No accounts — the app assumes one shared household dataset behind a single Supabase project.

## Features

- **Groceries** — inventory with expiry tracking, quantity units, purchase history, and a to-buy list. Buying a wishlist item turns it into stock.
- **Planner** — weekly meal plan (Mon-based) with breakfast/lunch/dinner slots, drag-and-drop rescheduling, per-meal ingredient allocation against available stock, and a per-meal wishlist for anything not in the pantry. Cooking a meal deducts its ingredients (FEFO) in the database.
- **Recipes** — reusable meal templates saved from the planner (or built from scratch). Applying a recipe to the planner reserves available stock and wishlists the shortfall in one step.
- **Daily notification** — optional web push at a configured local time summarizing today's planned meals.
- **PWA** — installable; the app shell works offline (Supabase traffic is never cached).

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Supabase (Postgres + Storage + Edge Functions + pg_cron) · `vite-plugin-pwa` · oxlint

## Getting started

Prerequisites: Node 22+ and npm.

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard, enable the **pg_cron** extension (Database → Extensions). This must be done before the next step, as pg_cron cannot be created from the SQL editor.
3. Open the **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates all tables, RPC functions, RLS policies, storage bucket, and the two pg_cron jobs (`daily-meal-push` every 15 minutes, `grocery-maintenance` nightly at 04:17 UTC).

### 2. Configure environment variables

Copy your **Project URL** and **publishable key** (starts with `sb_publishable_`) from the dashboard's **Connect** button, then create `.env.local` in the project root:

```sh
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`.env.local` is gitignored; [.env.production](.env.production) holds the deployed project's credentials for the GitHub Pages build. Without env vars the app shows a setup screen instead of crashing.

### 3. Run

```sh
npm install
npm run dev
```

## Daily push notifications (optional)

The notification feature needs the `send-meal-push` Edge Function and VAPID keys:

1. Generate a VAPID key pair: `npx web-push generate-vapid-keys`.
2. Deploy the Edge Function with the [Supabase CLI](https://supabase.com/docs/guides/functions) and set its secrets:
   ```sh
   supabase functions deploy send-meal-push
   supabase secrets set \
     VAPID_PUBLIC_KEY=<public key> \
     VAPID_PRIVATE_KEY=<private key> \
     VAPID_SUBJECT="mailto:you@example.com" \
     PUSH_ALLOWED_KEY=<same publishable key as the app>
   ```
3. Set `VITE_VAPID_PUBLIC_KEY` in the app's env (`.env.local` / `.env.production`) to the same public key.
4. The `daily-meal-push` pg_cron job installed by `schema.sql` wakes the function every 15 minutes. In your own project, replace the function URL and publishable key embedded in that job's `net.http_post` call (bottom of `schema.sql`) with your own values, then re-run the file.
5. Enable notifications in the app: Settings → daily notification toggle. Use "Send test" to verify delivery without waiting for the schedule.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run lint` | oxlint |
| `npm run build` | `tsc -b && vite build` — the typecheck gate |
| `npm run preview` | Preview the production build |

## Deployment

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): `npm ci` → `npm run build` → GitHub Pages. The build requires `base: '/groceryplanner/'` in [`vite.config.ts`](vite.config.ts) for the Pages subpath — don't remove it.

## PWA notes

The service worker is hand-written at [`src/sw.ts`](src/sw.ts) (workbox precaching plus `push` / `notificationclick` handlers). Tapping a notification opens the app on the planner tab. Manifest icons are generated from [`public/favicon.svg`](public/favicon.svg) with `npx @vite-pwa/assets-generator public/favicon.svg` after changing it.

## Architecture

Detailed architecture notes for contributors (schema conventions, RPC semantics, photo storage lifecycle, frontend data flow) live in [AGENTS.md](AGENTS.md).
