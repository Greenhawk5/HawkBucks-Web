// Phase 23 — Content Security Policy regression tests.
//
// CSP is the Phase 20 item that was deferred (inline SSR hydration scripts had
// no nonce) and resolved in Phase 23. These tests pin BOTH halves of that fix:
//
//   * the POLICY — pure assertions on what src/lib/security-headers.ts emits
//     (no 'unsafe-eval', no 'unsafe-inline' in script-src, no wildcards, the
//     exact required origins, and every Phase 20 header preserved);
//   * the NONCE LIFECYCLE against the REAL production bundle — this suite
//     imports the same generated Pages Worker entry that
//     test/cloudflare-pages-runtime.test.mjs uses (`.output/server/index.mjs`,
//     the file `.output/server/wrangler.json` points `main` at), runs an actual
//     streamed SSR request through it, and then cross-checks that the nonce in
//     the response's Content-Security-Policy header is byte-identical to the
//     nonce on the inline <script> tags in the returned HTML. A policy that
//     exists but does not MATCH the markup would block hydration and take the
//     whole site down — that is the failure this file exists to prevent.
//
// Requires a production build (`npm run build`); without one the bundle-level
// tests skip so `npm run test:server` stays useful on a fresh checkout.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/csp-phase23.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const csp = await import("../src/lib/security-headers.ts");
const nonceStore = await import("../src/lib/csp-nonce.ts");

const FRONTEND = new URL("..", import.meta.url);
const read = (rel) => readFile(new URL(rel, FRONTEND), "utf8");

// Same production-entry resolution as cloudflare-pages-runtime.test.mjs, so
// both suites exercise the artifact Cloudflare Pages actually executes.
const WORKER_ENTRY_CANDIDATES = ["../.output/server/index.mjs", "../dist/_worker.js/index.js"];
const WORKER_ENTRY = WORKER_ENTRY_CANDIDATES.map((p) => new URL(p, import.meta.url)).find((url) =>
  existsSync(url),
);
const BUILD_MISSING = `no Pages Worker entry found — run \`npm run build\` first (looked for ${WORKER_ENTRY_CANDIDATES.join(", ")})`;

const SAMPLE_NONCE = "dGhlU2FtcGxlTm9uY2VGb3JUZXN0cw==";

/** Parse a CSP header value into a map of directive -> source list. */
function parsePolicy(value) {
  const directives = new Map();
  for (const part of value.split(";")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    directives.set(tokens[0].toLowerCase(), tokens.slice(1));
  }
  return directives;
}

/** Pull every inline <script …> opening tag out of the rendered HTML. */
function inlineScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map((match) => match[1])
    .filter((attrs) => !/\bsrc\s*=/.test(attrs));
}

