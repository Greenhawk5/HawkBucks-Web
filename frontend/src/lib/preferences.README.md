# Phase 3 — Preference foundation

Centralized, SSR-safe user preferences. One system — not scattered cookie /
localStorage logic per component.

## What exists

| Preference | Type | Default | Persisted in | Server-readable |
| --- | --- | --- | --- | --- |
| `language` | `LanguageCode` (`en`…`fa-IR`) | `en` | cookie `hawkbucks_language` | yes |
| `sidebar.state` | `expanded` \| `collapsed` | `expanded` | cookie `hawkbucks_sidebar_state` (values `open` \| `closed`, Phase 2 format kept) | yes |
| `welcome.completed` | `boolean` | `false` | localStorage `hawkbucks.welcome.completed` | no |
| `notifications.enabled` | `boolean` | `false` | localStorage `hawkbucks.notifications.enabled` | no |

Contracts only for language / welcome / notifications — no selector, modal,
permission prompt, service worker, or push code in this phase.

## Why this persistence split

- **Cookies for SSR-relevant state.** Server HTML and the first client paint
  must agree on the sidebar width and (future) document language; only the
  Cookie header is visible during SSR, so `language` and `sidebar` live
  there (`parseServerPreferences`).
- **localStorage for client-only state.** `welcome` / `notifications` never
  affect SSR output, so reading them lazily in effects avoids hydration
  cost and mismatch risk entirely.

## SSR / hydration safety

- `lib/preferences.ts` touches no browser APIs at module scope or during
  render. Browser access lives in effect/event-handler helpers
  (`read*FromDocumentCookie`, `readStoredFlag`, `write*`).
- Hooks seed `useState` from the SSR loader value, then reconcile with the
  live store post-hydration. Identical seed ⇒ identical first paint.
- All parsers (`parseLanguage`, `parseSidebarState`, `parseStoredFlag`,
  cookie readers) fall back to defaults on invalid input and never throw.

## Backward compatibility

The legacy `hawkbucks_sidebar_state=open|closed` cookie is parsed verbatim
(`parseSidebarCookie` preserved) and written back in the same format, so
existing users keep their sidebar state with no migration step.
`parseSidebarState` additionally accepts `expanded|collapsed` and booleans
for forward compatibility.

## For future phases

- Read/seed SSR state: `loadServerPreferences` /
  `serverPreferencesQueryOptions` (`lib/preferences.loader.ts`); root loader
  passes `initialPreferences` to `AppShell`.
- Client read/write: `useSidebarPreference`, `useLanguagePreference`,
  `useWelcomePreference`, `useNotificationsPreference`
  (`hooks/use-preferences.ts`).
- Never import cookie names, storage keys, or `preferences.server.ts` from
  components. Legacy `lib/sidebar-*` modules re-export this layer and are
  deprecated (kept only for import compatibility).
