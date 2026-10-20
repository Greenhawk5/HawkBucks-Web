import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  DEFAULT_FEATURE_AVAILABILITY,
  DEFAULT_FEATURE_MESSAGES,
  FEATURE_KEYS,
  sanitizeMessage,
  computeBulkState,
  featureAvailabilitySchema,
  MAX_MESSAGE_LENGTH,
} from "../src/lib/cms/feature-availability.ts";

import {
  getFeatureAvailability,
  saveFeatureAvailability,
  assertFeatureEnabled,
  isFeatureEnabled,
  CmsFeatureUnavailableError,
  CmsConcurrencyError,
  resetFeatureAvailabilityCacheForTests,
  setFeatureAvailabilityClockForTests,
  FEATURE_AVAILABILITY_CONTENT_ID,
} from "../src/lib/cms/feature-availability.server.ts";

function createMockDb(initialRows = {}) {
  // in-memory store simulating D1 tables
  const contents = new Map(initialRows.contents ?? []);
  const translations = new Map(initialRows.translations ?? []);
  const auditEvents = [];
  const log = [];

  const db = {
    contents,
    translations,
    auditEvents,
    log,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first(col) {
              log.push({ sql, args, op: "first" });
              if (
                sql.includes("FROM cms_contents c") &&
                sql.includes("JOIN cms_content_translations t")
              ) {
                const contentId = args[0];
                const c = contents.get(contentId);
                const t = translations.get(`${contentId}:en`);
                if (!c || !t) return null;
                const row = { updated_at: c.updated_at, body: t.body };
                if (col && typeof col === "string") return row[col];
                return row;
              }
              return null;
            },
            async all() {
              log.push({ sql, args, op: "all" });
              return { results: [], meta: { rows_read: 0, rows_written: 0, duration: 0 } };
            },
            async run() {
              log.push({ sql, args, op: "run" });
              if (sql.includes("INSERT INTO cms_audit_events")) {
                auditEvents.push({ args });
              }
              return { success: true, meta: { rows_read: 0, rows_written: 1, duration: 0 } };
            },
          };
        },
      };
    },
    async batch(statements) {
      log.push({ op: "batch", count: statements.length });
      for (const s of statements) {
        if (s) {
          // simulate content and translation upserts
          const bound = s._boundArgs ?? [];
          const sql = s._sql ?? "";
          if (sql.includes("INSERT INTO cms_contents")) {
            const [id, publishedAt, createdBy, updatedBy, createdAt, updatedAt] = bound;
            contents.set(id, { id, published_at: publishedAt, updated_at: updatedAt });
          } else if (sql.includes("INSERT INTO cms_content_translations")) {
            const [id, contentId, body, createdAt, updatedAt] = bound;
            translations.set(`${contentId}:en`, {
              id,
              content_id: contentId,
              body,
              updated_at: updatedAt,
            });
          }
        }
      }
      return [];
    },
  };

  // Enhance prepare to track boundArgs for batch simulation
  const originalPrepare = db.prepare;
  db.prepare = function (sql) {
    const prep = originalPrepare.call(this, sql);
    return {
      bind(...args) {
        const bound = prep.bind(...args);
        bound._sql = sql;
        bound._boundArgs = args;
        return bound;
      },
    };
  };

  return db;
}

function createMockKv() {
  const store = new Map();
  const lastPutOptions = {};
  return {
    _store: store,
    _lastPutOptions: lastPutOptions,
    async get(key, options) {
      store.set("__getOptions", options ?? null);
      return store.get(key) ?? null;
    },
    async put(key, val, options) {
      Object.assign(lastPutOptions, { key, value: val, options: options ?? null });
      store.set(key, val);
    },
  };
}

