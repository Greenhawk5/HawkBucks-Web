/**
 * Phase 20 — response security headers for SSR (PURE LOGIC, client-safe).
 *
 * WHY THIS EXISTS (and why it lives here rather than in `public/_headers`):
 *
 * This app deploys to Cloudflare Pages in advanced mode — `dist/_worker.js`
 * exists, so dynamic routes are served by the Worker, not the Pages static
 * asset pipeline. Cloudflare only applies `_headers` rules to responses it
 * serves from the static asset store; Worker-generated responses (every SSR
 * HTML document, every server-function RPC response, the sitemap handler)
 * bypass `_headers` entirely. That was verified against the real deployment:
 * `GET /about` returned no CSP, no HSTS, and no `X-Content-Type-Options`.
 *
 * The practical consequence was that the whole site shipped with NO
 * clickjacking protection, no HSTS, and no nosniff on its HTML documents,
 * while `_headers` advertised otherwise — a false sense of protection.
 *
 * The Server entry (`src/server.ts`) is the single funnel every Worker
 * response passes through, so applying the headers there fixes SSR, RPC and
 * error responses in one place.
 *
 * CSP (Phase 23). The Phase 20 comment that CSP was "deliberately not set
 * here" is now RESOLVED — see `src/lib/csp.ts` for the full rationale and the
 * evidence that made a strict policy possible. The short version: TanStack
 * Router exposes a first-class per-request `ssr.nonce` option
 * (`router.options.ssr.nonce`) that it threads into React's
 * `renderToReadableStream`, into the `$tsr` / `$tsr-stream-barrier` inline
 * scripts, into `<Scripts>`, and into `<HeadContent>` (including the
 * `<meta property="csp-nonce">` tag that the client re-reads during
 * hydration). `src/router.tsx` sets it from the request-scoped nonce that
 * `src/server.ts` generates, so hydration keeps working under a nonce-only
 * `script-src` — no `'unsafe-inline'` and no `'unsafe-eval'` are required.
 *
 * These header VALUES are constants and this module imports nothing, so it is
 * trivially testable and cannot leak into any privileged context.
 */

/** Clickjacking defence. This legacy header stays in force alongside the CSP's
 *  stricter `frame-ancestors 'none'` (same intent; the header covers very old
 *  user agents, the CSP directive covers modern ones). */
export const FRAME_PROTECTION_HEADER = "X-Frame-Options";

export const CSP_HEADER = "Content-Security-Policy";