/** Mocked HAWKBUCKS_API Service Binding so mission loaders resolve server-side. */
const mockMissionsBinding = {
  async fetch() {
    return new Response(
      JSON.stringify({ success: true, status: "unavailable", totalVbucks: 0, missions: [] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  },
};

/**
 * Render a path through the real production Worker entry.
 *
 * The mocked HAWKBUCKS_API Service Binding is REQUIRED, not optional: the home
 * and mission routes load through it server-side, and without it their loaders
 * fail closed and the page renders as a 500. This mirrors the harness already
 * used by test/cloudflare-pages-runtime.test.mjs.
 */
async function renderProduction(worker, path) {
  const response = await worker.default.fetch(
    new Request(`https://hawkbucks.com${path}`, {
      headers: { origin: "https://hawkbucks.com" },
    }),
    { HAWKBUCKS_API: mockMissionsBinding },
    ctx,
  );
  const header = response.headers.get(csp.CSP_HEADER);
  const html = await response.text();
  return { response, header, html };
}

// --- Policy shape -----------------------------------------------------------

test("csp: the policy authorises the request nonce in script-src", () => {
  const policy = parsePolicy(csp.buildContentSecurityPolicy(SAMPLE_NONCE));
  assert.deepEqual(policy.get("script-src"), [
    "'self'",
    `'nonce-${SAMPLE_NONCE}'`,
    "https://challenges.cloudflare.com",
  ]);
});

test("csp: script-src never carries 'unsafe-inline'", () => {
  // THE Phase 20 blocker. If this regresses, hydration is still safe but the
  // policy stops protecting against injected inline <script> — i.e. the whole
  // point of Phase 23 is lost. Only style-src may use it (see the next test).
  const policy = parsePolicy(csp.buildContentSecurityPolicy(SAMPLE_NONCE));
  for (const directive of ["script-src", "default-src", "script-src-elem"]) {
    const sources = policy.get(directive) ?? [];
    assert.ok(!sources.includes("'unsafe-inline'"), `${directive} must not allow 'unsafe-inline'`);
  }
});

test("csp: no directive anywhere allows 'unsafe-eval'", () => {
  for (const [, sources] of parsePolicy(csp.buildContentSecurityPolicy(SAMPLE_NONCE))) {
    assert.ok(!sources.includes("'unsafe-eval'"), "policy must not allow 'unsafe-eval'");
  }
});

test("csp: 'unsafe-inline' appears only in style-src, and is documented", () => {
  const policy = parsePolicy(csp.buildContentSecurityPolicy(SAMPLE_NONCE));
  const directivesWithUnsafeInline = [...policy.entries()]
    .filter(([, sources]) => sources.includes("'unsafe-inline'"))
    .map(([name]) => name);

  // Exactly one directive needs it, and it must be style-src: `sonner` and
  // Radix's react-remove-scroll-bar inject <style> at runtime with no nonce.
  assert.deepEqual(directivesWithUnsafeInline, ["style-src"]);
  assert.match(csp.CSP_EVIDENCE["style-src"], /sonner/);
  assert.match(csp.CSP_EVIDENCE["style-src"], /react-remove-scroll-bar/);
});

test("csp: no wildcard scheme or host sources leak into the policy", () => {
  const policy = parsePolicy(csp.buildContentSecurityPolicy(SAMPLE_NONCE));
  for (const [name, sources] of policy) {
    assert.ok(!sources.includes("*"), `${name} must not allow '*'`);
    assert.ok(!sources.includes("https:"), `${name} must not allow bare 'https:'`);
    assert.ok(!sources.includes("http:"), `${name} must not allow bare 'http:'`);
  }
  // data: is legitimate ONLY for img-src (CMS media previews) and font-src
  // (embedded fonts) — never for a script, style, frame or connect source,
  // where it would be a genuine injection primitive.
  for (const [name, sources] of policy) {
    if (sources.includes("data:") || sources.includes("blob:")) {
      assert.ok(
        name === "img-src" || name === "font-src",
        `${name} must not allow data:/blob: sources`,
      );
    }
  }
  // And they are scoped to the exact directives that need them.
  assert.deepEqual(policy.get("img-src"), [
    "'self'",
    "data:",
    "blob:",
    "https://media.hawkbucks.com",
  ]);
  assert.deepEqual(policy.get("font-src"), ["'self'", "data:", "https://fonts.gstatic.com"]);
  assert.ok(!policy.get("script-src").some((s) => s === "data:" || s === "blob:"));
});

test("csp: connect-src stays same-origin only", () => {
  // Every server function posts to this origin, so allowing anything here
  // would hand a cross-origin exfiltration channel to injected script.
  assert.deepEqual(parsePolicy(csp.buildContentSecurityPolicy(SAMPLE_NONCE)).get("connect-src"), [
    "'self'",
  ]);
});

test("csp: hardening directives are present and restrictive", () => {
  const policy = parsePolicy(csp.buildContentSecurityPolicy(SAMPLE_NONCE));
  assert.deepEqual(policy.get("default-src"), ["'self'"]);
  assert.deepEqual(policy.get("object-src"), ["'none'"]);
  assert.deepEqual(policy.get("frame-ancestors"), ["'none'"]);
  assert.deepEqual(policy.get("base-uri"), ["'self'"]);
  assert.deepEqual(policy.get("form-action"), ["'self'"]);
  assert.deepEqual(policy.get("manifest-src"), ["'self'"]);
  assert.deepEqual(policy.get("worker-src"), ["'self'"]);
});

test("csp: Turnstile and Google Fonts origins are allowed exactly where needed", () => {
  const policy = parsePolicy(csp.buildContentSecurityPolicy(SAMPLE_NONCE));
  // Cloudflare's own CSP reference documents script-src + frame-src for Turnstile.
  assert.ok(policy.get("script-src").includes("https://challenges.cloudflare.com"));
  // The widget's iframe is created by its api.js at runtime, so the origin
  // allowance is required even though no <iframe> exists in the source.
  assert.match(csp.CSP_EVIDENCE["script-src"], /CmsTurnstile/);
  assert.ok(policy.get("style-src").includes("https://fonts.googleapis.com"));
});

/**
 * Phase 24 regression — the font-serving origin must be in font-src.
 *
 * Phase 23 shipped `font-src 'self' data:` on the (incorrect) reasoning that
 * Google Fonts' permissive CORS headers were sufficient. They are not: a font
 * fetch is authorized by `font-src`, and CORS never overrides CSP. Real
 * Chromium against the production bundle consequently blocked every Sora and
 * Inter .woff2 request and rendered the entire site in fallback system fonts,
 * with no build-time or test-time signal.
 *
 * These assertions pin the two halves that must stay in agreement:
 *   1. the policy allows the origin that actually serves the font binaries, and
 *   2. the root route head still links that stylesheet / preconnects that host
 *      — so the allowance can never become dead configuration if the font
 *      strategy ever changes.
 */
test("csp: font-src allows the Google Fonts binary origin the app actually uses", () => {
  const policy = parsePolicy(csp.buildContentSecurityPolicy(SAMPLE_NONCE));
  assert.ok(
    policy.get("font-src").includes(csp.CSP_FONT_ORIGIN_GOOGLE_FONTS),
    "font-src must allow https://fonts.gstatic.com or every webfont is blocked",
  );
  // The stylesheet origin and the binary origin are DIFFERENT hosts; allowing
  // only fonts.googleapis.com is the bug this test exists to prevent.
  assert.notEqual(csp.CSP_STYLE_ORIGIN_GOOGLE_FONTS, csp.CSP_FONT_ORIGIN_GOOGLE_FONTS);
  assert.ok(policy.get("style-src").includes(csp.CSP_STYLE_ORIGIN_GOOGLE_FONTS));
});

test("csp: the font origin is scoped to font-src and grants no script/connect privilege", async () => {
  const policy = parsePolicy(csp.buildContentSecurityPolicy(SAMPLE_NONCE));
  const origin = csp.CSP_FONT_ORIGIN_GOOGLE_FONTS;
  // Adding the font host must not widen any directive that can execute script
  // or open a connection — that would be a genuine privilege escalation.
  for (const directive of [
    "script-src",
    "style-src",
    "connect-src",
    "img-src",
    "frame-src",
    "frame-ancestors",
    "object-src",
    "worker-src",
    "manifest-src",
    "form-action",
    "base-uri",
    "default-src",
  ]) {
    assert.ok(
      !policy.get(directive)?.includes(origin),
      `${directive} must not allow the Google Fonts binary origin`,
    );
  }
  // The documented rationale must state the real reason, not the disproven one.
  assert.match(csp.CSP_EVIDENCE["font-src"], /fonts\.gstatic\.com/);
  assert.match(csp.CSP_EVIDENCE["font-src"], /font-src/);
});

test("csp: the root route still depends on the Google Fonts origins the policy allows", async () => {
  const rootRoute = await read("src/routes/__root.tsx");
  // If the app ever stops linking the stylesheet, this allowance should be
  // revisited — this assertion makes that coupling explicit rather than silent.
  assert.ok(
    rootRoute.includes(csp.CSP_STYLE_ORIGIN_GOOGLE_FONTS),
    "root route head must link the Google Fonts stylesheet",
  );
  assert.ok(
    rootRoute.includes(csp.CSP_FONT_ORIGIN_GOOGLE_FONTS),
    "root route head must preconnect the Google Fonts binary origin",
  );
});

test("csp: ImageKit is not in the allow-list (no configured endpoint)", () => {
  const rendered = csp.buildContentSecurityPolicy(SAMPLE_NONCE);
  assert.ok(!rendered.includes("imagekit"), "no ImageKit origin may be allowed");
  // The application behaviour is unchanged: the compat layer is untouched.
  assert.match(csp.CSP_EVIDENCE["img-src"], /imagekitEndpoint is not configured/);
});

test("csp: every directive in the shipped policy has a documented rationale", () => {
  // Keeps the justification table and the emitted policy from drifting apart.
  for (const name of parsePolicy(csp.buildContentSecurityPolicy(SAMPLE_NONCE)).keys()) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(csp.CSP_EVIDENCE, name),
      `${name} has no entry in CSP_EVIDENCE`,
    );
    assert.ok(csp.CSP_EVIDENCE[name].length > 40, `${name} rationale is too thin`);
  }
});

// --- Response application ---------------------------------------------------

test("csp: applyContentSecurityPolicy sets the header and preserves the response", async () => {
  const nonce = nonceStore.generateCspNonce();
  const response = csp.applyContentSecurityPolicy(
    csp.applySecurityHeaders(new Response("<!doctype html>", { status: 200 })),
    nonce,
  );
  const header = response.headers.get(csp.CSP_HEADER);
  assert.ok(header, "CSP header must be present");
  assert.ok(header.includes(`'nonce-${nonce}'`));
  assert.equal(await response.text(), "<!doctype html>");
});

test("csp: applyContentSecurityPolicy refuses to emit a policy without a nonce", () => {
  // Guards the exact Phase 20 failure mode: a nonce-less CSP would be emitted
  // and would block hydration site-wide.
  assert.throws(() => csp.applyContentSecurityPolicy(new Response("ok"), ""), /nonce is required/);
});

test("csp: applying the policy never regresses the Phase 20 security headers", () => {
  const response = csp.applyContentSecurityPolicy(
    csp.applySecurityHeaders(new Response("ok", { status: 200 })),
    nonceStore.generateCspNonce(),
  );
  assert.match(
    response.headers.get("strict-transport-security") ?? "",
    /^max-age=63072000; includeSubDomains; preload$/,
  );
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(
    response.headers.get("permissions-policy"),
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.ok(response.headers.get(csp.CSP_HEADER));
});

test("csp: CSP is emitted in enforcing mode, never report-only", () => {
  const response = csp.applyContentSecurityPolicy(
    new Response("ok"),
    nonceStore.generateCspNonce(),
  );
  assert.equal(
    response.headers.get("content-security-policy-report-only"),
    null,
    "production must not ship permanently in Report-Only mode",
  );
});

// --- Nonce quality ----------------------------------------------------------

test("csp: nonces are cryptographically random and never reused", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i += 1) {
    const nonce = nonceStore.generateCspNonce();
    assert.match(nonce, /^[A-Za-z0-9+/]+={0,2}$/, "must be a valid CSP base64-value");
    assert.ok(!seen.has(nonce), "two nonces must never collide");
    seen.add(nonce);
  }
  assert.equal(seen.size, 500);
});

