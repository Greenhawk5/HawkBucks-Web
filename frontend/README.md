# HawkBucks Frontend

The `frontend/` directory contains the React user interface for HawkBucks. It reads current missions, D1-backed history, and the deterministic daily quote from the Cloudflare Worker through the `HAWKBUCKS_API` Service Binding; it does not call Epic or any quote-generation service directly.

## Stack

- React 19 and TypeScript
- Vite and TanStack Start
- TanStack Router
- TanStack Query
- Tailwind CSS
- Radix UI components where used
- Lucide icons where used

## Routes

- `/` — Home dashboard and current mission overview.
- `/about` — HawkBucks information, V-Bucks mission explanation, and FAQ.
- `/vbucks-missions` — focused daily tracker and V-Bucks mission history.

SEO metadata, canonical information, Open Graph/Twitter metadata, robots behavior, and the sitemap are defined in the route/root implementation and public assets.

## API integration

Primary data is fetched server-side only:

- `src/services/missions.loader.ts` — TanStack Start server functions plus the TanStack Query options used by routes and components.
- `src/services/missions.server.ts` — server-only transport that talks to the HawkBucks Worker through the `HAWKBUCKS_API` Cloudflare Service Binding (configured in `wrangler.json`).

During the initial request the route loaders run on the server; during client-side navigation the same functions run on the app's own server via TanStack Start's same-origin server-function RPC, and the server fetches through the Service Binding. The browser never calls the public Worker API directly.

The Worker endpoints called through the binding:

- `/api/missions` for current normalized mission data.
- `/api/history` for D1-calculated period totals, mission counts, and comparisons.
- `/api/quote` for today’s deterministic daily quote.

The frontend exposes loading, unavailable, and error states rather than inventing mission/history/quote data.

## Environment

No frontend environment variables are required.

Do not place Epic credentials, Cloudflare secrets, or API keys in frontend environment variables.

## Canonical domain and the host redirects

`https://hawkbucks.com` is the canonical host. Both alias hosts are handled by
the server entry (`src/server.ts`) before any SSR runs, preserving path and
query string (the redirects are code-only and deploy with the app):

- `https://www.hawkbucks.com` — permanent 308 alias. The DNS record for `www`
  must point at this Worker for the redirect to receive traffic.
- `https://hawkbucks.pages.dev` — legacy Pages hostname, permanent 301 to the
  apex (Phase 10 domain migration). Kept host-scoped in code because Pages
  `_redirects` rules would also apply to the custom domain and loop.

## Development and checks

Requirements: Node.js 24 and npm.

```bash
npm ci
npm run dev
npm run lint
npm run build
npm run preview
npx prettier --check src
```

### Local development and the Worker transport

Production serves mission data through the `HAWKBUCKS_API` Service Binding
(`wrangler.json`), which only exists inside the Cloudflare runtime. The plain
Vite dev server runs in Node with no Cloudflare runtime, so the server-side
transport (`src/services/missions.server.ts`) falls back to a deterministic
server-only mock (`src/services/missions.local-dev.server.ts`):

- `npm run dev` just works — no configuration needed, no Worker required.
- The browser still talks only to the app's own server functions; it never
  calls the Worker directly, and no `VITE_*` variable or public API URL is
  involved.
- The mock returns fixed sample missions, history, and quote payloads shaped
  exactly like the real Worker responses, so Home, V-Bucks Missions,
  countdowns, and timezone rendering can be verified in a real browser.
- `HAWKBUCKS_LOCAL_MOCK_EMPTY=1 npm run dev` renders the empty-missions state.
- The fallback is fail-closed: inside the Cloudflare runtime (where
  `request.runtime.cloudflare` exists) a missing binding still throws instead
  of serving mock data, so production can never serve fake missions.

The production build creates the Vite/TanStack Start output used by the configured hosting deployment. The frontend does not deploy or configure the Worker.

### CMS local development (full Cloudflare runtime)

`npm run dev` is **public-only**: plain Vite/Node with no Cloudflare runtime.
Mission sections render through a deterministic server-only mock, but `/admin`
fails closed with "CMS database binding is not available" — by design (CMS
never falls back to mock data).

For CMS admin testing use the local Cloudflare runtime:

```bash
# one-time setup (from frontend/):
cp .dev.vars.example .dev.vars
node scripts/make-cms-admin-hash.mjs "your-local-password"  # paste output into .dev.vars
npm run cms:local:setup     # applies all worker/migrations to LOCAL D1 only
npm run dev:cloudflare      # preflights local D1, builds Pages artifact, starts wrangler pages dev
```

- `npm run dev:cloudflare` = full local Cloudflare runtime: builds the
  Pages artifact (`NITRO_PRESET=cloudflare-pages vite build`) then
  `wrangler pages dev dist` with CLI-bound local D1/R2
  (`--d1 DB=<local id> --r2 MEDIA_BUCKET=hawkbucks-media-local`) plus
  `.dev.vars` secrets, so `request.runtime.cloudflare.env` is populated.
  Wrangler prints the URL (default `http://localhost:8788`); open
  **`<url>/admin`**.
- **Local D1 binding is by ID, not name.** `pages dev` has no `--config`
  flag, and Miniflare keys local D1 storage by database **id**, so
  `dev-cloudflare.mjs` reads `database_id` from `wrangler.local.json` and
  passes `--d1 <binding>=<id>`. Passing the database *name* instead
  (`--d1 DB=hawkbucks-cms-local`) creates a **second, empty** local database:
  CMS then answers `D1_ERROR: no such table: cms_users` and the admin login
  form reports "Invalid credentials." If you ever see that, run
  `npm run cms:local:setup` and start via `npm run dev:cloudflare` (never a
  hand-written `--d1 DB=<name>`), or delete the stray
  `frontend/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` file
  that has no tables.
