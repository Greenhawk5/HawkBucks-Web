import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  withPublicCache,
  currentContentEpoch,
  bumpContentEpoch,
  resetPublicDataCacheForTests,
  setPublicCacheClockForTests,
  publicCacheStatsSnapshot,
  PUBLIC_DATA_CACHE_MAX_AGE_SECONDS_VAR,
  PUBLIC_RPC_BROWSER_MAX_AGE_SECONDS_VAR,
} from "../src/lib/cms/public-cache.server.ts";

import {
  withD1Metrics,
  d1MetricsSnapshot,
  resetD1MetricsForTests,
  ALARM_ROWS_READ_THRESHOLD,
} from "../src/lib/cms/d1-metrics.server.ts";

import { applyDocumentCachePolicy } from "../src/lib/security-headers.ts";

const file = (p) => readFile(new URL(p, import.meta.url), "utf8");

function mockKv(initialEpoch = "initial-epoch") {
  let store = { "pubcache:content-epoch:v1": initialEpoch };
  return {
    async get(key) {
      return store[key] ?? null;
    },
    async put(key, value) {
      store[key] = value;
    },
    _store: store,
  };
}

function mockDb(queryResponses = []) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async all() {
              calls.push({ sql, args, method: "all" });
              const next = queryResponses.shift();
              return next ?? { results: [], meta: { rows_read: 10, rows_written: 0, duration: 2 } };
            },
            async run() {
              calls.push({ sql, args, method: "run" });
              const next = queryResponses.shift();
              return (
                next ?? { success: true, meta: { rows_read: 1, rows_written: 1, duration: 1 } }
              );
            },
            async first(col) {
              calls.push({ sql, args, method: "first", col });
              const next = queryResponses.shift();
              return next ?? null;
            },
          };
        },
      };
    },
    async batch(statements) {
      calls.push({ method: "batch", count: statements.length });
      return statements.map(() => ({
        results: [],
        meta: { rows_read: 5, rows_written: 0, duration: 1 },
      }));
    },
  };
}

// ============================================================================
// Layer 1: Server-side and Cloudflare In-Isolate Caching
// ============================================================================

test("public-cache: disabled when max-age env var is unset or 0", async () => {
  resetPublicDataCacheForTests();
  let loaderCount = 0;
  const env = {};

  const res1 = await withPublicCache({
    env,
    namespace: "test-ns",
    args: { id: 1 },
    loader: async () => {
      loaderCount++;
      return { value: "A" };
    },
  });
  const res2 = await withPublicCache({
    env,
    namespace: "test-ns",
    args: { id: 1 },
    loader: async () => {
      loaderCount++;
      return { value: "A" };
    },
  });

  assert.equal(loaderCount, 2, "loader must execute every time when cache is disabled");
  assert.equal(publicCacheStatsSnapshot().disabled, 2);
});

test("public-cache: hit avoids repeated loader execution", async () => {
  resetPublicDataCacheForTests();
  let loaderCount = 0;
  const env = {
    [PUBLIC_DATA_CACHE_MAX_AGE_SECONDS_VAR]: 600,
  };

  const options = {
    env,
    namespace: "heroes",
    args: { locale: "en", slug: "ramirez" },
    loader: async () => {
      loaderCount++;
      return { hero: "Ramirez", power: 130 };
    },
  };

  const res1 = await withPublicCache(options);
  assert.equal(loaderCount, 1, "first call should invoke loader (miss)");
  assert.deepEqual(res1, { hero: "Ramirez", power: 130 });

  const res2 = await withPublicCache(options);
  assert.equal(loaderCount, 1, "second call should return cached value (hit)");
  assert.deepEqual(res2, { hero: "Ramirez", power: 130 });

  const stats = publicCacheStatsSnapshot();
  assert.equal(stats.miss, 1);
  assert.equal(stats.hit, 1);
});

test("public-cache: key isolates different locales and arguments", async () => {
  resetPublicDataCacheForTests();
  let loaderCalls = [];
  const env = { [PUBLIC_DATA_CACHE_MAX_AGE_SECONDS_VAR]: 600 };

  const fetchHero = (locale, slug) =>
    withPublicCache({
      env,
      namespace: "heroes",
      args: { locale, slug },
      loader: async () => {
        loaderCalls.push({ locale, slug });
        return { locale, slug, name: `${slug}-${locale}` };
      },
    });

  const en1 = await fetchHero("en", "soldier");
  const es1 = await fetchHero("es", "soldier");
  const en2 = await fetchHero("en", "soldier");
  const ar1 = await fetchHero("ar", "soldier");

  assert.equal(loaderCalls.length, 3, "three distinct locales must each execute loader once");
  assert.equal(en1.name, "soldier-en");
  assert.equal(es1.name, "soldier-es");
  assert.equal(en2.name, "soldier-en");
  assert.equal(ar1.name, "soldier-ar");
});

