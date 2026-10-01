// Wave 2 — draft-editor Outlet, auth telemetry privacy, activity intel, SEO
// diagnostics. Exercised through source assertions + pure helpers + the
// in-memory D1 double pattern (never production resources).
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-wave2-activity.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const file = (p) => readFile(new URL(p, import.meta.url), "utf8");

const telemetry = await import("../src/lib/cms/auth-telemetry.server.ts");

// ---------------------------------------------------------------------------
// Draft editor: child routes must render through a parent Outlet.
// ---------------------------------------------------------------------------

test("wave2: list routes render an Outlet so child editors paint", async () => {
  for (const f of [
    "../src/routes/admin/articles.tsx",
    "../src/routes/admin/heroes.tsx",
    "../src/routes/admin/loadouts.tsx",
    "../src/routes/admin/inventory.tsx",
  ]) {
    const source = await file(f);
    assert.match(source, /<Outlet \/>/, `${f} must render <Outlet /> for its child editor`);
    assert.match(source, /import \{[^}]*Outlet[^}]*\} from "@tanstack\/react-router"/);
  }
});

test("wave2: editor routes remain child routes of their list parents", async () => {
  const gen = await file("../src/routeTree.gen.ts");
  for (const pair of [
    ["AdminArticlesContentIdRoute", "AdminArticlesRoute"],
    ["AdminHeroesContentIdRoute", "AdminHeroesRoute"],
    ["AdminLoadoutsContentIdRoute", "AdminLoadoutsRoute"],
    ["AdminInventoryContentIdRoute", "AdminInventoryRoute"],
  ]) {
    assert.ok(gen.includes(pair[0]), `${pair[0]} registered`);
    assert.ok(gen.includes(pair[1]), `${pair[1]} registered`);
  }
});

// ---------------------------------------------------------------------------
// Auth telemetry: privacy contract at write time.
// ---------------------------------------------------------------------------

test("wave2: device parser never echoes the raw user-agent", () => {
  const chrome = telemetry.parseDeviceLabel(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  );
  assert.equal(chrome.label, "Chrome · Windows · Desktop");
  assert.equal(chrome.kind, "desktop");
  const safari = telemetry.parseDeviceLabel(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  );
  assert.equal(safari.label, "Safari · macOS · Desktop");
  const android = telemetry.parseDeviceLabel(
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
  );
  assert.equal(android.kind, "mobile");
  assert.ok(!android.label.includes("Pixel 8"), "raw UA details must not leak into the label");
  const unknown = telemetry.parseDeviceLabel(null);
  assert.equal(unknown.kind, "unknown");
  assert.ok(!String(unknown.label).includes("Mozilla"), "null UA stays Unknown");
});

test("wave2: IP hashing never stores the raw IP", async () => {
  const h1 = await telemetry.hashClientIp("203.0.113.7");
  assert.ok(typeof h1 === "string" && h1.length === 64, "sha-256 hex digest");
  assert.ok(!String(h1).includes("203.0.113"), "digest must not contain the IP");
  const h2 = await telemetry.hashClientIp("203.0.113.7");
  assert.equal(h1, h2, "deterministic per IP");
  assert.equal(await telemetry.hashClientIp(null), null);
  assert.equal(await telemetry.hashClientIp(""), null);
});

test("wave2: coarse geo trusts only Cloudflare headers, rejects junk", () => {
  const req = new Request("https://cms.local/admin", {
    headers: { "cf-ipcountry": "FR", "cf-region-code": "IDF", "cf-city": "Paris" },
  });
  assert.deepEqual(telemetry.readCoarseGeo(req), {
    country: "FR",
    region: "IDF",
    city: "Paris",
  });
  assert.deepEqual(telemetry.readCoarseGeo(null), { country: null, region: null, city: null });
  const evil = new Request("https://cms.local/admin", {
    headers: { "cf-ipcountry": "FR<script>", "x-forwarded-for": "1.2.3.4" },
  });
  const geo = telemetry.readCoarseGeo(evil);
  assert.equal(geo.country, null, "injection rejected");
  const unknown = new Request("https://cms.local/admin", {
    headers: { "cf-ipcountry": "XX" },
  });
  assert.equal(telemetry.readCoarseGeo(unknown).country, null, "XX marker is no signal");
});

test("wave2: telemetry insert stores hashes/labels, never secrets", async () => {
  const inserted = [];
  const db = {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            first: async () => null,
            all: async () => ({ results: [] }),
            run: async () => {
              inserted.push({ sql, params });
              return {};
            },
          };
        },
      };
    },
  };
  await telemetry.recordAuthTelemetry(db, {
    kind: "login",
    outcome: "failure",
    username: "local-admin",
    clientIp: "203.0.113.7",
    country: "FR",
    region: "IDF",
    city: "Paris",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36",
    at: "2026-09-28T10:00:00.000Z",
  });
  assert.equal(inserted.length, 1);
  const params = inserted[0].params;
  const flat = JSON.stringify(params);
  assert.ok(!flat.includes("203.0.113.7"), "raw IP must never reach D1");
  assert.ok(!flat.includes("Mozilla/5.0"), "raw User-Agent must never reach D1");
  assert.ok(flat.includes("local-admin"), "username is the audit identifier");
  assert.ok(flat.includes("Chrome"), "parsed device label stored");
  assert.ok(flat.includes("FR"), "coarse country stored");
});