- **Local D1 schema preflight (fail fast).** `dev-cloudflare.mjs` probes the
  local D1 before building: it reads `d1_databases[0]` from
  `wrangler.local.json`, then checks that `cms_users` / `cms_sessions` exist in
  that exact store and that every `worker/migrations/*.sql` is recorded in its
  `d1_migrations`. When they are not, it **refuses to start**, names the
  database + id, and prints the fix (`npm run cms:local:setup`) — because the
  Pages runtime binds that same store and `/admin` would otherwise answer
  `D1_ERROR: no such table: cms_sessions` with opaque HTTP 500s. A missing
  `cms_sessions` is exactly the symptom of a fresh or wiped
  `frontend/.wrangler/state` (or a stray `--d1 DB=<name>` run). Only a
  positively detected gap blocks startup; an unreadable probe only warns, so a
  healthy setup is never blocked.
- **Scroll ownership (CMS).** The Control Center shell keeps ONE vertical scroll
  owner — the page column `.cc-shell-scroll` — inside a viewport-sized,
  `overflow-hidden` `.cc-root`. `src/styles.css` positions `<body>` for the
  public site, so any stray `position: absolute` element (Tailwind `sr-only`,
  e.g. a search-field label) would anchor to `<body>`, escape the shell clip,
  and give `<html>` a SECOND vertical scrollbar. `src/cms.css` therefore makes
  `.cc-root` a positioned containing block (`position: relative` in the
  `.cc-root` rule) so the clip always holds. Do not add another `overflow-y-auto`
  to CMS pages, and do not remove `overflow-y-auto` from the page column.
  Verify in the real engine with a local Chrome/Edge + running runtime:
  `npm run audit:cms-scroll` (uses throwaway LOCAL admin
  `cms-audit-temp` unless `HB_CMS_USER`/`HB_CMS_PASSWORD` are set; LOCAL D1
  only). The suite contract test is `test/cms-scroll-ownership.test.mjs`.
- Local D1 is **isolated from production**: database `hawkbucks-cms-local`
  (placeholder id in `wrangler.local.json`, local Miniflare state in
  `frontend/.wrangler/`). The production/shared id
  (`hawkbucks-data`) is never referenced. Production `wrangler.json` is
  untouched; nothing is deployed; no remote migration ever runs.
- Bootstrap: `ensureBootstrapAdmin()` creates the first admin from
  `CMS_ADMIN_USERNAME` / `CMS_ADMIN_PASSWORD_HASH` in `.dev.vars` **only
  when the local `cms_users` table is empty** (PBKDF2 envelope
  `pbkdf2$<iter>$<salt>$<hash>`, 10k–100k iterations). No default password
  exists; `.dev.vars` is gitignored — never commit real values.
- Sessions: 15-minute **inactivity** timeout (sliding `expires_at`,
  refreshed by every authenticated request, capped by the 12h absolute
  lifetime from login) + 12h absolute cap. Idle 15 min → next request gets
  the sign-in gate. Production password via `wrangler secret put`
  (never in source, `.env`, or bundles); local dev keeps `.dev.vars`.
- Turnstile (bot protection, OPTIONAL locally): leave
  `CMS_TURNSTILE_SITE_KEY` / `CMS_TURNSTILE_SECRET` unset in `.dev.vars`
  for password-only local login. To test the widget locally, create a
  widget at `dash.cloudflare.com → Turnstile`, set both keys in `.dev.vars`
  (secret via `wrangler secret put CMS_TURNSTILE_SECRET` in production —
  NEVER commit it). Both set = widget enforced, fail closed; exactly one
  set = login fails closed until fixed. Verification is server-side
  (`siteverify` endpoint, 8s timeout, single-use 5-min tokens); only the
  public site key reaches the browser.
- Login rate limits (defense in depth, app layer): 10 failures / 10 min per
  account + 30 failures / 10 min per IP (keyed ONLY on Cloudflare's
  `CF-Connecting-IP` — `X-Forwarded-For` is never read). Success resets the
  account counter; all rejections are the generic "Invalid credentials."
  These bound per-instance abuse — distributed botnets remain the job of
  Cloudflare WAF / rate-limiting rules in front of production.
- Media: local R2 bucket `hawkbucks-media-local` (Miniflare, isolated from
  production `hawkbucks-media`). **Limitation:** no public delivery exists
  locally (`R2_PUBLIC_BASE_URL` is a non-routable placeholder), so uploaded
  images store correctly in local D1 + local R2 but render as placeholder
  URLs until deployed. Production media architecture is unchanged.
- `HAWKBUCKS_API` service binding is **absent locally** (no local backend
  Worker wired): public mission/history/quote sections show their
  unavailable/empty states under `dev:cloudflare`; CMS admin (D1-direct) is
  fully usable. This is expected and documented, not a failure.
- Reset ONLY local CMS state: stop dev, then delete the local persist dir
  (`frontend/.wrangler/state/v3/d1`) or run
  `npx wrangler d1 execute hawkbucks-cms-local --local --config
  wrangler.local.json --command "DELETE FROM cms_users"` and re-run
  `npm run cms:local:setup` (idempotent). Production D1 is never affected.
  (`wrangler.local.json` is the local-only binding/migrations reference —
  wrangler 4 `pages dev` takes bindings via CLI flags, not `--config`.)

## Project layout

```text
src/components/   Shared UI and page components
src/routes/       TanStack file-based route definitions
src/services/     Server-side Worker transport, server functions, and response normalization
src/lib/          Types, mission helpers, and shared utilities
public/           Assets, robots.txt, sitemap.xml, site.webmanifest, and brand/social icons
```

For Worker, D1, cron, and production deployment instructions, see [../worker/README.md](../worker/README.md).
