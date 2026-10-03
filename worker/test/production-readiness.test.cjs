// Phase 23 — production-hardening regressions for the backend Worker.
//
// These lock in the Worker defects this phase fixed, asserted against the REAL
// shipped `worker/index.js` source (same extraction pattern as the sibling
// worker suites: slice the production text, evaluate it, call the shipped
// functions). No production bindings or credentials are involved — every env
// below is a local fake.
//
// Run: node --test test/production-readiness.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync(`${__dirname}/../index.js`, "utf8");

function extract(startMarker, endMarker, names) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start !== -1 && end > start, `block not found: ${startMarker}`);
  return new Function(`${source.slice(start, end)}\nreturn { ${names.join(", ")} };`)();
}

// handleMissions depends on `json` (response helper), `getCachedMissionData`
// (the KV read) and KV_MISSIONS_KEY (the cache key). Slice the real `json`
// helper and the real KV reader alongside it; only KV_MISSIONS_KEY is a
// constant, so it is restated verbatim from the source below.
function extractHandleMissions() {
  const jsonStart = source.indexOf("const defaultResponseHeaders");
  const missionsStart = source.indexOf("async function handleMissions(env)");
  const missionsEnd = source.indexOf("export default {", missionsStart);

  const jsonBlock = source.slice(jsonStart, source.indexOf("async function refreshToken", jsonStart));
  const kvReadStart = source.indexOf("async function getCachedMissionData");
  const kvReadEnd = source.indexOf("function utcDateString", kvReadStart);
  const kvRead = source.slice(kvReadStart, kvReadEnd);
  const handler = source.slice(missionsStart, missionsEnd);

  const keyLine = source.match(/^const KV_MISSIONS_KEY = .*$/m);
  assert.ok(keyLine, "KV_MISSIONS_KEY not found");

  return new Function(
    `${keyLine[0]}\n${jsonBlock}\n${kvRead}\n${handler}\nreturn { handleMissions };`,
  )();
}

const { handleMissions } = extractHandleMissions();

const body = async (response) => JSON.parse(await response.text());

// --- DEFECT: /api/missions had no KV guard and no try/catch ------------------
//
// `handleMissions` called `getCachedMissionData(env)`, which dereferences
// `env.HAWKBUCKS_CACHE.get(...)` unguarded. A missing KV binding threw a
// TypeError and a KV outage threw too; both escaped `fetch` as an unhandled
// rejection (Workers reports a generic 1101/500) instead of the documented
// `503 {status:'unavailable'}` envelope the frontend parses. `handleHistory`
// and `handleQuote` were already guarded — /api/missions was the outlier, and
// it is the endpoint the entire site depends on.

test("regression: /api/missions returns 503 unavailable when the KV binding is missing", async () => {
  const response = await handleMissions({});

  assert.equal(response.status, 503);
  const payload = await body(response);
  assert.equal(payload.success, false);
  assert.equal(payload.status, "unavailable");
  assert.deepEqual(payload.missions, []);
  assert.equal(payload.totalVbucks, 0);
  assert.equal(payload.lastUpdated, null);
});

test("regression: /api/missions returns 503 unavailable when KV throws (outage)", async () => {
  const env = {
    HAWKBUCKS_CACHE: {
      get() {
        throw new Error("KV unavailable");
      },
    },
  };

  const response = await handleMissions(env);

  assert.equal(response.status, 503);
  assert.equal((await body(response)).status, "unavailable");
});

test("regression: /api/missions returns 503 unavailable on an empty KV cache", async () => {
  const env = { HAWKBUCKS_CACHE: { get: async () => null } };

  const response = await handleMissions(env);

  assert.equal(response.status, 503);
  assert.equal((await body(response)).status, "unavailable");
});

test("regression: /api/missions still serves cached data unchanged when healthy", async () => {
  const cached = {
    success: true,
    status: "available",
    lastUpdated: "2026-09-26T00:05:00.000Z",
    totalVbucks: 120,
    missions: [{ id: "m1", mission: "Resupply", reward: 120 }],
  };
  const env = { HAWKBUCKS_CACHE: { get: async () => cached } };

  const response = await handleMissions(env);

  assert.equal(response.status, 200);
  assert.deepEqual(await body(response), cached);
});