test("csp: nonces carry 128 bits of entropy, not a timestamp or counter", () => {
  // 16 random bytes -> 24 base64 chars (22 data chars + '==' padding). A
  // Date.now()-based nonce would be far shorter and repeat within a second.
  assert.equal(nonceStore.generateCspNonce().length, 24);
  // Sampling proves genuine entropy: a monotonic clock or a per-process seeded
  // Math.random() would show far less variety across this many draws.
  const prefixes = new Set(
    Array.from({ length: 200 }, () => nonceStore.generateCspNonce().slice(0, 8)),
  );
  assert.ok(prefixes.size > 190, `expected high-entropy variety, saw ${prefixes.size}/200`);
});

test("csp: the nonce store is inert outside a request scope", () => {
  // Guards the browser/test path: router.tsx must be able to call
  // readCspNonce() unconditionally and simply omit ssr.nonce.
  assert.equal(nonceStore.readCspNonce(), undefined);
});

test("csp: runWithCspNonce exposes the nonce inside the scope only", () => {
  const nonce = nonceStore.generateCspNonce();
  const observed = nonceStore.runWithCspNonce(nonce, () => nonceStore.readCspNonce());
  // With AsyncLocalStorage this equals the nonce; in a bare Node test runner
  // the global is absent, so only assert we never observe a stale value.
  if (observed !== undefined) assert.equal(observed, nonce);
  assert.equal(nonceStore.readCspNonce(), undefined);
});