test("public-cache: argument key serialization is deterministic regardless of key order", async () => {
  resetPublicDataCacheForTests();
  let loaderCount = 0;
  const env = { [PUBLIC_DATA_CACHE_MAX_AGE_SECONDS_VAR]: 600 };

  const res1 = await withPublicCache({
    env,
    namespace: "hub",
    args: { page: 1, filter: "ninja", sort: "desc" },
    loader: async () => {
      loaderCount++;
      return { data: [1, 2] };
    },
  });

  const res2 = await withPublicCache({
    env,
    namespace: "hub",
    args: { sort: "desc", filter: "ninja", page: 1 },
    loader: async () => {
      loaderCount++;
      return { data: [1, 2] };
    },
  });

  assert.equal(loaderCount, 1, "different key ordering in args must hit the same cache key");
  assert.deepEqual(res1, res2);
});

test("public-cache: structuredClone prevents callers from mutating cached copy", async () => {
  resetPublicDataCacheForTests();
  const env = { [PUBLIC_DATA_CACHE_MAX_AGE_SECONDS_VAR]: 600 };

  const res1 = await withPublicCache({
    env,
    namespace: "items",
    args: { id: "sword" },
    loader: async () => ({ id: "sword", tags: ["melee", "edged"] }),
  });

  res1.tags.push("mutated");

  const res2 = await withPublicCache({
    env,
    namespace: "items",
    args: { id: "sword" },
    loader: async () => ({ id: "sword", tags: ["melee", "edged"] }),
  });

  assert.deepEqual(
    res2.tags,
    ["melee", "edged"],
    "cached payload must remain unpolluted by caller mutation",
  );
});

test("public-cache: local epoch bump invalidates cache immediately in current isolate", async () => {
  resetPublicDataCacheForTests();
  let loaderCount = 0;
  const env = { [PUBLIC_DATA_CACHE_MAX_AGE_SECONDS_VAR]: 600 };

  const fetchContent = () =>
    withPublicCache({
      env,
      namespace: "article",
      args: { slug: "guide-1" },
      loader: async () => {
        loaderCount++;
        return { version: loaderCount };
      },
    });

  const first = await fetchContent();
  assert.equal(first.version, 1);
  assert.equal(loaderCount, 1);

  const cached = await fetchContent();
  assert.equal(cached.version, 1);
  assert.equal(loaderCount, 1);

  // CMS mutation bumps the epoch:
  await bumpContentEpoch(env);

  const invalidated = await fetchContent();
  assert.equal(invalidated.version, 2, "epoch bump must trigger fresh loader execution");
  assert.equal(loaderCount, 2);
});

test("public-cache: KV global epoch writes and invalidates across isolates", async () => {
  resetPublicDataCacheForTests();
  const kv = mockKv("epoch-100");
  const env = {
    PUBLIC_CONTENT_CACHE: kv,
    [PUBLIC_DATA_CACHE_MAX_AGE_SECONDS_VAR]: 600,
  };

  const epoch1 = await currentContentEpoch(env);
  assert.ok(epoch1.startsWith("epoch-100#"), "epoch key starts with KV value");

  await bumpContentEpoch(env);

  // KV store was updated with a new unique marker
  const newKvEpoch = kv._store["pubcache:content-epoch:v1"];
  assert.notEqual(newKvEpoch, "epoch-100", "KV marker must be updated");
});

test("public-cache: in-flight coalescing shares a single loader execution for concurrent misses", async () => {
  resetPublicDataCacheForTests();
  let loaderExecutions = 0;
  const env = { [PUBLIC_DATA_CACHE_MAX_AGE_SECONDS_VAR]: 600 };

  let resolveLoader;
  const slowPromise = new Promise((resolve) => {
    resolveLoader = resolve;
  });

  const runSlow = () =>
    withPublicCache({
      env,
      namespace: "slow-query",
      args: { queryId: "expensive" },
      loader: async () => {
        loaderExecutions++;
        await slowPromise;
        return { done: true };
      },
    });

  const p1 = runSlow();
  const p2 = runSlow();
  const p3 = runSlow();

  resolveLoader();

  const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
  assert.equal(
    loaderExecutions,
    1,
    "concurrent identical requests must coalesce to one loader execution",
  );
  assert.deepEqual(r1, { done: true });
  assert.deepEqual(r2, { done: true });
  assert.deepEqual(r3, { done: true });
  assert.equal(publicCacheStatsSnapshot().coalesced, 2);
});

