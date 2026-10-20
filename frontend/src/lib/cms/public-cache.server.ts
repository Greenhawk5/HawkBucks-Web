/**
 * Public content data cache (SERVER-ONLY) — Layer 1 of the public-content
 * read-load reduction strategy.
 *
 * This module must NEVER be imported by browser/client code.
 *
 * WHY THIS EXISTS
 *
 * The public pages of HawkBucks (hero hub pages, detail pages, inventory
 * lists, article lists) are visitor-shareable and cookie-free, yet every
 * request re-executes their D1 statements. The hero hub alone runs 12
 * statements (including 3 facet-count aggregates recomputed per request),
 * and `getPublicLoadout` runs ~39. Caching the normalized payloads of those
 * read paths turns N requests into N-1 D1 executions for identical reads.
 *
 * DESIGN (agreed with the user, see docs/caching-plan):
 *
 *   Layer 1 — in-isolate in-memory data cache keyed by a composite content
 *   epoch, plus a KV-backed global epoch for cross-isolate invalidation.
 *   The KV namespace (binding `PUBLIC_CONTENT_CACHE`) stores ONLY a single
 *   epoch marker; payloads never leave the isolate.
 *
 *   Layer 3 — browser-side HTTP caching of public data server-function
 *   (RPC) responses via `Cache-Control: private, max-age=<browser ttl>`
 *   is handled by `withPublicCache` as well (see `markRpcCachePolicy`).
 *   SSR HTML is NEVER cached here or at the edge (per-request CSP nonce +
 *   cookie-dependent root loader); `server.ts` fills `private, no-store`
 *   for HTML responses instead.
 *
 * INVALIDATION
 *
 *   Key format: `v1|<epoch>|<namespace>|<stable(args)>` where epoch is
 *   `<kv-epoch|none>#<local-epoch-counter>`.
 *
 *   - Every CMS mutation funnels through `recordAuditEvent` (db.server.ts),
 *     which bumps the LOCAL epoch counter immediately (same isolate sees the
 *     change on its very next cache key computation) and writes a new epoch
 *     marker to KV so OTHER isolates observe the mutation within the KV
 *     propagation window (<=60s) plus the probe memo window (30s).
 *   - Media library writes (create/tombstone/update-metadata/restore) change
 *     public URLs/alt text and bump the epoch directly (they do not audit).
 *   - Bounded staleness across isolates is therefore <=90s worst case
 *     (KV propagation + probe memo), with the data TTL backstop on top.
 *
 * SAFETY PROPERTIES
 *
 *   - Opt-in: when `PUBLIC_DATA_CACHE_MAX_AGE_SECONDS` is unset/<=0 the
 *   cache is fully inert (existing unit tests and local dev are unaffected).
 *   - Cache failures never break a request: KV probe errors degrade to a
 *   TTL-only memo window; loader errors are never cached and rethrown.
 *   - In-flight coalescing collapses concurrent identical reads into a
 *   single loader execution (protecting D1 bursts after a cold epoch).
 *   - Values are `structuredClone`d on read and size-guarded on write so
 *   callers can never mutate the cached copy and oversized payloads are
 *   never admitted.
 *   - The cache is best-effort and unbounded in LIFETIME only via TTL: an
 *   LRU bound (entries + bytes) caps isolate memory (Workers evict module
 *   state at any time — a miss is always the correct fallback).
 */

import "@tanstack/react-start/server-only";

import { getRequest, setResponseHeader } from "@tanstack/react-start/server";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Env var that opts the public data cache in (TTL seconds; <=0 disables). */
export const PUBLIC_DATA_CACHE_MAX_AGE_SECONDS_VAR = "PUBLIC_DATA_CACHE_MAX_AGE_SECONDS";
/** Env var controlling the browser TTL for public data RPC responses. */
export const PUBLIC_RPC_BROWSER_MAX_AGE_SECONDS_VAR = "PUBLIC_RPC_BROWSER_MAX_AGE_SECONDS";

/** Single KV key that carries the global content epoch marker. */
const KV_EPOCH_KEY = "pubcache:content-epoch:v1";
/** How long the KV epoch probe result is memoized locally (ms). */
const KV_PROBE_MEMO_MS = 30_000;
/** Cloudflare KV `cacheTtl` for the epoch probe (seconds; minimum 60). */
const KV_GET_CACHE_TTL = 60;

/** LRU bound: max cached payloads per isolate. */
const MAX_ENTRIES = 128;
/** LRU bound: total serialized payload budget per isolate (~12 MiB). */
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
/** A single payload larger than this is never admitted. */
const MAX_VALUE_BYTES = 1_500_000;