/** D1 double whose statement execution rejects: simulates quota exhaustion / outage. */
function createFailingDb() {
  const log = [];
  return {
    log,
    prepare(sql) {
      return {
        bind(...args) {
          log.push({ sql, args, op: "prepare" });
          return {
            async first() {
              log.push({ sql, args, op: "first" });
              throw new Error("D1_ERROR: too many reads (quota exhausted)");
            },
            async all() {
              log.push({ sql, args, op: "all" });
              throw new Error("D1_ERROR: too many reads (quota exhausted)");
            },
            async run() {
              log.push({ sql, args, op: "run" });
              throw new Error("D1_ERROR: too many reads (quota exhausted)");
            },
          };
        },
      };
    },
    async batch() {
      log.push({ op: "batch" });
      throw new Error("D1_ERROR: too many reads (quota exhausted)");
    },
  };
}

test.beforeEach(() => {
  resetFeatureAvailabilityCacheForTests();
  setFeatureAvailabilityClockForTests(() => 1700000000000);
});

/** Replaces the pinned beforeEach clock with a locally mutable one. */
function startMutableClock() {
  let clockMs = 1700000000000;
  setFeatureAvailabilityClockForTests(() => clockMs);
  return (deltaMs) => {
    clockMs += deltaMs;
  };
}

// ---------------------------------------------------------------------------
// 1. CONFIGURATION & DEFAULTS
// ---------------------------------------------------------------------------

test("Feature availability defaults: genuinely absent record returns all four sections enabled", async () => {
  const db = createMockDb();
  const { config, updatedAt } = await getFeatureAvailability(db);

  assert.equal(updatedAt, "");
  for (const key of FEATURE_KEYS) {
    assert.equal(config[key].enabled, true);
    assert.equal(config[key].message, DEFAULT_FEATURE_MESSAGES[key]);
  }
});

test("Failure semantics: malformed stored JSON is never converted into an enabled configuration", async () => {
  const db = createMockDb({
    contents: [[FEATURE_AVAILABILITY_CONTENT_ID, { updated_at: "2026-01-01T00:00:00.000Z" }]],
    translations: [[`${FEATURE_AVAILABILITY_CONTENT_ID}:en`, { body: "NOT_VALID_JSON{{" }]],
  });

  // No retainable last-known-good exists in this fresh isolate, so the
  // database-safe fallback applies: all four sections disabled (zero
  // protected content queries), never silently re-armed as enabled.
  const { config } = await getFeatureAvailability(db);
  for (const key of FEATURE_KEYS) {
    assert.equal(config[key].enabled, false, `${key} must not be re-armed by a corrupt record`);
  }
});

test("Feature availability defaults: partial configuration retains existing values and defaults missing keys", async () => {
  const partial = {
    heroes: { enabled: false, message: "Custom Heroes offline" },
    // schematics, loadouts, guides omitted
  };
  const db = createMockDb({
    contents: [[FEATURE_AVAILABILITY_CONTENT_ID, { updated_at: "2026-01-01T00:00:00.000Z" }]],
    translations: [[`${FEATURE_AVAILABILITY_CONTENT_ID}:en`, { body: JSON.stringify(partial) }]],
  });

  const { config } = await getFeatureAvailability(db);
  assert.equal(config.heroes.enabled, false);
  assert.equal(config.heroes.message, "Custom Heroes offline");
  assert.equal(config.schematics.enabled, true);
  assert.equal(config.loadouts.enabled, true);
  assert.equal(config.guides.enabled, true);
});

// ---------------------------------------------------------------------------
// 2. SANITIZATION & VALIDATION
// ---------------------------------------------------------------------------

test("Sanitization: collapses raw HTML angle brackets to safe text entities", () => {
  const dangerous = "Temporarily offline <script>alert('xss')</script> & safe";
  const sanitized = sanitizeMessage(dangerous, "heroes");
  assert.ok(!sanitized.includes("<script>"));
  assert.ok(sanitized.includes("&lt;script&gt;"));
});

test("Sanitization: enforces maximum message length bound (500 chars)", () => {
  const longMsg = "A".repeat(800);
  const sanitized = sanitizeMessage(longMsg, "heroes");
  assert.equal(sanitized.length, MAX_MESSAGE_LENGTH);
});