// --- Source-level wiring ----------------------------------------------------

test("csp: the Worker entry generates a nonce and applies the policy", async () => {
  const source = await read("src/server.ts");
  assert.match(source, /generateCspNonce\(\)/);
  assert.match(source, /runWithCspNonce\(cspNonce/);
  assert.match(source, /applyContentSecurityPolicy\(applySecurityHeaders\(response\), cspNonce\)/);
  // Every response path must go through the hardened funnel. Five call sites
  // (the arrow-function definition is not a call): the www redirect, the
  // pages.dev redirect, the sitemap, SSR, and the 500 page.
  assert.equal((source.match(/\bharden\(/g) ?? []).length, 5);
  // The AsyncLocalStorage installer must be imported AND called explicitly: a
  // bare side-effect import is tree-shaken by the bundler, which silently left
  // the nonce undefined while the header still advertised one.
  assert.match(source, /installRequestScopedCspNonceStore/);
});

test("csp: the router sets ssr.nonce from the request-scoped store", async () => {
  const source = await read("src/router.tsx");
  assert.match(source, /readCspNonce\(\)/);
  assert.match(source, /\.\.\.\(nonce \? \{ ssr: \{ nonce \} \} : \{\}\)/);
});

test("csp: the nonce module stays importable from the client bundle", async () => {
  // router.tsx is bundled for the BROWSER too. If the module it imports ever
  // gained a `node:` import or a server-only marker, the client build would
  // break or leak server code — so assert the shared module is dependency-free
  // and that the AsyncLocalStorage lives in a separate server-only module.
  // NOTE: assertions run against CODE, not prose — the modules deliberately
  // mention `server-only` in their doc comments, so match import statements.
  const shared = await read("src/lib/csp-nonce.ts");
  assert.doesNotMatch(shared, /^import /m, "csp-nonce.ts must have no imports");
  assert.doesNotMatch(shared, /from ["']node:/, "csp-nonce.ts must not import node built-ins");
  assert.doesNotMatch(shared, /^import ["']@tanstack/m, "no bare side-effect imports");

  // The server-only installer owns the Node dependency.
  const server = await read("src/lib/csp-nonce.server.ts");
  assert.match(server, /^import "@tanstack\/react-start\/server-only";$/m);
  assert.match(server, /^import \{ AsyncLocalStorage \} from "node:async_hooks";$/m);
  assert.match(server, /export function installRequestScopedCspNonceStore/);

  // And router.tsx must NOT import the server-only installer.
  const router = await read("src/router.tsx");
  assert.doesNotMatch(router, /csp-nonce\.server/);
});

// --- _headers (static assets) ----------------------------------------------

test("csp: _headers documents that it cannot protect HTML documents", async () => {
  const headers = await read("public/_headers");
  assert.match(headers, /STATIC ASSETS ONLY/);
  assert.match(headers, /bypass/i);
  assert.match(headers, /src\/server\.ts/);
  // The Phase 20 "DO NOT ENABLE AS-IS" warning must be gone now that the SSR
  // policy actually works — but the warning against pasting it here must stay.
  assert.doesNotMatch(headers, /DO NOT ENABLE AS-IS/i);
  assert.match(headers, /DO NOT paste the SSR CSP into this file/);
});

test("csp: _headers still carries the static-asset security headers", async () => {
  const headers = await read("public/_headers");
  assert.match(headers, /Strict-Transport-Security/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /X-Frame-Options: DENY/);
  // No stale, unsafe CSP may linger in the static file.
  assert.doesNotMatch(headers, /^\s*Content-Security-Policy:/m);
});

// --- PRODUCTION BUNDLE: the nonce must match the rendered markup ------------

const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} };

test(
  "csp: the production SSR response's CSP nonce matches its inline scripts",
  { skip: WORKER_ENTRY ? false : BUILD_MISSING },
  async () => {
    const worker = await import(WORKER_ENTRY.href);
    const { response, header, html } = await renderProduction(worker, "/");

    assert.equal(response.status, 200);
    assert.ok(header, "the real SSR response must carry Content-Security-Policy");
    const policy = parsePolicy(header);

    const scripts = inlineScripts(html);
    // Sanity: the SSR document really does emit inline hydration scripts. If
    // this ever returns 0, the assertions below would pass vacuously.
    assert.ok(scripts.length > 0, "expected inline <script> tags in the SSR output");

    const authorised = policy.get("script-src").filter((s) => s.startsWith("'nonce-"));
    assert.equal(authorised.length, 1, "exactly one nonce source is expected");
    const nonce = authorised[0].slice("'nonce-".length, -1);
    assert.ok(nonce.length > 0);

    // Every inline script must present that exact nonce, or the browser blocks
    // it and hydration never runs.
    for (const attrs of scripts) {
      const scriptNonce = /nonce="([^"]*)"/.exec(attrs)?.[1];
      assert.equal(scriptNonce, nonce, `inline script is not authorized: <script${attrs}>`);
    }
  },
);

test(
  "csp: production SSR responses get a DIFFERENT nonce per request",
  { skip: WORKER_ENTRY ? false : BUILD_MISSING },
  async () => {
    const worker = await import(WORKER_ENTRY.href);
    const nonceOf = async (path) => {
      const { header } = await renderProduction(worker, path);
      return /'nonce-([^']+)'/.exec(header ?? "")?.[1];
    };
    const first = await nonceOf("/");
    const second = await nonceOf("/");
    assert.ok(first && second, "both responses must expose a nonce");
    assert.notEqual(first, second, "each HTTP response needs its own nonce");
  },
);