test("wave2: telemetry never throws (missing table degrades silently)", async () => {
  const db = {
    prepare() {
      throw new Error("no such table: cms_auth_events");
    },
  };
  await telemetry.recordAuthTelemetry(db, { kind: "login", outcome: "success" });
});

// ---------------------------------------------------------------------------
// Login/logout wiring emits telemetry without changing failure shapes.
// ---------------------------------------------------------------------------

test("wave2: login + logout boundaries record auth telemetry", async () => {
  const adminLoader = await file("../src/lib/cms/admin.loader.ts");
  assert.match(adminLoader, /recordAuthTelemetry/);
  assert.match(adminLoader, /kind: "login"/);
  assert.match(adminLoader, /outcome: "success"/);
  assert.match(adminLoader, /outcome: "failure"/);
  assert.match(adminLoader, /kind: "logout"/);
  // Generic failure surface preserved — no oracle distinguishes causes.
  assert.match(adminLoader, /Invalid credentials/);
});

test("wave2: session expiry records session_expired telemetry", async () => {
  const auth = await file("../src/lib/cms/auth.server.ts");
  assert.match(auth, /session_expired/);
});

test("wave2: preview issuance is audited as preview.issue", async () => {
  const articlesAdmin = await file("../src/lib/cms/articles-admin.loader.ts");
  assert.match(articlesAdmin, /preview\.issue/);
  assert.match(articlesAdmin, /recordAuditEvent/);
});

// ---------------------------------------------------------------------------
// Activity intel + SEO diagnostics: server-side, real-data-only.
// ---------------------------------------------------------------------------

test("wave2: activity intel readers filter server-side with honest fallbacks", async () => {
  const source = await file("../src/lib/cms/activity-intel.loader.ts");
  assert.match(source, /listActivityEvents/);
  assert.match(source, /getActivitySummary/);
  assert.match(source, /getActivitySeries/);
  assert.match(source, /listAuthEvents/);
  assert.match(source, /cms\.admin/);
  assert.match(source, /ORDER BY created_at DESC/);
  assert.match(source, /available: false/);
  // No fabricated trends — counts with explicit windows only.
  assert.doesNotMatch(source, /\+12%|percent.*change|trend.*percent/i);
});

test("wave2: dashboard security snapshot shows windowed counts honestly", async () => {
  const source = await file("../src/routes/admin/index.tsx");
  assert.match(source, /getActivitySummary/);
  assert.match(source, /Security · last 7 days/);
  assert.match(source, /Failed logins/);
  // No fabricated trend deltas ("+12%", "-4%") — CSS widths/opacity excluded
  // by requiring a digit adjacent to the sign and percent.
  assert.doesNotMatch(source, /[+-]\d[\d.]*%/);
});

test("wave2: SEO diagnostics count published rows, never score", async () => {
  const loader = await file("../src/lib/cms/seo-diagnostics.loader.ts");
  assert.match(loader, /c\.status = 'published'/);
  assert.match(loader, /missingSeoTitle|missingSeoDescription|missingOgImage/);
  // No synthetic rankings/crawlers/search-console metrics — the words only
  // appear in the "never do this" doc comments, so scope the ban to code-ish
  // constructs (identifiers, UI strings) rather than prose.
  assert.doesNotMatch(loader, /seoScore|rankingSignal|crawlFrequency|searchVolume/i);
  assert.doesNotMatch(loader, /"[^"]*(?:ranking|clicks|impressions)[^"]*"/i);
  const page = await file("../src/routes/admin/seo.tsx");
  assert.match(page, /Factual metadata diagnostics only/);
  assert.match(page, /not a/);
  assert.doesNotMatch(page, /SEO score/i);
});

test("wave2: settings console exposes status, never secrets", async () => {
  const loader = await file("../src/lib/cms/settings-status.loader.ts");
  assert.match(loader, /getSettingsStatus/);
  assert.match(loader, /turnstile/);
  assert.match(loader, /r2BucketBound/);
  // Status only — no secret VALUES cross this boundary. Doc comments name
  // env keys to explain what is NOT exposed; ban actual value access.
  assert.doesNotMatch(loader, /env\.CMS_TURNSTILE_SECRET|env\.IMAGEKIT_PRIVATE_KEY/);
  assert.doesNotMatch(loader, /password_hash|private_key/i);
  const page = await file("../src/routes/admin/settings.tsx");
  assert.match(page, /Managed server-side|by design|never displayed/i);
});

test("wave2: activity chart is lazy and honest about empty history", async () => {
  const chart = await file("../src/components/cms/cc/CmsActivityChart.tsx");
  assert.match(chart, /lazy/);
  assert.match(chart, /recharts/);
  assert.match(chart, /No activity in this period yet/);
  assert.match(chart, /never backfilled|not filled in/);
  const activity = await file("../src/routes/admin/activity.tsx");
  assert.match(activity, /CmsActivityChart/);
  assert.match(activity, /Login history/);
  assert.match(activity, /Every number below is computed from stored events/);
});
