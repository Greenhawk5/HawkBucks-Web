// Phase 20 security regression tests: upload magic bytes, CSRF origin check,
// login rate limiting, session cookie flags, R2 key traversal, audit
// redaction, SEO dangerous-URL rejection, article raw-HTML rejection,
// _headers presence.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-security-phase20.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const mediaProvider = await import("../src/lib/cms/media-provider.ts");
const auth = await import("../src/lib/cms/auth.server.ts");
const r2 = await import("../src/lib/cms/r2.server.ts");
const audit = await import("../src/lib/cms/audit.ts");
const seo = await import("../src/lib/cms/seo.ts");
const articles = await import("../src/lib/cms/articles.ts");
const securityHeaders = await import("../src/lib/security-headers.ts");

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const SCRIPT_BYTES = new TextEncoder().encode("<script>alert(1)</script>");

// --- Upload magic bytes ------------------------------------------------------

test("security: script bytes claimed as image/png are rejected", () => {
  const result = mediaProvider.validateUploadInput({
    originalFilename: "photo.png",
    mimeType: "image/png",
    data: SCRIPT_BYTES,
  });
  assert.equal(result.ok, false);
});

test("security: jpeg bytes claimed as image/png are rejected (type confusion)", () => {
  const result = mediaProvider.validateUploadInput({
    originalFilename: "photo.png",
    mimeType: "image/png",
    data: JPEG_BYTES,
  });
  assert.equal(result.ok, false);
});

test("security: genuine PNG bytes pass validation", () => {
  const result = mediaProvider.validateUploadInput({
    originalFilename: "photo.png",
    mimeType: "image/png",
    data: PNG_BYTES,
  });
  assert.equal(result.ok, true);
});

test("security: SVG remains rejected by the MIME allowlist", () => {
  const result = mediaProvider.validateUploadInput({
    originalFilename: "vector.svg",
    mimeType: "image/svg+xml",
    data: new TextEncoder().encode("<svg></svg>"),
  });
  assert.equal(result.ok, false);
});

// --- CSRF origin check -------------------------------------------------------

test("security: cross-origin Origin header is rejected", () => {
  assert.equal(
    auth.isSameOriginMutation({
      origin: "https://evil.example",
      referer: null,
      host: "hawkbucks.com",
    }),
    false,
  );
});

test("security: same-origin Origin header is accepted", () => {
  assert.equal(
    auth.isSameOriginMutation({
      origin: "https://hawkbucks.com",
      referer: null,
      host: "hawkbucks.com",
    }),
    true,
  );
});

test("security: missing Origin/Referer passes through (non-browser client)", () => {
  assert.equal(
    auth.isSameOriginMutation({ origin: null, referer: null, host: "hawkbucks.com" }),
    true,
  );
});

test("security: cross-origin Referer fallback is rejected", () => {
  assert.equal(
    auth.isSameOriginMutation({
      origin: null,
      referer: "https://evil.example/cms",
      host: "hawkbucks.com",
    }),
    false,
  );
});

// --- Login rate limiting -----------------------------------------------------

test("security: login throttle trips after 10 failures, resets on success", () => {
  auth.resetLoginRateLimits();
  const user = "throttle-probe-phase20";
  for (let i = 0; i < 10; i += 1) auth.noteLoginFailure(user);
  assert.throws(() => auth.checkLoginRateLimit(user), /Too many login attempts/);
  auth.noteLoginSuccess(user);
  auth.checkLoginRateLimit(user);
  auth.resetLoginRateLimits();
});

// --- Session cookie flags ----------------------------------------------------

test("security: session cookie is HttpOnly + Secure + SameSite=Lax", () => {
  const header = auth.buildSessionCookie("token123");
  assert.match(header, /HttpOnly/);
  assert.match(header, /Secure/);
  assert.match(header, /SameSite=Lax/);
});

test("security: session tokens are 256-bit and distinct", () => {
  const a = auth.createSessionToken();
  const b = auth.createSessionToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 40 && b.length >= 40);
});

// --- R2 key traversal --------------------------------------------------------