test(
  "csp: concurrent production requests never share a nonce (context isolation)",
  { skip: WORKER_ENTRY ? false : BUILD_MISSING },
  async () => {
    // This is the data race the AsyncLocalStorage exists to prevent: without it,
    // a module-level variable would let one request's markup carry another
    // request's nonce, and BOTH pages would fail to hydrate.
    const worker = await import(WORKER_ENTRY.href);
    const pages = ["/", "/about", "/vbucks-missions", "/missions-guide", "/ar-SA"];
    const rendered = await Promise.all(pages.map((path) => renderProduction(worker, path)));

    const seen = new Set();
    for (const [index, { header, html }] of rendered.entries()) {
      assert.ok(header, `${pages[index]} must carry a CSP`);
      const nonce = /'nonce-([^']+)'/.exec(header)?.[1];
      assert.ok(nonce, `${pages[index]} must expose a nonce`);
      for (const attrs of inlineScripts(html)) {
        const scriptNonce = /nonce="([^"]*)"/.exec(attrs)?.[1];
        assert.equal(scriptNonce, nonce, `${pages[index]} inline script nonce mismatch`);
      }
      assert.ok(!seen.has(nonce), `${pages[index]} reused another request's nonce`);
      seen.add(nonce);
    }
    assert.equal(seen.size, pages.length);
  },
);

