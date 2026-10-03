/**
 * Phase 23 — per-request CSP nonce store (CLIENT-SAFE: zero imports).
 *
 * WHY THIS MODULE HAS NO IMPORTS
 * ------------------------------
 * `src/router.tsx` is the router entry for BOTH the SSR bundle and the browser
 * bundle, so it must be able to call `readCspNonce()` without dragging server
 * code (or `node:async_hooks`) into the browser. This module therefore imports
 * nothing at all: no `@tanstack/react-start/server-only` marker (which would
 * make the client build fail) and no Node built-ins.
 *
 * WHY AN ASYNC CONTEXT STORE
 * --------------------------
 * The nonce must be the SAME value in two places produced at different points of
 * one request:
 *
 *   1. inside the SSR HTML — TanStack Router reads `router.options.ssr.nonce`
 *      inside `getRouter()`, which `createStartHandler` calls lazily while it
 *      renders;
 *   2. in the `Content-Security-Policy` response header — applied afterwards in
 *      `src/server.ts`, once the streamed `Response` exists.
 *
 * A plain module-level variable would be a data race: a Workers isolate serves
 * many requests concurrently, so a shared mutable `let` could leak request A's
 * nonce into request B's markup — which would break BOTH responses (each markup
 * would carry a nonce its own CSP header does not list).
 *
 * The store is therefore pluggable: `src/lib/csp-nonce.server.ts` (server-only)
 * constructs a real `AsyncLocalStorage` and installs it here at module load. In
 * the browser that module is never imported, no store is installed, and
 * `readCspNonce()` simply returns `undefined` — which `src/router.tsx` treats as
 * "no nonce available" and omits `ssr.nonce` entirely.
 *
 * This is the SAME request-scoping idea the codebase already depends on for
 * Cloudflare bindings — see src/services/missions.server.ts, which resolves
 * `env.HAWKBUCKS_API` through TanStack's request-scoped storage rather than a
 * global. No process-wide state is involved.
 *
 * RANDOMNESS
 * ----------
 * `crypto.getRandomValues` is the Web Crypto CSPRNG, present in Workers, Node and
 * browsers. `Math.random()`, `Date.now()`, counters and hashes of guessable input
 * are NOT used — a predictable nonce is equivalent to no nonce at all. 16 bytes
 * = 128 bits, OWASP's recommended minimum for CSP nonces.
 */

/** 16 bytes = 128 bits of entropy (OWASP minimum for CSP nonces). */
const NONCE_BYTES = 16;

/** The async-context-scoped store installed by csp-nonce.server.ts. */
export interface CspNonceStore {
  getStore(): string | undefined;
  run<T>(value: string, fn: () => T): T;
}

let installedStore: CspNonceStore | undefined;

/**
 * Install the request-scoped nonce store.
 *
 * Server-only: called once at module load by `src/lib/csp-nonce.server.ts`.
 * In the browser this is never called, so the nonce path stays inert and
 * `router.tsx` falls back to its pre-Phase-23 configuration.
 */
export function installCspNonceStore(store: CspNonceStore): void {
  installedStore = store;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  // `btoa` exists in Workers, browsers and Node >= 16.
  return btoa(binary);
}

/**
 * Generate a fresh, cryptographically random CSP nonce.
 *
 * 128 bits of entropy, base64-encoded so it is a valid CSP `base64-value`
 * token. Returns a different value on every call by construction — there is no
 * caching, seeding, or reuse anywhere in this module.
 */
export function generateCspNonce(): string {
  const bytes = new Uint8Array(NONCE_BYTES);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

/**
 * Run `fn` with `nonce` bound to the current async request scope.
 *
 * Anything awaited inside `fn` — including the lazy `getRouter()` call inside
 * TanStack's `createStartHandler` — observes this exact value through
 * `readCspNonce()`, so the CSP header and the rendered markup can never drift.
 *
 * When no store is installed (browser, bare unit tests) this simply invokes
 * `fn`; `readCspNonce()` then returns `undefined`, which callers treat as "no
 * nonce available" rather than an error.
 */
export function runWithCspNonce<T>(nonce: string, fn: () => T): T {
  return installedStore ? installedStore.run(nonce, fn) : fn();
}

/**
 * Read the nonce bound to the current request scope.
 *
 * Returns `undefined` outside a request scope. Callers MUST tolerate that:
 * `src/router.tsx` omits `ssr.nonce` entirely in that case, which restores the
 * exact pre-Phase-23 router configuration instead of crashing.
 */
export function readCspNonce(): string | undefined {
  return installedStore?.getStore();
}