/**
 * Phase 23 — Content Security Policy (PURE LOGIC, client-safe).
 *
 * WHY THIS EXISTS
 * ---------------
 * Phase 20 applied HSTS / nosniff / referrer-policy / permissions-policy /
 * X-Frame-Options to every SSR response but could NOT ship a CSP: TanStack
 * Start's SSR stream emits inline <script> tags for hydration and no per-request
 * nonce was configured. Any policy without a nonce (`script-src 'self'`) breaks
 * hydration; `'unsafe-inline'` would work but defeats the point. CSP was
 * deferred for that reason alone.
 *
 * THAT BLOCKER DOES NOT EXIST — the framework already supports the solution.
 * `createRouter({ ssr: { nonce } })` is a first-class option
 * (router-core/src/router.ts: `ssr?: { nonce?: string }`). Verified against the
 * installed framework, it is threaded to EVERY inline <script> SSR produces:
 *
 *   1. `renderRouterToStream` (react-router/dist/esm/ssr/renderRouterToStream.js)
 *      passes `nonce: router.options.ssr?.nonce` to React's
 *      `renderToReadableStream` — covers React's Suspense-reveal scripts.
 *   2. `serverSsr.injectScript` (router-core/src/ssr/ssr-server.ts:487) wraps
 *      every streamed router script as `<script nonce='...'>…</script>` — covers
 *      the `$_TSR` runtime bootstrap (minifiedTsrBootStrapScript + the seroval
 *      cross-reference header) and all serialized match/loader data.
 *   3. `serverSsr.takeBufferedScripts()` (ssr-server.ts:682) puts the nonce on
 *      `<script className="$tsr" id="$tsr-stream-barrier">`.
 *   4. `<Scripts>` (react-router/src/Scripts.tsx:38,63) puts the nonce on every
 *      manifest/route script — the client entry chunks (`src=`).
 *   5. `<HeadContent>` / `buildTagsFromMatches` (headContentUtils.tsx) puts the
 *      nonce on head scripts/styles/links AND emits
 *      `<meta property="csp-nonce" content="…">`, which `ssr-client.ts:89`
 *      re-reads during hydration so client navigation rebuilds the same nonce.
 *
 * The inline-script inventory is therefore FULLY covered without
 * `'unsafe-inline'`. CSP hashes are NOT used: the inline payloads are
 * per-request dynamic (serialized loader data differs per route and per user),
 * so a static hash could never match. Nonce is the correct mechanism here.
 *
 * THE NONCE LIFECYCLE (src/server.ts + src/router.tsx)
 * ---------------------------------------------------
 * `src/server.ts` generates ONE cryptographically random nonce per HTTP
 * response with `crypto.getRandomValues` and runs the request inside an
 * AsyncLocalStorage scope — the same request-scoping mechanism this codebase
 * already relies on for Cloudflare bindings (see services/missions.server.ts).
 * `src/router.tsx` reads that nonce in `getRouter()` and sets `ssr.nonce`. The
 * SAME nonce string is written into the CSP header, so header and markup can
 * never drift.
 *
 * Security properties:
 *   * `crypto.getRandomValues` (CSPRNG) — never Date.now()/Math.random().
 *   * 16 bytes (128 bits), base64 — OWASP's recommended minimum.
 *   * Fresh per response — two responses never share a nonce, so an injected
 *     script cannot predict the next page's value.
 *   * Never placed in a query string, cookie, log, or client app state. It
 *     appears only in the CSP response header and in `nonce` attributes the
 *     server itself rendered (plus the framework's own `csp-nonce` meta tag,
 *     which exists so the client can rebuild the same nonce after hydration and
 *     is readable only by JS already executing on the page).
 *
 * Sources are justified individually in `CSP_EVIDENCE` below.
 */

/** Third-party origins, isolated as constants so tests can assert on them. */
export const CSP_SCRIPT_ORIGIN_TURNSTILE = "https://challenges.cloudflare.com";
export const CSP_STYLE_ORIGIN_GOOGLE_FONTS = "https://fonts.googleapis.com";
/**
 * Phase 24 — the origin that actually serves the Google Fonts *binaries*.
 *
 * `fonts.googleapis.com` (above) only serves the @font-face CSS. Every
 * `src: url(https://fonts.gstatic.com/...)` reference inside that CSS is fetched
 * from this host, and a font fetch is governed by `font-src` — NOT by CORS.
 * A permissive `Access-Control-Allow-Origin` on the response does not
 * authorize it; without an explicit `font-src` source the browser blocks the
 * download outright. That was verified in a real Chromium against the
 * production bundle: `document.fonts` reported every `Sora` and `Inter` face as
 * `error`, `document.fonts.check('700 48px Sora')` was `false`, and the console
 * logged `Refused to load the font 'https://fonts.gstatic.com/...' because it
 * violates the following Content Security Policy directive: "font-src 'self'
 * data:"` on every route — silently rendering the whole site in fallback
 * system fonts.
 *
 * It is added to `font-src` ONLY. It is deliberately NOT added to script-src,
 * style-src, connect-src, img-src or frame-src, so it grants no script or
 * connection privilege of any kind.
 */
export const CSP_FONT_ORIGIN_GOOGLE_FONTS = "https://fonts.gstatic.com";
export const CSP_MEDIA_ORIGIN_R2 = "https://media.hawkbucks.com";