test("Sanitization: empty or whitespace-only message reverts to section default message", () => {
  assert.equal(sanitizeMessage("", "heroes"), DEFAULT_FEATURE_MESSAGES.heroes);
  assert.equal(sanitizeMessage("   ", "schematics"), DEFAULT_FEATURE_MESSAGES.schematics);
  assert.equal(sanitizeMessage(null, "loadouts"), DEFAULT_FEATURE_MESSAGES.loadouts);
});

test("Zod schema: validates complete valid config and rejects malformed payloads", () => {
  const valid = {
    heroes: { enabled: true, message: "Heroes OK" },
    schematics: { enabled: false, message: "Schematics down" },
    loadouts: { enabled: true, message: "Loadouts OK" },
    guides: { enabled: true, message: "Guides OK" },
  };
  const parsed = featureAvailabilitySchema.safeParse(valid);
  assert.equal(parsed.success, true);

  const missingKey = {
    heroes: { enabled: true, message: "Heroes OK" },
  };
  assert.equal(featureAvailabilitySchema.safeParse(missingKey).success, false);

  const invalidType = {
    ...valid,
    heroes: { enabled: "yes", message: "Heroes" },
  };
  assert.equal(featureAvailabilitySchema.safeParse(invalidType).success, false);
});

// ---------------------------------------------------------------------------
// 3. BULK STATE COMPUTATION
// ---------------------------------------------------------------------------

test("computeBulkState: correctly reflects all_enabled, all_disabled, and mixed states", () => {
  const allOn = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
  assert.equal(computeBulkState(allOn), "all_enabled");

  const allOff = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
  for (const k of FEATURE_KEYS) allOff[k].enabled = false;
  assert.equal(computeBulkState(allOff), "all_disabled");

  const mixed = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
  mixed.heroes.enabled = false;
  assert.equal(computeBulkState(mixed), "mixed");
});

// ---------------------------------------------------------------------------
// 4. PERSISTENCE & CONCURRENCY
// ---------------------------------------------------------------------------

test("Persistence: saveFeatureAvailability persists settings and writes audit record", async () => {
  const db = createMockDb();
  const actor = { id: "admin-1", username: "superadmin" };

  const toSave = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
  toSave.heroes.enabled = false;
  toSave.heroes.message = "Heroes undergoing maintenance.";

  const result = await saveFeatureAvailability(db, { config: toSave }, actor);
  assert.equal(result.success, true);
  assert.equal(result.config.heroes.enabled, false);
  assert.equal(result.config.heroes.message, "Heroes undergoing maintenance.");

  // Verify DB state
  const storedContent = db.contents.get(FEATURE_AVAILABILITY_CONTENT_ID);
  assert.ok(storedContent);
  const storedTrans = db.translations.get(`${FEATURE_AVAILABILITY_CONTENT_ID}:en`);
  assert.ok(storedTrans);
  const parsedBody = JSON.parse(storedTrans.body);
  assert.equal(parsedBody.heroes.enabled, false);

  // Verify audit event was logged
  assert.equal(db.auditEvents.length, 1);
});