// --- DEFECT: /api/health reported 'ok' with every binding missing -------------
//
// The health endpoint is the only readiness signal this repo exposes for a
// deployment smoke test (the Worker is internal-only — `workers_dev = false` —
// so it is reached through the Service Binding, never from a browser). It
// returned an unconditional `status: 'ok'`, which stayed green with no KV, no
// D1 and no VAPID: a readiness check that could not fail.

test("regression: /api/health reports binding readiness instead of a constant 'ok'", () => {
  const start = source.indexOf("url.pathname === '/api/health'");
  // Slice to EOF rather than matching a multi-line literal (line endings vary
  // by checkout platform); the health handler is the last block in `fetch`.
  const healthSrc = source.slice(start);
  assert.ok(start !== -1 && healthSrc.length > 0, "health handler not found");

  // Each check must derive from the real binding, not be hardcoded true.
  assert.match(healthSrc, /kv: Boolean\(env\.HAWKBUCKS_CACHE\)/);
  assert.match(healthSrc, /db: Boolean\(env\.DB\)/);
  assert.match(healthSrc, /VAPID_PUBLIC_KEY && env\.VAPID_PRIVATE_JWK/);
  // 'ok' may only be reported when the mission-serving dependency is present.
  assert.match(healthSrc, /const healthy = checks\.kv;/);
  assert.match(healthSrc, /status: healthy \? 'ok' : 'degraded'/);
});

// --- Cron safety: the scheduled handler must never throw out of waitUntil -----

// `scheduled` is an object-literal METHOD, so the generic slice above cannot
// evaluate it as a bare declaration. Rewrite the method head into a function
// expression (`async scheduled(a,b,c) {` -> `const __scheduled = async function (a,b,c) {`)
// so the exact production body can still be exercised.
//
// Its body calls sibling helpers (utcDateString, migrateLegacyKvRecords,
// seedReferenceHistory, ensureDailyQuote, fetchMissionData, saveMissionData,
// ...), so the preceding helper slice is included alongside it — the same
// technique `history.test.cjs` uses for getCalendarHistory. Anything those
// helpers reference that is not defined here becomes a test-local stub below.
function extractScheduled() {
  const helpersStart = source.indexOf("function utcDateString");
  const defaultExport = source.indexOf("export default {");
  const scheduledStart = source.indexOf("async scheduled(controller, env, ctx)");
  const end = source.indexOf("\n};", scheduledStart);
  assert.ok(
    helpersStart !== -1 && defaultExport > helpersStart && scheduledStart > defaultExport,
    "blocks not found",
  );

  // Slice every helper up to (but excluding) the `export default {` line — a
  // bare `export` is a syntax error inside `new Function`.
  const helpers = source.slice(helpersStart, defaultExport);
  const method = source.slice(scheduledStart, end).replace(
    "async scheduled(controller, env, ctx)",
    "const __scheduled = async function (controller, env, ctx)",
  );

  // Stubs for module-scope helpers that live OUTSIDE the extracted slices.
  const stubs = `
    const defaultResponseHeaders = { 'Content-Type': 'application/json; charset=utf-8' };
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: defaultResponseHeaders });
    const QUOTE_POOL = ['stub-quote'];
    const fetchMissionData = async () => { throw new Error('epic unreachable in test'); };
  `;

  return new Function(`${stubs}\n${helpers}\n${method}\nreturn __scheduled;`)();
}

const scheduled = extractScheduled();

async function runCron(env) {
  const pending = [];
  await scheduled({ scheduledTime: Date.now() }, env, { waitUntil: (p) => pending.push(p) });
  // Every branch must catch internally; a rejection aborts the whole tick.
  for (const promise of pending) await assert.doesNotReject(() => promise);
}

test("regression: scheduled() survives D1/KV/push being entirely absent", async () => {
  await runCron({});
});

test("regression: scheduled() tolerates a half-configured environment", async () => {
  await runCron({ HAWKBUCKS_CACHE: { get: async () => null, put: async () => {} } });
});

test("regression: scheduled() tolerates a KV that throws on every call", async () => {
  const boom = {
    get() {
      throw new Error("KV unavailable");
    },
    put() {
      throw new Error("KV unavailable");
    },
  };
  await runCron({ HAWKBUCKS_CACHE: boom, DB: { prepare: () => ({ bind: () => ({ first: async () => null, run: async () => ({}) }) }), batch: async () => [] } });
});