/**
 * Per-directive justification for every source in the policy. Kept as data (not
 * prose comments) so the regression test can assert the policy and its
 * rationale never drift apart, and so a reviewer sees WHY each origin is here.
 */
export const CSP_EVIDENCE: Readonly<Record<string, string>> = Object.freeze({
  "default-src":
    "Everything the app ships is same-origin: Vite bundles under /assets, CSS from src/styles.css + src/cms.css.",
  "base-uri": "No <base> tag exists in the app; blocks base-tag hijacking.",
  "object-src": "No <object>/<embed> anywhere; plugin content must never load.",
  "frame-ancestors":
    "Same guarantee as the pre-existing X-Frame-Options: DENY. The site is never legitimately embedded — the CMS opens same-origin links, never iframes.",
  "form-action":
    "The CMS login form posts through a TanStack server function on this origin (createCsrfMiddleware enforces same-origin). No third-party form target exists.",
  "manifest-src": "public/site.webmanifest, linked from the root route head.",
  "worker-src":
    "public/sw.js (Web Push) is registered same-origin via navigator.serviceWorker.register('/sw.js') in src/services/push.client.",
  "script-src":
    "'self' = every Vite client chunk emitted by <Scripts>. 'nonce-…' = every inline SSR script (see the nonce-threading list above). https://challenges.cloudflare.com is the ONLY third-party script: src/components/cms/cc/CmsTurnstile.tsx creates https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit via document.createElement('script'). It is an EXTERNAL script with a src, so a nonce cannot authorize it — the origin must be allowed. Cloudflare's official CSP reference documents exactly script-src + frame-src on challenges.cloudflare.com for Turnstile. No other Cloudflare origin is needed: the widget's network traffic runs inside its sandboxed challenges.cloudflare.com iframe, governed by frame-src, not this document's connect-src.",
  "style-src":
    "'self' = the two bundled stylesheets (styles.css, cms.css) emitted as <link> by the root route head. https://fonts.googleapis.com = the Google Fonts stylesheet linked in src/routes/__root.tsx. 'unsafe-inline' is REQUIRED and deliberately scoped to styles ONLY, because two runtime injectors create <style> elements that cannot be given a nonce: (1) `sonner` (Toaster, on every public page) calls __insertCSS() at module scope, doing document.createElement('style') then appending CSS text, with no nonce hook; (2) `react-remove-scroll-bar` (behind every Radix Dialog/Drawer/Sheet/Popover) creates a <style> via `react-style-singleton`, which calls getNonce() from the `get-nonce` package — but that only returns a value when a bundler sets __webpack_nonce__, and Vite does not, so the tag is emitted without a nonce. A nonce/hash-only style-src would strip scroll-lock CSS and toast styling site-wide. 'unsafe-inline' in style-src cannot execute script (CSS is not a script context) and is the standard accepted trade-off for Radix/sonner. It is NEVER applied to script-src. No nonce is added to style-src on purpose: when a directive contains a nonce, browsers IGNORE 'unsafe-inline' for that directive, which would re-break sonner and Radix.",
  "img-src":
    "'self' + https://media.hawkbucks.com = the production R2 delivery origin (wrangler.json var R2_PUBLIC_BASE_URL, mirrored by the R2_PUBLIC_BASE_URL constant in src/lib/cms/r2.server.ts); all CMS hero/loadout/schematic/article images resolve through resolveCompatDeliveryUrl() to this host. ImageKit is deliberately NOT added: imagekitEndpoint is not configured in wrangler.json or .dev.vars, and resolveCompatDeliveryUrl returns null for bare-fileId ImageKit rows without it, so the frontend cannot actually load from an ImageKit origin. D1 rows holding an absolute https delivery_url still render exactly as before — only the allow-list is not widened for a host the app never constructs (tracked as a Phase 24 note). data: is REQUIRED by the CMS Media Library: src/routes/admin/media.tsx reads a picked file with FileReader.readAsDataURL() and renders that data: URL as the preview <img src>. blob: covers the same Media Library's in-browser object-URL previews. Scoped to img-src only.",
  "font-src":
    "'self' = any same-origin font asset. data: covers an inline/embedded font payload. https://fonts.gstatic.com is REQUIRED (Phase 24): the root route head (src/routes/__root.tsx) links the Google Fonts stylesheet from fonts.googleapis.com and preconnects to fonts.gstatic.com with crossorigin='anonymous', but that stylesheet only declares @font-face rules — the actual Sora/Inter .woff2 binaries it references are served from fonts.gstatic.com. A font fetch is authorized by font-src and NOT by the response's CORS headers, so omitting this origin blocks every webfont download. Verified in real Chromium against the production bundle BEFORE this fix: every Sora and Inter face reported status 'error' in document.fonts, document.fonts.check('700 48px Sora') returned false, and the console logged \"Refused to load the font 'https://fonts.gstatic.com/...' because it violates ... font-src 'self' data:\" on every route — the entire site silently rendered in fallback system fonts. The origin is scoped to font-src alone and grants no script, style or connection privilege.",
  "connect-src":
    "ALL application traffic is same-origin: TanStack server functions post to /_serverFn/* on this origin, the client router fetches only its own chunks, and R2 media is loaded as <img> (governed by img-src, not connect-src). Media is never fetched via XHR/fetch, so media.hawkbucks.com is NOT needed here. challenges.cloudflare.com is NOT needed: Turnstile's requests originate inside its own sandboxed iframe, which carries Cloudflare's own policy. No WebSocket, EventSource, or cross-origin fetch exists anywhere in the codebase (verified by search), so there is nothing else to allow.",
  "media-src":
    "The app ships no <video>/<audio>/<source> elements (verified by search), so media loading stays on the default same-origin set.",
});

