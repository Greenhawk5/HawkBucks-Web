/**
 * Feature availability & database-read protection service (SERVER-ONLY).
 *
 * Provides centralized, typed enabled/disabled checks for the four core public sections:
 * 1. Heroes
 * 2. Schematics
 * 3. Loadouts
 * 4. Guides
 *
 * PERSISTENCE & ARCHITECTURE:
 * - Stored in D1 as a singleton configuration record in `cms_contents` + `cms_content_translations`
 *   (id = 'system_feature_availability'). Reuses existing foundation tables from migration 0006
 *   without introducing unapplied schema dependencies or new tables.
 * - Isolate-level in-memory memoization (30s window) ensures repeated availability checks
 *   within an isolate cost ZERO D1 queries.
 * - KV replication (binding PUBLIC_CONTENT_CACHE, separate key from the content epoch)
 *   shares the configuration across isolates. Propagation is NOT instant: cross-isolate
 *   staleness is bounded by the KV write/edge-cache window plus the 30s isolate memo
 *   (worst case ~2 minutes, matching the public data cache's documented bound).
 * - Every save funnels through `recordAuditEvent()`, preserving an immutable administrative
 *   audit trail and invoking `bumpContentEpochForRequest()`.
 *
 * FAILURE SEMANTICS (strictly separated):
 * - Genuinely absent / uninitialized record      -> all four sections ENABLED (intended default).
 * - Successful read of a valid configuration     -> the stored configuration verbatim.
 * - Transient D1 error, quota exhaustion, unavailable cache, or malformed stored data ->
 *       last-known-good configuration when one is retained (stale isolate memo or KV),
 *       otherwise a database-safe fallback: all four sections DISABLED (costs zero content
 *       queries; unrelated site functionality is untouched). A read failure is NEVER
 *       silently converted into an enabled configuration — that would re-arm the very
 *       queries this feature exists to shed during a D1 quota incident.
 */

import "@tanstack/react-start/server-only";

import type { D1Database } from "./db.server";
import {
  DEFAULT_FEATURE_AVAILABILITY,
  DEFAULT_FEATURE_MESSAGES,
  FEATURE_KEYS,
  sanitizeMessage,
  type FeatureAvailabilityConfig,
  type FeatureKey,
} from "./feature-availability";

export const FEATURE_AVAILABILITY_CONTENT_ID = "system_feature_availability";
export const FEATURE_AVAILABILITY_TRANSLATION_ID = "trans_feature_availability";
export const FEATURE_AVAILABILITY_KV_KEY = "pubcache:feature-availability:v1";

/** Short isolate-level memo TTL to bound D1 reads without excessive staleness. */
const ISOLATE_MEMO_TTL_MS = 30_000;
/** Cloudflare KV `cacheTtl` for the config read (seconds; minimum 60). */
const KV_GET_CACHE_TTL_SECONDS = 60;
/**
 * Cloudflare KV `expirationTtl` for the config write (seconds; KV minimum 60).
 * Every KV write carries a bounded lifetime so a FAILED save write can never
 * leave a permanently stale configuration behind: once the old entry expires,
 * every isolate falls back to D1 (the source of truth) and re-primes. In the
 * steady state the D1 read happens at most once per this window per isolate.
 */
const KV_CONFIG_EXPIRATION_TTL_SECONDS = 120;

/**
 * Database-safe fallback used ONLY when the configuration genuinely cannot be
 * read (D1 failure with no retained last-known-good). Disabling the four
 * sections costs ZERO protected content queries and leaves all unrelated
 * site functionality (missions, about, admin, auth) untouched.
 */
export const SAFEGUARD_FEATURE_AVAILABILITY: FeatureAvailabilityConfig = {
  heroes: { enabled: false, message: DEFAULT_FEATURE_MESSAGES.heroes },
  schematics: { enabled: false, message: DEFAULT_FEATURE_MESSAGES.schematics },
  loadouts: { enabled: false, message: DEFAULT_FEATURE_MESSAGES.loadouts },
  guides: { enabled: false, message: DEFAULT_FEATURE_MESSAGES.guides },
};