test("security: R2 keys reject traversal and absolute URLs", () => {
  assert.equal(r2.isValidR2Key("../secret.key"), false);
  assert.equal(r2.isValidR2Key("/heroes/x.png"), false);
  assert.equal(r2.isValidR2Key("https://evil.example/x.png"), false);
  assert.equal(r2.isValidR2Key("heroes/ok-image.webp"), true);
});

test("security: R2 folder sanitization collapses traversal to allowlist", () => {
  assert.equal(r2.sanitizeR2Folder("../../etc"), "misc");
  assert.equal(r2.sanitizeR2Folder("heroes"), "heroes");
});

// --- Audit redaction ---------------------------------------------------------

test("security: audit metadata redacts tokens and passwords", () => {
  const event = audit.buildAuditEvent({
    actor: { id: "u1", username: "admin" },
    action: "preview.issue",
    entityType: "article",
    entityId: "a1",
    metadata: { previewToken: "secret-token", password: "hunter2", key: "heroes/x.png" },
  });
  const meta = JSON.parse(event.metadataJson);
  assert.equal(meta.previewToken, "[redacted]");
  assert.equal(meta.password, "[redacted]");
  assert.equal(meta.key, "heroes/x.png");
});

// --- SEO dangerous URLs ------------------------------------------------------

test("security: javascript: og image is rejected", () => {
  const out = seo.resolveCmsSeo({
    status: "published",
    publicPath: "/articles/x",
    fallbackTitle: "t",
    fallbackDescription: "d",
    ogImageUrl: "javascript:alert(1)",
  });
  assert.equal(out.ogImageUrl, null);
});

test("security: drafts are always noindex without canonical", () => {
  const out = seo.resolveCmsSeo({
    status: "draft",
    publicPath: "/articles/x",
    fallbackTitle: "t",
    fallbackDescription: "d",
  });
  assert.equal(out.robots, "noindex, nofollow");
  assert.equal(out.canonical, null);
  assert.equal(out.indexable, false);
});

// --- Article raw HTML ----------------------------------------------------------

test("security: article blocks reject unsupported raw-html block type", () => {
  assert.throws(() => articles.validateArticleBlock({ type: "html", html: "<script>x</script>" }));
});

// --- _headers ------------------------------------------------------------------