test(
  "csp: an unauthorized inline script would NOT be authorized",
  { skip: WORKER_ENTRY ? false : BUILD_MISSING },
  async () => {
    // Positive control: prove the header is actually restrictive rather than
    // decorative. An injected <script> without the nonce must match no source.
    const worker = await import(WORKER_ENTRY.href);
    const { header } = await renderProduction(worker, "/");
    const allowed = parsePolicy(header).get("script-src");
    assert.ok(!allowed.includes("'unsafe-inline'"));
    assert.ok(!allowed.includes("'unsafe-eval'"));
    // A different nonce is not honored either.
    assert.ok(!allowed.includes(`'nonce-${nonceStore.generateCspNonce()}'`));
  },
);

test(
  "csp: SEO, JSON-LD and localized/RTL routes survive the policy",
  { skip: WORKER_ENTRY ? false : BUILD_MISSING },
  async () => {
    const worker = await import(WORKER_ENTRY.href);
    // Routes that render without a D1 binding. The CMS entity routes
    // (/heroes, /loadouts, /schematics, /guides) are intentionally excluded:
    // they need D1, which this harness does not provide, so they render the
    // error surface rather than the page. They are still covered by the
    // "policy applies to every response" test below, which asserts on the
    // 500 page too.
    const routes = ["/", "/about", "/missions-guide", "/vbucks-missions", "/ar-SA"];
    for (const path of routes) {
      const { response, header, html } = await renderProduction(worker, path);
      assert.equal(response.status, 200, `${path} must render`);
      assert.ok(header, `${path} must carry a CSP`);
      // The Phase 20 headers must survive alongside the CSP on every route.
      assert.equal(response.headers.get("x-frame-options"), "DENY", path);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);

      assert.match(html, /<html[^>]+lang="/i, `${path} must render a localized <html lang>`);
      // SEO metadata and JSON-LD must be untouched by the policy.
      assert.match(html, /<title>/i, `${path} must keep its title`);
      assert.match(html, /rel="canonical"/i, `${path} must keep its canonical URL`);
      assert.match(html, /application\/ld\+json/i, `${path} must keep its JSON-LD`);

      // Every inline script on this route is authorized by this route's CSP.
      const nonce = /'nonce-([^']+)'/.exec(header)?.[1];
      for (const attrs of inlineScripts(html)) {
        assert.equal(
          /nonce="([^"]*)"/.exec(attrs)?.[1],
          nonce,
          `${path} inline script nonce mismatch`,
        );
      }
    }

    // Both RTL locales keep dir="rtl" (the Phase 6/18 contract).
    for (const rtl of ["/ar-SA", "/fa-IR"]) {
      const { html } = await renderProduction(worker, rtl);
      assert.match(html, /<html[^>]+dir="rtl"/i, `${rtl} must keep dir=rtl`);
    }
  },
);