test("Optimistic concurrency: rejects write when expectedUpdatedAt does not match existing record (409)", async () => {
  const db = createMockDb({
    contents: [[FEATURE_AVAILABILITY_CONTENT_ID, { updated_at: "2026-05-01T12:00:00.000Z" }]],
    translations: [
      [
        `${FEATURE_AVAILABILITY_CONTENT_ID}:en`,
        { body: JSON.stringify(DEFAULT_FEATURE_AVAILABILITY) },
      ],
    ],
  });
  const actor = { id: "admin-1", username: "superadmin" };

  await assert.rejects(
    async () => {
      await saveFeatureAvailability(
        db,
        {
          config: DEFAULT_FEATURE_AVAILABILITY,
          expectedUpdatedAt: "2026-04-01T00:00:00.000Z", // Stale timestamp
        },
        actor,
      );
    },
    (err) => {
      assert.ok(err instanceof CmsConcurrencyError);
      assert.equal(err.status, 409);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// 5. CACHING & MEMOIZATION (D1 READ REDUCTION)
// ---------------------------------------------------------------------------

test("In-isolate cache memoization: repeated availability checks perform ZERO additional D1 reads", async () => {
  const db = createMockDb({
    contents: [[FEATURE_AVAILABILITY_CONTENT_ID, { updated_at: "2026-01-01T00:00:00.000Z" }]],
    translations: [
      [
        `${FEATURE_AVAILABILITY_CONTENT_ID}:en`,
        { body: JSON.stringify(DEFAULT_FEATURE_AVAILABILITY) },
      ],
    ],
  });

  assert.equal(db.log.length, 0);

  // First call hits DB
  const first = await getFeatureAvailability(db);
  const dbReadsAfterFirst = db.log.filter((l) => l.op === "first").length;
  assert.equal(dbReadsAfterFirst, 1);

  // Calls 2 through 10 must hit the in-isolate memo and perform ZERO DB queries
  for (let i = 0; i < 9; i++) {
    const next = await getFeatureAvailability(db);
    assert.deepEqual(next.config, first.config);
  }

  const dbReadsAfterTen = db.log.filter((l) => l.op === "first").length;
  assert.equal(dbReadsAfterTen, 1, "Repeated reads must be served from in-isolate memo");
});

test("KV cache integration: saveFeatureAvailability updates KV store and in-memory memo", async () => {
  const db = createMockDb();
  const kv = createMockKv();
  const env = { PUBLIC_CONTENT_CACHE: kv };
  const actor = { id: "admin-1", username: "superadmin" };

  const toSave = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
  toSave.schematics.enabled = false;

  await saveFeatureAvailability(db, { config: toSave }, actor, env);

  // Verify KV was updated
  const cachedInKv = await kv.get("pubcache:feature-availability:v1");
  assert.ok(cachedInKv);
  const parsedKv = JSON.parse(cachedInKv);
  assert.equal(parsedKv.config.schematics.enabled, false);

  // Invalidate in-memory memo to test KV fast-path
  resetFeatureAvailabilityCacheForTests();
  const freshDb = createMockDb(); // empty DB that would fail or return defaults
  const fromKv = await getFeatureAvailability(freshDb, env);
  assert.equal(fromKv.config.schematics.enabled, false);
  assert.equal(freshDb.log.length, 0, "KV cache hit must not query D1 database");
});

// ---------------------------------------------------------------------------
// 6. MANDATORY DATABASE-READ PROTECTION FOR ALL 4 SECTIONS
// ---------------------------------------------------------------------------

test("DB-Read Protection [Heroes]: assertFeatureEnabled throws 503 and blocks content queries when disabled", async () => {
  const db = createMockDb();
  const toSave = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
  toSave.heroes.enabled = false;
  toSave.heroes.message = "Heroes section is in maintenance mode.";
  await saveFeatureAvailability(db, { config: toSave }, { id: "admin", username: "admin" });

  let protectedContentQueriesExecuted = 0;
  const mockProtectedContentQuery = async () => {
    protectedContentQueriesExecuted++;
    return { data: "expensive hero listing" };
  };

  // Verify guard throws CmsFeatureUnavailableError with status 503
  await assert.rejects(
    async () => {
      await assertFeatureEnabled("heroes", db);
      await mockProtectedContentQuery(); // Must never be reached
    },
    (err) => {
      assert.ok(err instanceof CmsFeatureUnavailableError);
      assert.equal(err.status, 503);
      assert.equal(err.feature, "heroes");
      assert.equal(err.message, "Heroes section is in maintenance mode.");
      return true;
    },
  );

  assert.equal(
    protectedContentQueriesExecuted,
    0,
    "ZERO protected content queries must execute when Heroes is disabled",
  );
});

test("DB-Read Protection [Schematics]: assertFeatureEnabled throws 503 and blocks content queries when disabled", async () => {
  const db = createMockDb();
  const toSave = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
  toSave.schematics.enabled = false;
  toSave.schematics.message = "Schematics inventory currently offline.";
  await saveFeatureAvailability(db, { config: toSave }, { id: "admin", username: "admin" });

  let protectedContentQueriesExecuted = 0;
  const mockProtectedSchematicsQuery = async () => {
    protectedContentQueriesExecuted++;
    return { data: "expensive schematics listing" };
  };

  await assert.rejects(
    async () => {
      await assertFeatureEnabled("schematics", db);
      await mockProtectedSchematicsQuery();
    },
    (err) => {
      assert.ok(err instanceof CmsFeatureUnavailableError);
      assert.equal(err.status, 503);
      assert.equal(err.feature, "schematics");
      assert.equal(err.message, "Schematics inventory currently offline.");
      return true;
    },
  );

  assert.equal(
    protectedContentQueriesExecuted,
    0,
    "ZERO protected content queries must execute when Schematics is disabled",
  );
});

test("DB-Read Protection [Loadouts]: assertFeatureEnabled throws 503 and blocks content queries when disabled", async () => {
  const db = createMockDb();
  const toSave = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
  toSave.loadouts.enabled = false;
  toSave.loadouts.message = "Loadouts section under maintenance.";
  await saveFeatureAvailability(db, { config: toSave }, { id: "admin", username: "admin" });

  let protectedContentQueriesExecuted = 0;
  const mockProtectedLoadoutsQuery = async () => {
    protectedContentQueriesExecuted++;
    return { data: "expensive loadouts listing" };
  };

  await assert.rejects(
    async () => {
      await assertFeatureEnabled("loadouts", db);
      await mockProtectedLoadoutsQuery();
    },
    (err) => {
      assert.ok(err instanceof CmsFeatureUnavailableError);
      assert.equal(err.status, 503);
      assert.equal(err.feature, "loadouts");
      assert.equal(err.message, "Loadouts section under maintenance.");
      return true;
    },
  );

  assert.equal(
    protectedContentQueriesExecuted,
    0,
    "ZERO protected content queries must execute when Loadouts is disabled",
  );
});

test("DB-Read Protection [Guides]: assertFeatureEnabled throws 503 and blocks content queries when disabled", async () => {
  const db = createMockDb();
  const toSave = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
  toSave.guides.enabled = false;
  toSave.guides.message = "Guides library is being updated.";
  await saveFeatureAvailability(db, { config: toSave }, { id: "admin", username: "admin" });

  let protectedContentQueriesExecuted = 0;
  const mockProtectedGuidesQuery = async () => {
    protectedContentQueriesExecuted++;
    return { data: "expensive articles listing" };
  };

  await assert.rejects(
    async () => {
      await assertFeatureEnabled("guides", db);
      await mockProtectedGuidesQuery();
    },
    (err) => {
      assert.ok(err instanceof CmsFeatureUnavailableError);
      assert.equal(err.status, 503);
      assert.equal(err.feature, "guides");
      assert.equal(err.message, "Guides library is being updated.");
      return true;
    },
  );

  assert.equal(
    protectedContentQueriesExecuted,
    0,
    "ZERO protected content queries must execute when Guides is disabled",
  );
});

// ---------------------------------------------------------------------------
// 7. CROSS-SECTION INDEPENDENCE & ISOLATION
// ---------------------------------------------------------------------------

test("Cross-section isolation: disabling one section preserves full functionality for other enabled sections", async () => {
  const db = createMockDb();
  const toSave = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
  toSave.heroes.enabled = false; // Only heroes disabled; others remain enabled
  await saveFeatureAvailability(db, { config: toSave }, { id: "admin", username: "admin" });

  // Heroes must be blocked
  assert.equal((await isFeatureEnabled("heroes", db)).enabled, false);
  await assert.rejects(async () => assertFeatureEnabled("heroes", db));

  // Schematics, Loadouts, and Guides MUST remain functional
  assert.equal((await isFeatureEnabled("schematics", db)).enabled, true);
  assert.equal((await isFeatureEnabled("loadouts", db)).enabled, true);
  assert.equal((await isFeatureEnabled("guides", db)).enabled, true);

  await assert.doesNotReject(async () => assertFeatureEnabled("schematics", db));
  await assert.doesNotReject(async () => assertFeatureEnabled("loadouts", db));
  await assert.doesNotReject(async () => assertFeatureEnabled("guides", db));
});

test("Cross-section isolation: re-enabling a disabled section immediately restores normal access", async () => {
  const db = createMockDb();
  const actor = { id: "admin", username: "admin" };

  // Step 1: Disable Schematics
  const off = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
  off.schematics.enabled = false;
  await saveFeatureAvailability(db, { config: off }, actor);
  assert.equal((await isFeatureEnabled("schematics", db)).enabled, false);

  // Step 2: Re-enable Schematics
  const on = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
  on.schematics.enabled = true;
  await saveFeatureAvailability(db, { config: on }, actor);

  // Verify access is immediately restored
  assert.equal((await isFeatureEnabled("schematics", db)).enabled, true);
  await assert.doesNotReject(async () => assertFeatureEnabled("schematics", db));
});

// ---------------------------------------------------------------------------
// 8. READ-FAILURE FALLBACKS (never convert failures into enabled configs)
// ---------------------------------------------------------------------------

test("D1 outage with no retained configuration: all four sections fall back to disabled (database-safe)", async () => {
  const failingDb = createFailingDb();
  const tick = startMutableClock();

  const { config } = await getFeatureAvailability(failingDb);
  for (const key of FEATURE_KEYS) {
    assert.equal(config[key].enabled, false, `${key} must be database-safe during a D1 outage`);
  }

  // Every guard must reject while D1 is unreachable.
  for (const key of FEATURE_KEYS) {
    await assert.rejects(async () => assertFeatureEnabled(key, failingDb));
  }

  // The outcome is memoized: repeated checks perform ZERO further D1 attempts.
  const attemptsBefore = failingDb.log.filter((l) => l.op === "first").length;
  assert.equal(attemptsBefore, 1, "exactly one D1 attempt for the incident");
  await getFeatureAvailability(failingDb);
  await getFeatureAvailability(failingDb);
  assert.equal(
    failingDb.log.filter((l) => l.op === "first").length,
    attemptsBefore,
    "failure fallback must be memoized (no read amplification)",
  );

  // Recovery: after the memo window, a healthy D1 restores the stored config.
  tick(31_000);
  const healthy = createMockDb({
    contents: [[FEATURE_AVAILABILITY_CONTENT_ID, { updated_at: "2026-01-01T00:00:00.000Z" }]],
    translations: [
      [
        `${FEATURE_AVAILABILITY_CONTENT_ID}:en`,
        { body: JSON.stringify(DEFAULT_FEATURE_AVAILABILITY) },
      ],
    ],
  });
  const recovered = await getFeatureAvailability(healthy);
  for (const key of FEATURE_KEYS) {
    assert.equal(recovered.config[key].enabled, true, `${key} must recover once D1 is healthy`);
  }
});

test("D1 outage with last-known-good retained: serves the stale-but-valid configuration, not defaults", async () => {
  const tick = startMutableClock();
  const healthy = createMockDb({
    contents: [[FEATURE_AVAILABILITY_CONTENT_ID, { updated_at: "2026-01-01T00:00:00.000Z" }]],
    translations: [
      [
        `${FEATURE_AVAILABILITY_CONTENT_ID}:en`,
        {
          body: JSON.stringify({
            ...DEFAULT_FEATURE_AVAILABILITY,
            schematics: { enabled: false, message: "quota shield" },
          }),
        },
      ],
    ],
  });

  // Establish last-known-good, then expire the memo window.
  const first = await getFeatureAvailability(healthy);
  assert.equal(first.config.schematics.enabled, false);
  tick(31_000);

  // D1 goes down. The stale isolate memo is valid last-known-good.
  const failingDb = createFailingDb();
  const degraded = await getFeatureAvailability(failingDb);
  assert.equal(degraded.config.schematics.enabled, false);
  assert.equal(degraded.config.heroes.enabled, true);
  assert.equal(degraded.updatedAt, "2026-01-01T00:00:00.000Z");

  // Guards reflect last-known-good: schematics blocked, others proceed.
  await assert.rejects(async () => assertFeatureEnabled("schematics", failingDb));
  await assert.doesNotReject(async () => assertFeatureEnabled("guides", failingDb));
});

test("Corrupt KV entry is treated as a cache miss and falls through to D1", async () => {
  const kv = createMockKv();
  await kv.put("pubcache:feature-availability:v1", "garbage{{{not-json");
  const db = createMockDb({
    contents: [[FEATURE_AVAILABILITY_CONTENT_ID, { updated_at: "2026-01-01T00:00:00.000Z" }]],
    translations: [
      [
        `${FEATURE_AVAILABILITY_CONTENT_ID}:en`,
        { body: JSON.stringify(DEFAULT_FEATURE_AVAILABILITY) },
      ],
    ],
  });

  const { config } = await getFeatureAvailability(db, { PUBLIC_CONTENT_CACHE: kv });
  assert.equal(config.heroes.enabled, true, "valid D1 record must win over a corrupt KV entry");
  assert.ok(
    db.log.some((l) => l.op === "first"),
    "D1 must be consulted after an invalid KV entry",
  );

  // An object WITHOUT a config field is equally invalid.
  resetFeatureAvailabilityCacheForTests();
  const kv2 = createMockKv();
  await kv2.put("pubcache:feature-availability:v1", JSON.stringify({ updatedAt: "x" }));
  const db2 = createMockDb();
  await getFeatureAvailability(db2, { PUBLIC_CONTENT_CACHE: kv2 });
  assert.ok(
    db2.log.some((l) => l.op === "first"),
    "config-less KV payload must not be served",
  );
});

test("KV writes carry a bounded lifetime so a failed save cannot pin a stale config forever", async () => {
  const kv = createMockKv();
  const db = createMockDb({
    contents: [[FEATURE_AVAILABILITY_CONTENT_ID, { updated_at: "2026-01-01T00:00:00.000Z" }]],
    translations: [
      [
        `${FEATURE_AVAILABILITY_CONTENT_ID}:en`,
        { body: JSON.stringify(DEFAULT_FEATURE_AVAILABILITY) },
      ],
    ],
  });

  await getFeatureAvailability(db, { PUBLIC_CONTENT_CACHE: kv });
  assert.ok(
    kv._lastPutOptions.options && kv._lastPutOptions.options.expirationTtl >= 60,
    "config KV put must set expirationTtl (Cloudflare KV minimum 60s)",
  );

  const saveKv = createMockKv();
  const actor = { id: "admin", username: "admin" };
  await saveFeatureAvailability(db, { config: DEFAULT_FEATURE_AVAILABILITY }, actor, {
    PUBLIC_CONTENT_CACHE: saveKv,
  });
  assert.ok(saveKv._lastPutOptions.options && saveKv._lastPutOptions.options.expirationTtl >= 60);
});

test("KV reads are bounded by a short cacheTtl to limit save propagation delay", async () => {
  const kv = createMockKv();
  kv._store.set(
    "pubcache:feature-availability:v1",
    JSON.stringify({ config: DEFAULT_FEATURE_AVAILABILITY, updatedAt: "t" }),
  );
  const db = createMockDb();
  await getFeatureAvailability(db, { PUBLIC_CONTENT_CACHE: kv });
  assert.ok(
    kv._store.get("__getOptions") && kv._store.get("__getOptions").cacheTtl >= 60,
    "KV get must pass a bounded cacheTtl so fresh saves propagate within minutes, not hours",
  );
});

test("Save with a corrupt previous body still persists and audits (safe parse)", async () => {
  const db = createMockDb({
    contents: [[FEATURE_AVAILABILITY_CONTENT_ID, { updated_at: "2026-01-01T00:00:00.000Z" }]],
    translations: [[`${FEATURE_AVAILABILITY_CONTENT_ID}:en`, { body: "CORRUPTED{{" }]],
  });
  const result = await saveFeatureAvailability(
    db,
    { config: DEFAULT_FEATURE_AVAILABILITY },
    { id: "admin", username: "admin" },
  );
  assert.equal(result.success, true);
  assert.equal(db.auditEvents.length, 1);
  const metadata = JSON.parse(db.auditEvents[0].args[6]);
  assert.equal(metadata.previous, null);
});

// ---------------------------------------------------------------------------
// 9. STATIC CONTRACT: every public data path calls the guard BEFORE its
//    content queries (via before/beside the withPublicCache envelope), so a
//    disabled section cannot reach the database on ANY route.
// ---------------------------------------------------------------------------

const GUARDED_LOADER_FILES = [
  "public-hubs.loader.ts",
  "public.loader.ts",
  "public-inventory.loader.ts",
  "public-articles.loader.ts",
  "public-hero-detail.loader.ts",
  "public-hero-quickview.loader.ts",
  "public-loadout-detail.loader.ts",
  "public-schematic-detail.loader.ts",
];

test("Loaders: every server function that reads content guards feature availability before its data path", async () => {
  for (const file of GUARDED_LOADER_FILES) {
    const src = await readFile(new URL(`../src/lib/cms/${file}`, import.meta.url), "utf8");
    const fns = src.split(/export const (\w+) = createServerFn/).slice(1);
    for (let i = 0; i < fns.length; i += 2) {
      const fnName = fns[i];
      const chunk = fns[i + 1];
      const usesCache = chunk.includes("withPublicCache(");
      const queriesDb = chunk.includes("resolveRequestCmsDb(");
      const guardMatch = /(assertFeatureEnabled|isFeatureEnabled)\(/.exec(chunk);
      const tokenCovered = chunk.includes("verifyPreviewToken");
      const delegated = chunk.includes("listPublicSchematics(");

      if (usesCache) {
        const cacheIdx = chunk.indexOf("withPublicCache(");
        assert.ok(guardMatch, `${file}: ${fnName} must call a feature guard`);
        assert.ok(
          guardMatch.index < cacheIdx,
          `${file}: ${fnName} guard must execute BEFORE the withPublicCache envelope`,
        );
      } else {
        // Uncached chunks with DB access must be token-authorized previews or
        // centralized through an already-guarded function.
        assert.ok(
          !queriesDb || tokenCovered || delegated || guardMatch,
          `${file}: ${fnName} touches the database without a feature guard, a preview token, or delegation`,
        );
      }
    }
  }
});

test("Routes: every public section route pre-checks feature availability for its loading UX", async () => {
  const routeFiles = [
    "heroes.tsx",
    "heroes.$slug.tsx",
    "$locale.heroes.tsx",
    "$locale.heroes.$slug.tsx",
    "schematics.tsx",
    "schematics.$slug.tsx",
    "$locale.schematics.tsx",
    "$locale.schematics.$slug.tsx",
    "loadouts.tsx",
    "loadouts.$slug.tsx",
    "$locale.loadouts.tsx",
    "$locale.loadouts.$slug.tsx",
    "guides.tsx",
    "guides.$slug.tsx",
    "guides.topics.$topic.tsx",
    "$locale.guides.tsx",
    "$locale.guides.$slug.tsx",
    "$locale.guides.topics.$topic.tsx",
  ];
  for (const f of routeFiles) {
    const src = await readFile(new URL(`../src/routes/${f}`, import.meta.url), "utf8");
    assert.ok(
      src.includes("getPublicFeatureStatus"),
      `${f} must gate its loader on feature availability`,
    );
    assert.ok(src.includes("SectionUnavailableState"), `${f} must render the unavailable state`);
  }
});