// The `_headers` file only ever applied to Cloudflare's static asset store, and
// Phase 23 moved the CSP off it entirely (a static file cannot carry a
// per-request nonce). The SSR policy now lives in src/lib/security-headers.ts
// and is asserted there and end-to-end in test/csp-phase23.test.mjs. This test
// keeps the static-asset header contract intact and confirms the SSR policy is
// NOT duplicated into a file that cannot work.
test("security: _headers ships HSTS + nosniff, and defers CSP to the Worker", async () => {
  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  assert.match(headers, /Strict-Transport-Security/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  // The enforcing policy is emitted by the Worker with a per-request nonce; a
  // static header could only ever be the broken nonce-less variant.
  assert.doesNotMatch(headers, /^\s*Content-Security-Policy:/m);
  // The R2 delivery origin is a Worker-side concern and is asserted with the
  // rest of the policy in test/csp-phase23.test.mjs — not from this file.
});

// Phase 20 regression: `_headers` applies ONLY to Cloudflare's static asset
// store. This deployment ships dist/_worker.js, so every SSR HTML document and
// every /_serverFn response bypasses that file — which is exactly why the
// headers are applied in src/server.ts instead. If `_headers` is ever promoted
// as the HTML-document defence, this guard fails loudly.
test("security: _headers documents that it does not cover SSR responses", async () => {
  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  assert.match(headers, /STATIC ASSETS ONLY/);
  assert.match(headers, /bypass/i);
  assert.match(headers, /src\/server\.ts/);
});

// The shipped CSP is applied to SSR by the Worker (src/server.ts), NOT by this
// file — `_headers` only reaches Cloudflare's static asset store. Phase 23
// resolved the Phase 20 blocker (a per-request nonce is now threaded through
// `createRouter({ ssr: { nonce } })`), so the policy moved off this file
// entirely. This test asserts the hazard stays DOCUMENTED so nobody pastes a
// nonce-less policy back onto SSR responses.
test("security: the _headers file explains the CSP now lives on the SSR path", async () => {
  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  assert.match(headers, /DO NOT paste the SSR CSP into this file/);
  assert.match(headers, /nonce/);
  // No live CSP line may remain here: a static file cannot carry a per-request
  // nonce, and `script-src 'self'` is exactly what broke hydration.
  assert.doesNotMatch(headers, /^\s*Content-Security-Policy:/m);
});

// --- SSR security headers (src/lib/security-headers.ts) -------------------------

test("security: SSR responses carry HSTS, nosniff and referrer policy", () => {
  const response = securityHeaders.applySecurityHeaders(
    new Response("<!doctype html>", { status: 200, headers: { "content-type": "text/html" } }),
  );
  assert.match(
    response.headers.get("strict-transport-security") ?? "",
    /^max-age=63072000; includeSubDomains; preload$/,
  );
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
});

test("security: SSR responses are protected against clickjacking", () => {
  const response = securityHeaders.applySecurityHeaders(new Response("ok", { status: 200 }));
  assert.equal(response.headers.get("x-frame-options"), "DENY");
});

test("security: SSR permissions policy denies unused powerful features", () => {
  const response = securityHeaders.applySecurityHeaders(new Response("ok", { status: 200 }));
  assert.equal(
    response.headers.get("permissions-policy"),
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
});

test("security: applySecurityHeaders preserves status, body and existing headers", async () => {
  const response = securityHeaders.applySecurityHeaders(
    new Response("body-text", {
      status: 404,
      statusText: "Not Found",
      headers: { "content-type": "text/plain" },
    }),
  );
  assert.equal(response.status, 404);
  assert.equal(response.statusText, "Not Found");
  assert.equal(response.headers.get("content-type"), "text/plain");
  assert.equal(await response.text(), "body-text");
});

// The preview route owns its own Cache-Control; hardening must never clobber
// a header a handler deliberately set.
test("security: hardening never overwrites a header the handler already set", () => {
  const response = securityHeaders.applySecurityHeaders(
    new Response("draft", {
      status: 200,
      headers: { "cache-control": "private, no-store", "referrer-policy": "no-referrer" },
    }),
  );
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

// Phase 20 deferred CSP entirely; Phase 23 shipped it with a per-request nonce.
// This test now asserts the policy IS present on the hardened response and that
// it does NOT contain the two directives that would weaken it. The full policy
// contract (nonce↔markup matching, origins, Turnstile, RTL routes) is covered
// end-to-end against the production bundle in test/csp-phase23.test.mjs.
test("security: hardened SSR responses carry a nonce-based CSP", () => {
  const nonce = "dGhlU2FtcGxlTm9uY2VGb3JUZXN0cw==";
  const response = securityHeaders.applyContentSecurityPolicy(
    securityHeaders.applySecurityHeaders(new Response("ok", { status: 200 })),
    nonce,
  );
  const policy = response.headers.get("content-security-policy") ?? "";
  assert.match(policy, new RegExp(`'nonce-${nonce}'`));
  assert.match(policy, /script-src 'self' 'nonce-/);
  assert.doesNotMatch(policy, /'unsafe-eval'/);
  // 'unsafe-inline' is scoped to style-src only (sonner + Radix inject <style>).
  const scriptSrc = /script-src ([^;]*)/.exec(policy)?.[1] ?? "";
  assert.doesNotMatch(scriptSrc, /'unsafe-inline'/);
  assert.match(policy, /style-src [^;]*'unsafe-inline'/);
});

// Redirects and error pages leave the same Worker funnel, so they must be
// covered too (a redirect leaking headers is harmless, but a 500 page missing
// nosniff is not).
test("security: redirect responses also receive the hardening headers", () => {
  const response = securityHeaders.applySecurityHeaders(
    new Response(null, { status: 308, headers: { location: "https://hawkbucks.com/" } }),
  );
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://hawkbucks.com/");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
});
