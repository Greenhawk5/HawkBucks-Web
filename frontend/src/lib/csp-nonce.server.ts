/**
 * Phase 23 — SERVER-ONLY installer for the CSP nonce store (imported by
 * `src/server.ts` for its side effect).
 *
 * WHY THIS IS A SEPARATE MODULE
 * -----------------------------
 * `src/router.tsx` must be able to READ the nonce, and it is bundled for the
 * browser as well as the server. Importing `node:async_hooks` from the shared
 * `csp-nonce.ts` would drag a Node built-in into the client bundle (and the
 * `@tanstack/react-start/server-only` marker would fail the client build
 * outright). So the client-safe module owns the interface and this one supplies
 * the server implementation, keeping the dependency on `node:async_hooks`
 * confined to code that only ever runs in the Worker.
 *
 * `node:async_hooks` resolves under the `nodejs_compat` compatibility flag,
 * which `frontend/wrangler.json` sets — the same flag TanStack Start itself
 * relies on for its request-scoped storage.
 *
 * WHY ASYNC LOCAL STORAGE RATHER THAN A MODULE VARIABLE
 * ----------------------------------------------------
 * A Workers isolate serves requests concurrently, so a shared mutable `let`
 * would let one request's markup carry another request's nonce. Both pages
 * would then fail hydration, because each CSP header authorizes only its own
 * nonce. `AsyncLocalStorage` scopes the value to a single async execution
 * context, which is exactly one request.
 */
import "@tanstack/react-start/server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import { installCspNonceStore } from "./csp-nonce";

const nonceStorage = new AsyncLocalStorage<string>();

/**
 * Idempotent installer, called explicitly from `src/server.ts` at module load.
 *
 * This is deliberately NOT a bare side-effect import: the bundler may treat a
 * module whose exports are all unused as side-effect-free and drop the
 * `import "./lib/csp-nonce.server"` statement entirely — which silently left
 * `installedStore` undefined, producing markup with NO nonce while the CSP
 * header still advertised one (i.e. hydration blocked). Importing and CALLING an
 * exported function makes the dependency observable, so the module is retained.
 *
 * Safe to call more than once: re-installing the same store is harmless.
 */
export function installRequestScopedCspNonceStore(): void {
  installCspNonceStore({
    getStore: () => nonceStorage.getStore(),
    run: (value, fn) => nonceStorage.run(value, fn),
  });
}

installRequestScopedCspNonceStore();