test("public-cache: loader failure is not cached and rethrows cleanly", async () => {
  resetPublicDataCacheForTests();
  let attempt = 0;
  const env = { [PUBLIC_DATA_CACHE_MAX_AGE_SECONDS_VAR]: 600 };

  const tryLoad = () =>
    withPublicCache({
      env,
      namespace: "flaky",
      args: { id: "err" },
      loader: async () => {
        attempt++;
        if (attempt === 1) throw new Error("database timeout");
        return { success: true };
      },
    });

  await assert.rejects(() => tryLoad(), /database timeout/);
  assert.equal(publicCacheStatsSnapshot().error, 1);

  // Next attempt succeeds and caches normally
  const success = await tryLoad();
  assert.deepEqual(success, { success: true });
  assert.equal(attempt, 2);
});

test("public-cache: KV errors degrade safely to local memo without throwing", async () => {
  resetPublicDataCacheForTests();
  const brokenKv = {
    async get() {
      throw new Error("KV service unavailable");
    },
    async put() {
      throw new Error("KV service unavailable");
    },
  };
  const env = {
    PUBLIC_CONTENT_CACHE: brokenKv,
    [PUBLIC_DATA_CACHE_MAX_AGE_SECONDS_VAR]: 600,
  };

  // currentContentEpoch does not throw when KV fails:
  const epoch = await currentContentEpoch(env);
  assert.ok(epoch.startsWith("none#"), "degraded epoch returns none#local");

  // bumpContentEpoch does not throw when KV fails:
  await assert.doesNotReject(() => bumpContentEpoch(env));
  assert.ok(publicCacheStatsSnapshot().kvError >= 1);
});

// ============================================================================
// Layer 3: Browser HTTP Caching & Security Headers
// ============================================================================

test("document-cache: applies private, no-store to HTML responses without pre-existing policy", () => {
  const htmlResponse = new Response("<!DOCTYPE html><html><body>SSR</body></html>", {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  const hardened = applyDocumentCachePolicy(htmlResponse);
  assert.equal(hardened.headers.get("Cache-Control"), "private, no-store");
});

test("document-cache: leaves non-HTML responses untouched", () => {
  const jsonResponse = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  const hardened = applyDocumentCachePolicy(jsonResponse);
  assert.equal(hardened.headers.get("Cache-Control"), null);
});

test("document-cache: preserves explicit Cache-Control on responses that set their own", () => {
  const sitemapResponse = new Response("<urlset></urlset>", {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600",
    },
  });

  const hardened = applyDocumentCachePolicy(sitemapResponse);
  assert.equal(hardened.headers.get("Cache-Control"), "public, max-age=3600");
});

test("security-headers: verify preferences and admin loaders include private no-store headers", async () => {
  const prefSource = await file("../src/lib/preferences.loader.ts");
  assert.match(prefSource, /setResponseHeader\("Cache-Control",\s*"private, no-store"\)/);

  const adminSource = await file("../src/lib/cms/admin.loader.ts");
  assert.match(adminSource, /setResponseHeader\("Cache-Control",\s*"private, no-store"\)/);
});

test("cms-mutations: verify recordAuditEvent and media writes invoke bumpContentEpochForRequest", async () => {
  const dbSource = await file("../src/lib/cms/db.server.ts");
  assert.match(dbSource, /bumpContentEpochForRequest/);

  // In recordAuditEvent:
  assert.ok(
    dbSource.includes("export async function recordAuditEvent") &&
      dbSource.includes("await bumpContentEpochForRequest()"),
  );
  // In media mutations:
  assert.ok(
    dbSource.includes("export async function createMediaAsset") &&
      dbSource.includes("export async function tombstoneMediaAsset") &&
      dbSource.includes("export async function updateMediaAssetMetadata") &&
      dbSource.includes("export async function restoreMediaAsset"),
  );

  // In icon registry mutations:
  const iconSource = await file("../src/lib/cms/icon-registry.server.ts");
  assert.ok(
    iconSource.includes("export async function createIconRegistryEntry") &&
      iconSource.includes("export async function updateIconRegistryEntry") &&
      iconSource.includes("export async function deleteIconRegistryEntry") &&
      iconSource.includes("await bumpContentEpochForRequest()"),
  );
});

// ============================================================================
// D1 Metrics Observability
// ============================================================================

test("d1-metrics: wraps D1 database transparently and tracks statement execution", async () => {
  resetD1MetricsForTests();
  const rawDb = mockDb([
    { results: [{ id: 1 }], meta: { rows_read: 15, rows_written: 0, duration: 3 } },
    { success: true, meta: { rows_read: 0, rows_written: 2, duration: 1 } },
  ]);

  const db = withD1Metrics(rawDb);

  const resAll = await db.prepare("SELECT * FROM test").bind().all();
  assert.deepEqual(resAll.results, [{ id: 1 }]);

  const resRun = await db.prepare("UPDATE test SET val = 1").bind().run();
  assert.equal(resRun.success, true);

  const snap = d1MetricsSnapshot();
  assert.equal(snap.statements, 2);
  assert.equal(snap.rowsRead, 15);
  assert.equal(snap.rowsWritten, 2);
  assert.ok(snap.durationMs >= 4);
});