interface CacheableKv {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/** Structural view of the environment fields used by this module. */
export interface PublicCacheEnv {
  PUBLIC_CONTENT_CACHE?: CacheableKv;
}

/** Read a raw env var value without requiring an index signature on env. */
function envValue(env: PublicCacheEnv | undefined, name: string): unknown {
  return (env as Record<string, unknown> | undefined)?.[name];
}

function parseMaxAge(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(Math.floor(parsed), 86_400);
}

// ---------------------------------------------------------------------------
// Isolate-local state
// ---------------------------------------------------------------------------

interface CacheEntry {
  value: unknown;
  bytes: number;
  expiresAt: number;
}

const entries = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();
let totalBytes = 0;
let localEpoch = 0;
let kvEpochMemo: { kv: CacheableKv | null; value: string; at: number } | null = null;
let nowFn: () => number = () => Date.now();

const stats = { hit: 0, miss: 0, coalesced: 0, disabled: 0, error: 0, oversize: 0, kvError: 0 };
type StatsKey = keyof typeof stats;

export type PublicCacheOutcome = keyof typeof stats;

export function publicCacheStatsSnapshot(): Record<StatsKey, number> {
  return { ...stats };
}

/** Test hook: wipe all cache state (entries, epochs, clock, stats). */
export function resetPublicDataCacheForTests(): void {
  entries.clear();
  inFlight.clear();
  totalBytes = 0;
  localEpoch = 0;
  kvEpochMemo = null;
  nowFn = () => Date.now();
  for (const key of Object.keys(stats) as StatsKey[]) stats[key] = 0;
}

/** Test hook: inject a deterministic clock for TTL behavior. */
export function setPublicCacheClockForTests(fn: () => number): void {
  nowFn = fn;
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

/** Deterministic serialization for cache keys (sorted object keys). */
function stableKeyPart(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "u";
  if (typeof value === "number") return Number.isFinite(value) ? `n${value}` : "NaN";
  if (typeof value === "boolean") return value ? "b1" : "b0";
  if (typeof value === "string") return `s${JSON.stringify(value)}`;
  if (Array.isArray(value)) return `[${value.map(stableKeyPart).join(",")}]`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((key) => obj[key] !== undefined)
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableKeyPart(obj[key])}`).join(",")}}`;
  }
  return `x${String(value)}`;
}

/**
 * Composite content epoch for cache keys: `<global>|<local>`.
 * The global part comes from KV (memoized for `KV_PROBE_MEMO_MS`), the local
 * part is an isolate-local counter bumped synchronously by every mutation.
 */
export async function currentContentEpoch(env: PublicCacheEnv): Promise<string> {
  const kv = env?.PUBLIC_CONTENT_CACHE ?? null;
  const now = nowFn();
  if (kvEpochMemo && kvEpochMemo.kv === kv && now - kvEpochMemo.at < KV_PROBE_MEMO_MS) {
    return `${kvEpochMemo.value || "none"}#${localEpoch}`;
  }
  let value = "";
  if (kv) {
    try {
      value = (await kv.get(KV_EPOCH_KEY, { cacheTtl: KV_GET_CACHE_TTL })) ?? "";
    } catch {
      // KV unavailable: degrade to TTL-only invalidation for this memo window.
      value = "";
      stats.kvError++;
    }
  }
  kvEpochMemo = { kv, value, at: now };
  return `${value || "none"}#${localEpoch}`;
}

/**
 * Invalidate the public data cache for the CURRENT isolate immediately and
 * publish a new global epoch marker to KV for every other isolate.
 * Never throws: a failed KV write still invalidates locally.
 */
export async function bumpContentEpoch(env: PublicCacheEnv | null | undefined): Promise<void> {
  localEpoch += 1;
  const kv = env?.PUBLIC_CONTENT_CACHE;
  if (kv && typeof kv.put === "function") {
    try {
      await kv.put(KV_EPOCH_KEY, `${nowFn().toString(36)}-${crypto.randomUUID()}`);
    } catch {
      stats.kvError++;
    }
  }
}

/**
 * `bumpContentEpoch` resolved from the current request context. Called from
 * db.server.ts mutation funnels (`recordAuditEvent` and the media write
 * helpers), which only receive the resolved D1 binding.
 */
export async function bumpContentEpochForRequest(): Promise<void> {
  let env: PublicCacheEnv | null = null;
  try {
    env =
      (
        getRequest() as unknown as {
          runtime?: { cloudflare?: { env?: PublicCacheEnv } };
        }
      )?.runtime?.cloudflare?.env ?? null;
  } catch {
    env = null;
  }
  await bumpContentEpoch(env);
}

// ---------------------------------------------------------------------------
// LRU storage
// ---------------------------------------------------------------------------

function evictOldest(): void {
  const oldest = entries.keys().next();
  if (oldest.done) return;
  const entry = entries.get(oldest.value);
  if (entry) totalBytes -= entry.bytes;
  entries.delete(oldest.value);
}