/**
 * Build the enforcing CSP header value for a given nonce.
 *
 * The nonce is injected ONLY as a `'nonce-<value>'` source expression — the
 * CSP3-recommended mechanism. It cannot authorize a script an attacker injected
 * into THIS document, because the value differs on every response and is known
 * only to scripts that already executed.
 *
 * @param nonce base64 CSP nonce produced by the request-scoped nonce store.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${CSP_SCRIPT_ORIGIN_TURNSTILE}`,
    `style-src 'self' 'unsafe-inline' ${CSP_STYLE_ORIGIN_GOOGLE_FONTS}`,
    `img-src 'self' data: blob: ${CSP_MEDIA_ORIGIN_R2}`,
    `font-src 'self' data: ${CSP_FONT_ORIGIN_GOOGLE_FONTS}`,
    "connect-src 'self'",
    "media-src 'self'",
  ].join("; ");
}

/**
 * Merge the CSP onto a response, alongside the Phase 20 security headers.
 *
 * The nonce is per-response, so this cannot be a constant — it takes the nonce
 * as an argument and refuses to emit a policy without one, rather than silently
 * shipping a nonce-less (and therefore hydration-breaking) header.
 */
export function applyContentSecurityPolicy(response: Response, nonce: string): Response {
  if (!nonce) {
    throw new Error("applyContentSecurityPolicy: a per-response CSP nonce is required");
  }
  const headers = new Headers(response.headers);
  headers.set(CSP_HEADER, buildContentSecurityPolicy(nonce));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  // Only honoured by browsers over HTTPS, so local http dev is unaffected.
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  // Stops MIME sniffing (e.g. a text/plain asset being treated as HTML).
  "X-Content-Type-Options": "nosniff",
  // Keeps the full path+query off cross-origin Referer headers. Preview links
  // carry a capability token in the query string, so this matters.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // No camera/mic/geo/payment use anywhere in the app.
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  [FRAME_PROTECTION_HEADER]: "DENY",
});

/**
 * Merge the security headers onto a response.
 *
 * Existing values are never overwritten: a route (e.g. the preview route's
 * `Cache-Control`) or an upstream handler keeps ownership of anything it set
 * deliberately, and this function only fills genuine gaps.
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
