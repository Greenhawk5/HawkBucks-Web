# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File                     | URL                                                     |
| ------------------------ | ------------------------------------------------------- |
| `index.tsx`              | `/`                                                     |
| `about.tsx`              | `/about`                                                |
| `users/index.tsx`        | `/users`                                                |
| `users/$id.tsx`          | `/users/:id` (dynamic — bare `$`, no curly braces)      |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment)                  |
| `files/$.tsx`            | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx`            | layout route (renders children via `<Outlet />`)        |
| `__root.tsx`             | app shell — wraps every page; preserve `<Outlet />`     |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.

## Locale-prefixed routes (Phase 6)

Bare URLs (`/`, `/about`, `/vbucks-missions`, `/missions-guide`) are the English
default-language canonicals AND the `x-default` targets. Each page also has
locale-prefixed alternates under `src/routes/$locale/` (`/$locale/`,
`/$locale/about`, `/$locale/vbucks-missions`, `/$locale/missions-guide`) using the exact `LanguageCode`
(`en es fr ru de pt zh ar-SA fa-IR`).

- Locale routes are self-canonical; bare routes are self-canonical.
- Bare-route `head()` is always English (deterministic per URL, never
  cookie-dependent); locale-route `head()` uses its URL locale.
- `beforeLoad` redirects miscased locale params (`/ES/about`) to the
  canonical form and unknown codes (`/xx`) to the bare URL.