function admit(key: string, value: unknown, ttlMs: number): void {
  let bytes = 0;
  try {
    bytes = JSON.stringify(value ?? null)?.length ?? 0;
  } catch {
    return;
  }
  if (bytes > MAX_VALUE_BYTES) {
    stats.oversize++;
    return;
  }
  const existing = entries.get(key);
  if (existing) {
    totalBytes -= existing.bytes;
    entries.delete(key);
  }
  while (totalBytes + bytes > MAX_TOTAL_BYTES && entries.size > 0) evictOldest();
  while (entries.size >= MAX_ENTRIES && entries.size > 0) evictOldest();
  entries.set(key, { value: structuredClone(value), bytes, expiresAt: nowFn() + ttlMs });
  totalBytes += bytes;
}

// ---------------------------------------------------------------------------
// RPC response policy (Layer 3)
// ---------------------------------------------------------------------------

/** TanStack Start serves RPCs under this path prefix. */
const RPC_PATH_PREFIX = "/_serverFn/";

function rpcRequestPathname(): string | null {
  try {
    const request = getRequest();
    if (!request) return null;
    return new URL(request.url).pathname;
  } catch {
    return null;
  }
}

/**
 * Set the browser-facing cache policy for a public data RPC response.
 * Only applied when the request is actually an RPC (never during in-process
 * SSR, so the SSR HTML response never inherits `max-age`).
 */
function markRpcCachePolicy(
  pathname: string | null,
  outcome: PublicCacheOutcome,
  env: PublicCacheEnv | undefined,
): void {
  if (!pathname || !pathname.startsWith(RPC_PATH_PREFIX)) return;
  try {
    setResponseHeader("Server-Timing", `hb-public-cache;desc=${outcome}`);
    const browserTtl = parseMaxAge(envValue(env, PUBLIC_RPC_BROWSER_MAX_AGE_SECONDS_VAR));
    if (browserTtl > 0) {
      setResponseHeader("Cache-Control", `private, max-age=${browserTtl}`);
    }
  } catch {
    // Header marking is best-effort; never break a response over it.
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export interface WithPublicCacheOptions<K> {
  /** Cloudflare env (from resolveRequestCmsDb) for config + epoch probe. */
  env: PublicCacheEnv;
  /** Logical namespace, e.g. "hero-hub" or "loadout-detail". */
  namespace: string;
  /** Normalized, post-validation arguments (cache key part). */
  args?: unknown;
  /** The uncached data path (the existing handler body). */
  loader: () => Promise<K>;
}

/**
 * Read a public payload through the in-isolate data cache.
 * - Disabled (TTL <= 0): executes the loader directly (status-quo behavior).
 * - Hit: returns a structured clone of the cached value (no D1 traffic).
 * - Miss: executes the loader once (coalescing concurrent identical calls),
 *   admits the value, and returns it. Errors are rethrown and not cached.
 */
export async function withPublicCache<K>(options: WithPublicCacheOptions<K>): Promise<K> {
  const dataTtl = parseMaxAge(envValue(options.env, PUBLIC_DATA_CACHE_MAX_AGE_SECONDS_VAR));
  if (dataTtl <= 0) {
    stats.disabled++;
    return await runAndMark(options, "disabled");
  }

  const epoch = await currentContentEpoch(options.env);
  const key = `v1|${epoch}|${options.namespace}|${stableKeyPart(options.args ?? null)}`;

  const cached = entries.get(key);
  if (cached && cached.expiresAt > nowFn()) {
    // LRU refresh on hit.
    entries.delete(key);
    entries.set(key, cached);
    stats.hit++;
    markRpcCachePolicy(rpcRequestPathname(), "hit", options.env);
    return structuredClone(cached.value) as K;
  }
  if (cached) {
    totalBytes -= cached.bytes;
    entries.delete(key);
  }

  const existing = inFlight.get(key);
  if (existing) {
    stats.coalesced++;
    return (await existing) as K;
  }

  const task = (async () => {
    const value = await options.loader();
    admit(key, value, dataTtl * 1000);
    return value;
  })();
  inFlight.set(key, task);
  // Attach cleanup on both settle paths (then/catch); using `.finally()`
  // directly would leave a second rejecting promise unhandled.
  void task.then(
    () => {
      inFlight.delete(key);
    },
    () => {
      inFlight.delete(key);
    },
  );

  try {
    const value = (await task) as K;
    stats.miss++;
    markRpcCachePolicy(rpcRequestPathname(), "miss", options.env);
    return value;
  } catch (error) {
    stats.error++;
    const pathname = rpcRequestPathname();
    if (pathname?.startsWith(RPC_PATH_PREFIX)) {
      try {
        setResponseHeader("Server-Timing", "hb-public-cache;desc=error");
      } catch {
        // best-effort
      }
    }
    throw error;
  }
}

async function runAndMark<K>(
  options: WithPublicCacheOptions<K>,
  outcome: PublicCacheOutcome,
): Promise<K> {
  const value = await options.loader();
  markRpcCachePolicy(rpcRequestPathname(), outcome, options.env);
  return value;
}