export class CmsFeatureUnavailableError extends Error {
  readonly status = 503;
  readonly code = "FEATURE_UNAVAILABLE" as const;
  readonly feature: FeatureKey;

  constructor(feature: FeatureKey, message?: string) {
    super(message || DEFAULT_FEATURE_MESSAGES[feature]);
    this.name = "CmsFeatureUnavailableError";
    this.feature = feature;
  }
}

export class CmsConcurrencyError extends Error {
  readonly status = 409;
  readonly code = "CONCURRENCY_CONFLICT" as const;

  constructor(
    message = "Settings have been modified by another administrator. Please refresh and try again.",
  ) {
    super(message);
    this.name = "CmsConcurrencyError";
  }
}

interface MemoState {
  config: FeatureAvailabilityConfig;
  updatedAt: string;
  expiresAt: number;
}

let isolateMemo: MemoState | null = null;
let nowFn: () => number = () => Date.now();

/** Test hook: clear the in-memory isolate memo. */
export function resetFeatureAvailabilityCacheForTests(): void {
  isolateMemo = null;
  nowFn = () => Date.now();
}

/** Test hook: inject custom clock for TTL validation. */
export function setFeatureAvailabilityClockForTests(fn: () => number): void {
  nowFn = fn;
}

interface PublicCacheEnv {
  PUBLIC_CONTENT_CACHE?: {
    get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
}

/**
 * Safely parse and validate stored JSON configuration into FeatureAvailabilityConfig.
 * Handles missing keys, malformed data, or partial structures by merging with defaults.
 */
function normalizeConfig(parsed: unknown): FeatureAvailabilityConfig {
  const result: FeatureAvailabilityConfig = {
    heroes: { ...DEFAULT_FEATURE_AVAILABILITY.heroes },
    schematics: { ...DEFAULT_FEATURE_AVAILABILITY.schematics },
    loadouts: { ...DEFAULT_FEATURE_AVAILABILITY.loadouts },
    guides: { ...DEFAULT_FEATURE_AVAILABILITY.guides },
  };

  if (!parsed || typeof parsed !== "object") {
    return result;
  }

  const obj = parsed as Record<string, unknown>;
  for (const key of FEATURE_KEYS) {
    const val = obj[key];
    if (val && typeof val === "object") {
      const entry = val as Record<string, unknown>;
      const enabled = typeof entry["enabled"] === "boolean" ? entry["enabled"] : true;
      const message = sanitizeMessage(entry["message"], key);
      result[key] = { enabled, message };
    }
  }

  return result;
}

function warnFeatureAvailabilityDegraded(reason: string): void {
  console.warn(
    `[hawkbucks:feature-availability] configuration read degraded (${reason}); serving retained last-known-good or database-safe fallback`,
  );
}

/**
 * KV payload validity gate: a cached entry is last-known-good ONLY when it
 * parses to an object with a `config` field (what `put` writes). Anything
 * else is corruption and must fall through to D1 instead of being served.
 */
function parseKvConfigPayload(cached: string): { config: unknown; updatedAt: string } | null {
  try {
    const payload = JSON.parse(cached) as { config?: unknown; updatedAt?: unknown };
    if (payload === null || typeof payload !== "object" || payload.config === undefined) {
      return null;
    }
    return {
      config: payload.config,
      updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : "",
    };
  } catch {
    return null;
  }
}

/**
 * Attempt to set HTTP 503 Service Unavailable and private no-store headers on SSR responses.
 */
export async function setResponseStatus503IfPossible(): Promise<void> {
  try {
    const { setResponseStatus, setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseStatus(503);
    setResponseHeader("Cache-Control", "private, no-store");
  } catch {
    // Gracefully ignored when called outside active request context (e.g. unit tests)
  }
}

/**
 * Read the centralized feature-availability configuration.
 * Resolution hierarchy:
 * 1. In-isolate memory cache (instant, 0 D1 reads, 0 KV reads). A retained
 *    STALE memo also serves as the last-known-good fallback after any error.
 * 2. Cloudflare KV cache if bound (fast cross-isolate shared read, 0 D1 reads).
 * 3. D1 database lookup (1 single statement, at most once per memo window).
 * 4. Fallbacks, strictly separated:
 *    - record genuinely absent -> all four sections ENABLED (intended default).
 *    - actual READ FAILURE or malformed stored data -> stale isolate memo
 *      (last-known-good) if retained, else all four sections DISABLED; either
 *      way the outcome is memoized so one incident costs ZERO per-window D1
 *      attempts instead of one attempt per request.
 */
export async function getFeatureAvailability(
  db: D1Database | null | undefined,
  env?: PublicCacheEnv | null,
): Promise<{ config: FeatureAvailabilityConfig; updatedAt: string }> {
  const now = nowFn();
  if (isolateMemo && now < isolateMemo.expiresAt) {
    return {
      config: structuredClone(isolateMemo.config),
      updatedAt: isolateMemo.updatedAt,
    };
  }

  // Check KV cache if available
  const kv = env?.PUBLIC_CONTENT_CACHE;
  if (kv && typeof kv.get === "function") {
    try {
      const cached = await kv.get(FEATURE_AVAILABILITY_KV_KEY, {
        cacheTtl: KV_GET_CACHE_TTL_SECONDS,
      });
      if (cached) {
        const payload = parseKvConfigPayload(cached);
        if (payload) {
          const config = normalizeConfig(payload.config);
          isolateMemo = {
            config,
            updatedAt: payload.updatedAt,
            expiresAt: now + ISOLATE_MEMO_TTL_MS,
          };
          return { config: structuredClone(config), updatedAt: payload.updatedAt };
        }
        // Corrupt/invalid KV entry: treat as a cache miss and fall through to D1.
      }
    } catch {
      // KV unavailable degrades safely to D1 (or retained local memory below).
    }
  }

  // Last-known-good fallback available from the expired-but-retained memo is
  // decided only AFTER D1 fails, so a healthy D1 always wins.

  // If no DB binding (or uninitialized), fail open to all enabled: with no D1
  // binding there are no protected queries to shed, and resolveRequestCmsDb
  // has already failed closed for every CMS path by this point.
  if (!db || typeof db.prepare !== "function") {
    return {
      config: structuredClone(DEFAULT_FEATURE_AVAILABILITY),
      updatedAt: "",
    };
  }

  try {
    const row = await db
      .prepare(
        `SELECT c.updated_at AS updated_at, t.body AS body
           FROM cms_contents c
           JOIN cms_content_translations t ON t.content_id = c.id
          WHERE c.id = ? AND t.locale = 'en'`,
      )
      .bind(FEATURE_AVAILABILITY_CONTENT_ID)
      .first<{ updated_at: string; body: string }>();

    if (!row || !row.body) {
      // Genuinely absent / uninitialized record; the system can establish that
      // fact, so the intended all-enabled default applies.
      const config = structuredClone(DEFAULT_FEATURE_AVAILABILITY);
      isolateMemo = { config, updatedAt: "", expiresAt: now + ISOLATE_MEMO_TTL_MS };
      return { config: structuredClone(config), updatedAt: "" };
    }

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(row.body);
    } catch {
      parsed = null;
    }

    if (parsed === null) {
      // A present but unreadable record is corruption, not absence: never serve
      // "all enabled" from it. Degrade to last-known-good / database-safe.
      return degradeOnReadFailure(now, "stored configuration is malformed");
    }

    const config = normalizeConfig(parsed);
    const updatedAt = row.updated_at || "";
    isolateMemo = { config, updatedAt, expiresAt: now + ISOLATE_MEMO_TTL_MS };

    // Prime KV if bound (bounded lifetime: see KV_CONFIG_EXPIRATION_TTL_SECONDS)
    if (kv && typeof kv.put === "function") {
      try {
        await kv.put(FEATURE_AVAILABILITY_KV_KEY, JSON.stringify({ config, updatedAt }), {
          expirationTtl: KV_CONFIG_EXPIRATION_TTL_SECONDS,
        });
      } catch {
        // Non-blocking
      }
    }

    return { config: structuredClone(config), updatedAt };
  } catch (error) {
    return degradeOnReadFailure(
      now,
      `database read error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Actual-read-failure fallback (never converts a failure into enabled config):
 * 1. Serve the stale-but-previously-valid isolate memo as last-known-good and
 *    re-stamp its freshness so the incident costs zero further reads for the
 *    memo window.
 * 2. Without any retained configuration, disable the four sections (database
 *    safe: zero protected content queries) and memoize that outcome too.
 * Unrelated site functionality is never affected by this fallback.
 */
function degradeOnReadFailure(
  now: number,
  reason: string,
): { config: FeatureAvailabilityConfig; updatedAt: string } {
  warnFeatureAvailabilityDegraded(reason);
  if (isolateMemo) {
    isolateMemo.expiresAt = now + ISOLATE_MEMO_TTL_MS;
    return {
      config: structuredClone(isolateMemo.config),
      updatedAt: isolateMemo.updatedAt,
    };
  }
  const config = structuredClone(SAFEGUARD_FEATURE_AVAILABILITY);
  isolateMemo = { config, updatedAt: "", expiresAt: now + ISOLATE_MEMO_TTL_MS };
  return { config: structuredClone(config), updatedAt: "" };
}

/**
 * Persist administrator configuration updates.
 * - Enforces optimistic concurrency if `expectedUpdatedAt` is provided.
 * - Atomically upserts `cms_contents` and `cms_content_translations`.
 * - Records an audit event in `cms_audit_events`.
 * - Automatically bumps content epoch across isolates.
 * - Updates the local isolate memo and KV immediately.
 */
export async function saveFeatureAvailability(
  db: D1Database,
  input: {
    config: FeatureAvailabilityConfig;
    expectedUpdatedAt?: string | undefined;
  },
  actor: { id: string; username: string },
  env?: PublicCacheEnv | null,
): Promise<{ success: boolean; config: FeatureAvailabilityConfig; updatedAt: string }> {
  // Validate and sanitize every section's input
  const sanitized: FeatureAvailabilityConfig = {
    heroes: {
      enabled: Boolean(input.config?.heroes?.enabled),
      message: sanitizeMessage(input.config?.heroes?.message, "heroes"),
    },
    schematics: {
      enabled: Boolean(input.config?.schematics?.enabled),
      message: sanitizeMessage(input.config?.schematics?.message, "schematics"),
    },
    loadouts: {
      enabled: Boolean(input.config?.loadouts?.enabled),
      message: sanitizeMessage(input.config?.loadouts?.message, "loadouts"),
    },
    guides: {
      enabled: Boolean(input.config?.guides?.enabled),
      message: sanitizeMessage(input.config?.guides?.message, "guides"),
    },
  };

  // Check for existing record to verify optimistic concurrency
  const existing = await db
    .prepare(
      `SELECT c.updated_at AS updated_at, t.body AS body
         FROM cms_contents c
         JOIN cms_content_translations t ON t.content_id = c.id
        WHERE c.id = ? AND t.locale = 'en'`,
    )
    .bind(FEATURE_AVAILABILITY_CONTENT_ID)
    .first<{ updated_at: string; body: string }>();

  if (existing && input.expectedUpdatedAt !== undefined) {
    if (existing.updated_at !== input.expectedUpdatedAt) {
      throw new CmsConcurrencyError();
    }
  }

  const nowIso = new Date(nowFn()).toISOString();
  const bodyJson = JSON.stringify(sanitized);

  // Upsert foundation records in batch/transaction
  const contentStmt = db
    .prepare(
      `INSERT INTO cms_contents
       (id, entity_type, default_locale, status, published_at, created_by, updated_by, created_at, updated_at)
     VALUES (?, 'system_setting', 'en', 'published', ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`,
    )
    .bind(FEATURE_AVAILABILITY_CONTENT_ID, nowIso, actor.id, actor.id, nowIso, nowIso);

  const transStmt = db
    .prepare(
      `INSERT INTO cms_content_translations
       (id, content_id, locale, title, body, slug, translation_status, created_at, updated_at)
     VALUES (?, ?, 'en', 'Feature Availability', ?, '', 'complete', ?, ?)
     ON CONFLICT (content_id, locale) DO UPDATE SET
       body = excluded.body,
       updated_at = excluded.updated_at`,
    )
    .bind(
      FEATURE_AVAILABILITY_TRANSLATION_ID,
      FEATURE_AVAILABILITY_CONTENT_ID,
      bodyJson,
      nowIso,
      nowIso,
    );

  await db.batch([contentStmt, transStmt]);

  // Update in-isolate memo
  isolateMemo = {
    config: sanitized,
    updatedAt: nowIso,
    expiresAt: nowFn() + ISOLATE_MEMO_TTL_MS,
  };

  // Update KV cache if present (bounded lifetime so a failed save write can
  // never leave an indefinitely stale configuration behind every isolate).
  const kv = env?.PUBLIC_CONTENT_CACHE;
  if (kv && typeof kv.put === "function") {
    try {
      await kv.put(
        FEATURE_AVAILABILITY_KV_KEY,
        JSON.stringify({ config: sanitized, updatedAt: nowIso }),
        { expirationTtl: KV_CONFIG_EXPIRATION_TTL_SECONDS },
      );
    } catch {
      // Non-blocking: other isolates converge to the D1 record when the KV
      // entry expires (see KV_CONFIG_EXPIRATION_TTL_SECONDS).
    }
  }

  // Record audit trail event; this automatically invalidates public data caches via bumpContentEpochForRequest
  let previousBody: unknown = null;
  if (existing?.body) {
    try {
      previousBody = JSON.parse(existing.body);
    } catch {
      previousBody = null; // corrupt previous body must not break this save
    }
  }
  const { recordAuditEvent } = await import("./db.server");
  await recordAuditEvent(db, {
    id: `audit_${nowFn().toString(36)}_${crypto.randomUUID().slice(0, 8)}`,
    actorId: actor.id,
    actorUsername: actor.username,
    action: "system.feature_availability_update",
    entityType: "system_setting",
    entityId: FEATURE_AVAILABILITY_CONTENT_ID,
    metadataJson: JSON.stringify({
      previous: previousBody,
      updated: sanitized,
    }),
    createdAt: nowIso,
  });

  return {
    success: true,
    config: structuredClone(sanitized),
    updatedAt: nowIso,
  };
}

/**
 * Central guard: verify whether a specific section is enabled.
 * If disabled:
 * - Attempts to set HTTP 503 response status.
 * - Immediately throws CmsFeatureUnavailableError with the configured message.
 * - PREVENTS ANY SUBSEQUENT DATABASE WORK.
 */
export async function assertFeatureEnabled(
  feature: FeatureKey,
  db: D1Database | null | undefined,
  env?: PublicCacheEnv | null,
): Promise<void> {
  const { config } = await getFeatureAvailability(db, env);
  const setting = config[feature];
  if (!setting || !setting.enabled) {
    await setResponseStatus503IfPossible();
    throw new CmsFeatureUnavailableError(feature, setting?.message);
  }
}

/**
 * Check section status without throwing, returning enabled state and custom message.
 */
export async function isFeatureEnabled(
  feature: FeatureKey,
  db: D1Database | null | undefined,
  env?: PublicCacheEnv | null,
): Promise<{ enabled: boolean; message: string }> {
  const { config } = await getFeatureAvailability(db, env);
  const setting = config[feature];
  return {
    enabled: setting ? setting.enabled : true,
    message: setting ? setting.message : DEFAULT_FEATURE_MESSAGES[feature],
  };
}
