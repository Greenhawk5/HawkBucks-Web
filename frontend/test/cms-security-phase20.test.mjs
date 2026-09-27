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

test("security: public/_headers ships HSTS, nosniff, CSP with frame-ancestors", async () => {
  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  assert.match(headers, /Strict-Transport-Security/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(headers, /media\.hawkbucks\.com/);
});