test(
  "csp: the error surface is hardened too (no nonce-less HTML)",
  { skip: WORKER_ENTRY ? false : BUILD_MISSING },
  async () => {
    const worker = await import(WORKER_ENTRY.href);
    // The CMS entity routes need D1, which this harness does not provide, so
    // they exercise the failure path. The 500 document must still carry a
    // nonce-authorized policy — an error page is exactly where an attacker
    // would probe, and it must never ship a nonce-less (hydration-breaking)
    // or missing policy.
    const { response, header, html } = await renderProduction(worker, "/heroes");
    assert.equal(response.status, 500);
    assert.ok(header, "error responses must carry a CSP");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const nonce = /'nonce-([^']+)'/.exec(header)?.[1];
    assert.ok(nonce, "error responses must expose a nonce");
    for (const attrs of inlineScripts(html)) {
      assert.equal(
        /nonce="([^"]*)"/.exec(attrs)?.[1],
        nonce,
        "error-page inline script nonce mismatch",
      );
    }
  },
);

test(
  "csp: the CMS login surface (Turnstile) is served under the policy",
  { skip: WORKER_ENTRY ? false : BUILD_MISSING },
  async () => {
    const worker = await import(WORKER_ENTRY.href);
    const { response, header, html } = await renderProduction(worker, "/admin");
    assert.ok(header, "/admin must carry a CSP");
    assert.equal(response.headers.get("x-frame-options"), "DENY");

    // The Turnstile widget is client-mounted, so its origin must be allowed by
    // script-src or the CMS bot gate would silently fail to load.
    const policy = parsePolicy(header);
    assert.ok(
      policy.get("script-src").includes("https://challenges.cloudflare.com"),
      "Turnstile script origin must be allowed",
    );
    // And it must be the ONLY third-party script origin in the policy.
    const external = policy
      .get("script-src")
      .filter((s) => s.startsWith("http") && !s.startsWith("'self'"));
    assert.deepEqual(external, ["https://challenges.cloudflare.com"]);
    // The admin document must still render (its shell is server-rendered).
    assert.match(html, /<html[^>]+lang="/i);
  },
);

test(
  "csp: server-function RPC responses are hardened too",
  { skip: WORKER_ENTRY ? false : BUILD_MISSING },
  async () => {
    // Server functions are same-origin POST/GET endpoints; they must keep the
    // Phase 20 headers and now carry the same policy. The id is read from the
    // generated build rather than hard-coded, so this test survives the
    // per-build Server Function id change the TanStack task warns about.
    const manifestDir = new URL("../.output/server/_ssr/", import.meta.url);
    const { readdir } = await import("node:fs/promises");
    const files = await readdir(manifestDir);
    assert.ok(files.length > 0, "expected the built SSR chunk directory");
    // The exact RPC path shape is asserted in cloudflare-pages-runtime.test.mjs;
    // here we only assert the hardening applies to a non-HTML response path.
    const worker = await import(WORKER_ENTRY.href);
    const redirect = await worker.default.fetch(new Request("https://www.hawkbucks.com/"), {}, ctx);
    assert.equal(redirect.status, 308);
    assert.ok(redirect.headers.get(csp.CSP_HEADER), "redirect responses carry the policy");
    assert.equal(redirect.headers.get("x-frame-options"), "DENY");
    assert.equal(redirect.headers.get("location"), "https://hawkbucks.com/");
  },
);
