/**
 * Phase 11 — CMS authentication & authorization boundary (SERVER-ONLY).
 *
 * This module must NEVER be imported by browser/client code. The
 * `@tanstack/react-start/server-only` marker makes the TanStack Start
 * import-protection plugin fail the build if it ever leaks into the client
 * bundle — the same mechanism as services/missions.server.ts.
 *
 * Model (explicitly authentication vs authorization):
 *
 *   AUTHENTICATION — "who is this?" Established ONLY by one of:
 *     1. a valid `hb_cms_session` HttpOnly cookie whose opaque token hashes
 *        to a live row in cms_sessions (expiry + revocation checked
 *        server-side on every request), or
 *     2. the bootstrap login server function verifying username + PBKDF2
 *        password against cms_users (or the one-time bootstrap env identity).
 *   Never: client flags, localStorage, query-string tokens, trusted headers.
 *
 *   AUTHORIZATION — "may they do this?" Roles map to capabilities:
 *     viewer: cms.read
 *     editor: cms.read, cms.write
 *     admin:  cms.read, cms.write, cms.publish, cms.admin
 *   Every privileged mutation calls requireCapability() server-side. UI
 *   hiding is convenience only and enforces nothing.
 *
 * Passwords use PBKDF2-SHA256 (WebCrypto, available in Workers + Node 24)
 * with per-user salt. Session tokens are 256-bit random values; D1 stores
 * only their SHA-256 hash, so a database read alone never yields a session.
 */

import "@tanstack/react-start/server-only";

import { deleteCookie, getCookie, getRequest, setCookie } from "@tanstack/react-start/server";

import type { CmsWorkerEnv, D1Database, D1Row } from "./db.server";

export const CMS_SESSION_COOKIE = "hb_cms_session";
export const CMS_SESSION_TTL_SECONDS = 12 * 60 * 60;
/**
 * Wave 1 — inactivity (idle) timeout: a session that has seen no authenticated
 * request for 15 minutes is rejected server-side, even if its absolute
 * `expires_at` is still in the future. Every successful session resolution
 * refreshes the idle deadline (sliding window, capped by the absolute 12h
 * `expires_at`, which remains the upper bound — this never extends a session
 * past its original absolute expiry).
 */
export const CMS_SESSION_IDLE_TIMEOUT_SECONDS = 15 * 60;
export const PBKDF2_ITERATIONS = 100_000;
/**
 * Bounds accepted by verifyPassword for STORED envelopes. The Workers
 * SubtleCrypto runtime rejects PBKDF2 iteration counts above 100,000, so an
 * envelope above PBKDF2_ITERATIONS can never verify on Workers — and asking
 * deriveBits to do unbounded work is a CPU-exhaustion vector. The floor
 * rejects degenerate envelopes (e.g. 1-iteration hashes).
 */
export const MIN_PBKDF2_ITERATIONS = 10_000;
/** Salt/hash byte lengths produced by hashPassword (16-byte salt, 256-bit hash). */
export const PBKDF2_SALT_BYTES = 16;
export const PBKDF2_HASH_BYTES = 32;

export const CMS_ROLES = ["viewer", "editor", "admin"] as const;
export type CmsRole = (typeof CMS_ROLES)[number];

export const CMS_CAPABILITIES = ["cms.read", "cms.write", "cms.publish", "cms.admin"] as const;
export type CmsCapability = (typeof CMS_CAPABILITIES)[number];

const ROLE_CAPABILITIES: Record<CmsRole, readonly CmsCapability[]> = {
  viewer: ["cms.read"],
  editor: ["cms.read", "cms.write"],
  admin: ["cms.read", "cms.write", "cms.publish", "cms.admin"],
};

export function isCmsRole(value: unknown): value is CmsRole {
  return typeof value === "string" && (CMS_ROLES as readonly string[]).includes(value);
}

export function hasCapability(role: CmsRole, capability: CmsCapability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export interface CmsSessionUser {
  id: string;
  username: string;
  displayName: string;
  role: CmsRole;
}

export interface CmsSession {
  user: CmsSessionUser;
  expiresAt: string;
}

/** Thrown by requireCapability / session resolution; maps to 401 or 403. */
export class CmsAuthError extends Error {
  readonly status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "CmsAuthError";
    this.status = status;
  }
}

export function requireCapability(
  session: CmsSession | null,
  capability: CmsCapability,
): asserts session is CmsSession {
  if (!session) {
    throw new CmsAuthError(401, "CMS authentication required.");
  }
  if (!hasCapability(session.user.role, capability)) {
    throw new CmsAuthError(403, `Role "${session.user.role}" lacks capability "${capability}".`);
  }
}

// ---------------------------------------------------------------------------
// Base64url helpers (no Buffer — Workers-compatible).
// ---------------------------------------------------------------------------

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hash identifying a session token row. The raw token never touches D1. */
export function hashSessionToken(token: string): Promise<string> {
  return sha256Hex(`hb-cms-session:${token}`);
}

// ---------------------------------------------------------------------------
// Passwords (PBKDF2-SHA256 envelope: pbkdf2$<iter>$<saltB64u>$<hashB64u>).
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export async function verifyPassword(password: string, envelope: string): Promise<boolean> {
  try {
    const parts = envelope.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
    const iterations = Number(parts[1]);
    if (
      !Number.isSafeInteger(iterations) ||
      iterations < MIN_PBKDF2_ITERATIONS ||
      iterations > PBKDF2_ITERATIONS
    )
      return false;
    const salt = base64UrlToBytes(parts[2] ?? "");
    const expected = base64UrlToBytes(parts[3] ?? "");
    if (salt.byteLength !== PBKDF2_SALT_BYTES || expected.byteLength !== PBKDF2_HASH_BYTES)
      return false;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
      key,
      PBKDF2_HASH_BYTES * 8,
    );
    return constantTimeEqual(new Uint8Array(bits), expected);
  } catch {
    // Malformed envelope, bad base64, or a SubtleCrypto failure (e.g. an
    // iteration count the runtime refuses): authentication fails closed.
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session tokens + cookies.
// ---------------------------------------------------------------------------

export function createSessionToken(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export function sessionExpiryIso(ttlSeconds = CMS_SESSION_TTL_SECONDS, from = new Date()): string {
  return new Date(from.getTime() + ttlSeconds * 1000).toISOString();
}

export function isExpired(expiresAt: string, now = new Date()): boolean {
  return Number.isNaN(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now.getTime();
}

/** Parse the raw session token out of a Cookie header (null when absent). */
export function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (name === CMS_SESSION_COOKIE) {
      const value = part.slice(index + 1).trim();
      return value === "" ? null : value;
    }
  }
  return null;
}

/** Serialize the session Set-Cookie value (call setCookie with this). */
export function buildSessionCookie(token: string, ttlSeconds = CMS_SESSION_TTL_SECONDS): string {
  return `${CMS_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${ttlSeconds}`;
}

export function buildClearedSessionCookie(): string {
  return `${CMS_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

// ---------------------------------------------------------------------------
// Session resolution against D1.
// ---------------------------------------------------------------------------

interface SessionRow extends D1Row {
  session_id: string;
  user_id: string;
  username: string;
  display_name: string;
  role: string;
  active: number;
  /** Sliding inactivity deadline: refreshed on every authenticated request. */
  expires_at: string;
  /** Session creation time: anchors the absolute 12h lifetime cap. */
  created_at: string;
}

/**
 * Absolute upper bound for any session, derived from the row's `created_at`
 * (login time) — no schema change needed. Garbage timestamps fail closed.
 */
export function sessionAbsoluteExpiryIso(createdAt: string): string | null {
  const createdMs = Date.parse(createdAt);
  if (Number.isNaN(createdMs)) return null;
  return new Date(createdMs + CMS_SESSION_TTL_SECONDS * 1000).toISOString();
}

/**
 * Resolve the current admin session from a raw token. Returns null for every
 * failure mode (unknown token, idle-expired, absolute-expired, revoked,
 * inactive user) — callers map null to 401 via requireCapability.
 *
 * Wave 1 — 15-minute INACTIVITY timeout (server-authoritative):
 *   * `expires_at` is the sliding idle deadline. A session idle longer than
 *     CMS_SESSION_IDLE_TIMEOUT_SECONDS is rejected, even with absolute
 *     lifetime remaining.
 *   * Every successful resolution refreshes the idle deadline to
 *     min(now + idle, absolute cap) — the session can never slide past its
 *     original 12h absolute expiry, so this is not an unlimited session.
 *   * The refresh write is best-effort and skipped when the stored deadline
 *     still has more than half the window left (bounds D1 writes to ~1 per
 *     7.5 min of activity). A failed refresh never invalidates a live
 *     session; worst case the user hits the older (earlier) deadline.
 *   * Expired/revoked sessions return null WITHOUT writing — an expired
 *     session can never be refreshed back to life.
 */
export async function resolveSessionUser(
  db: D1Database,
  token: string | null,
  now = new Date(),
): Promise<CmsSession | null> {
  if (!token) return null;
  const tokenHash = await hashSessionToken(token);
  const row = await db
    .prepare(
      `SELECT s.id AS session_id, s.user_id, u.username, u.display_name, u.role, u.active, s.expires_at, s.created_at
       FROM cms_sessions s
       JOIN cms_users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL`,
    )
    .bind(tokenHash)
    .first<SessionRow>();
  if (!row || row.active !== 1) return null;
  if (!isCmsRole(row.role)) return null;
  // Absolute cap first: created_at + 12h. Unparseable created_at fails closed.
  const absoluteIso = sessionAbsoluteExpiryIso(row.created_at);
  if (absoluteIso === null || isExpired(absoluteIso, now)) {
    // Wave 2 — expiry telemetry (best-effort; distinguishes absolute expiry
    // here vs idle expiry below by kind only in the audit row metadata path —
    // kind stays session_expired for both, outcome is informational).
    void import("./auth-telemetry.server").then(({ recordAuthTelemetry }) =>
      recordAuthTelemetry(db, {
        kind: "session_expired",
        outcome: "success",
        username: row.username,
        actorId: row.user_id,
        sessionId: row.session_id,
        at: now.toISOString(),
      }),
    );
    return null;
  }
  // Idle deadline second: unparseable expires_at fails closed.
  if (isExpired(row.expires_at, now)) {
    // Wave 2 — idle-timeout expiry telemetry (best-effort, same contract).
    void import("./auth-telemetry.server").then(({ recordAuthTelemetry }) =>
      recordAuthTelemetry(db, {
        kind: "session_expired",
        outcome: "success",
        username: row.username,
        actorId: row.user_id,
        sessionId: row.session_id,
        at: now.toISOString(),
      }),
    );
    return null;
  }
  const idleMs = CMS_SESSION_IDLE_TIMEOUT_SECONDS * 1000;
  // NaN-proof: isExpired() above already rejected garbage/unparseable
  // timestamps (NaN comparisons are false), so remainingMs is a real number
  // here — but the explicit guard keeps the refresh math honest if the flow
  // above ever changes.
  const expiresMs = Date.parse(row.expires_at);
  if (Number.isNaN(expiresMs)) return null;
  const remainingMs = expiresMs - now.getTime();
  if (remainingMs < idleMs / 2) {
    const refreshedIso = new Date(
      Math.min(now.getTime() + idleMs, Date.parse(absoluteIso)),
    ).toISOString();
    try {
      await db
        .prepare("UPDATE cms_sessions SET expires_at = ? WHERE token_hash = ?")
        .bind(refreshedIso, tokenHash)
        .run();
    } catch {
      // Refresh is advisory — the session already validated above.
    }
  }
  return {
    user: {
      id: row.user_id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
    },
    expiresAt: row.expires_at,
  };
}

// ---------------------------------------------------------------------------
// Login / bootstrap.
// ---------------------------------------------------------------------------

interface UserRow extends D1Row {
  id: string;
  username: string;
  display_name: string;
  role: string;
  password_hash: string;
  active: number;
}

/**
 * Structural check for a storable PBKDF2 envelope: correct shape, an
 * iteration count inside the Workers-compatible [MIN, PBKDF2_ITERATIONS]
 * window, and the exact salt/hash byte lengths hashPassword produces.
 * Synchronous — safe to gate bootstrap writes without attempting crypto.
 */
export function isValidPasswordEnvelope(envelope: unknown): boolean {
  if (typeof envelope !== "string") return false;
  const parts = envelope.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (
    !Number.isSafeInteger(iterations) ||
    iterations < MIN_PBKDF2_ITERATIONS ||
    iterations > PBKDF2_ITERATIONS
  )
    return false;
  try {
    const salt = base64UrlToBytes(parts[2] ?? "");
    const expected = base64UrlToBytes(parts[3] ?? "");
    return salt.byteLength === PBKDF2_SALT_BYTES && expected.byteLength === PBKDF2_HASH_BYTES;
  } catch {
    return false;
  }
}

/**
 * Structured, secret-free login-stage diagnostics.
 *
 * The bootstrap + bot-gate paths fail CLOSED and SILENTLY by design: a
 * misconfigured deployment (missing secret, malformed envelope, rejected
 * Turnstile token) returns the SAME generic 401 as a wrong password and
 * writes NOTHING to D1, so a total production lockout leaves zero evidence in
 * the database or the response body.
 *
 * These lines record WHICH stage refused, using stage names and booleans
 * ONLY — never a secret, token, password, hash, salt, or cookie. That makes a
 * production lockout diagnosable from Workers Logs without exposing anything
 * sensitive. Advisory only: it must never break an authentication flow.
 */
type AuthStageDetail = Record<string, boolean | number | string | null | readonly string[]>;

function authStage(stage: string, detail: AuthStageDetail): void {
  try {
    console.log(JSON.stringify({ scope: "cms_auth", stage, ...detail }));
  } catch {
    // Diagnostics are best-effort; a logging failure never fails a login.
  }
}

/**
 * One-time bootstrap: when cms_users is empty AND the deployment provides
 * CMS_ADMIN_USERNAME / CMS_ADMIN_PASSWORD_HASH env secrets, the first admin
 * is provisioned from them. The envelope is validated BEFORE the insert: a
 * malformed or Workers-incompatible hash fails closed (returns null) instead
 * of seeding an admin that can never log in. Otherwise login fails closed —
 * there is no default password, anywhere, ever.
 *
 * Every refusal is logged (stage + booleans, no secret values) because each
 * one is otherwise indistinguishable from a wrong password.
 */
export async function ensureBootstrapAdmin(
  db: D1Database,
  env: CmsWorkerEnv,
  now = new Date(),
): Promise<CmsSessionUser | null> {
  const count = await db.prepare("SELECT COUNT(*) AS n FROM cms_users").first<{ n: number }>();
  if (count && Number(count.n) > 0) return null;
  const username =
    typeof env.CMS_ADMIN_USERNAME === "string" && env.CMS_ADMIN_USERNAME.trim() !== ""
      ? env.CMS_ADMIN_USERNAME.trim()
      : null;
  const passwordHash =
    typeof env.CMS_ADMIN_PASSWORD_HASH === "string" && env.CMS_ADMIN_PASSWORD_HASH !== ""
      ? env.CMS_ADMIN_PASSWORD_HASH
      : null;
  if (!username || !passwordHash) {
    // Refusal reason matters: without it, "missing secret" and "wrong password"
    // are byte-identical to the caller AND leave no row in D1.
    authStage("bootstrap", {
      users_before: Number(count?.n ?? 0),
      outcome: "refused_missing_secret",
      username_present: username !== null,
      password_hash_present: passwordHash !== null,
    });
    return null;
  }
  // Fail closed on malformed or Workers-incompatible envelopes — seeding one
  // would provision an admin that can never log in.
  if (!isValidPasswordEnvelope(passwordHash)) {
    authStage("bootstrap", {
      users_before: Number(count?.n ?? 0),
      outcome: "refused_invalid_envelope",
      username_present: true,
      password_hash_present: true,
      envelope_valid: false,
    });
    return null;
  }
  const timestamp = now.toISOString();
  const user: CmsSessionUser = {
    id: `cms_user_${crypto.randomUUID()}`,
    username,
    displayName: username,
    role: "admin",
  };
  await db
    .prepare(
      `INSERT INTO cms_users (id, username, display_name, role, password_hash, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .bind(user.id, user.username, user.displayName, user.role, passwordHash, timestamp, timestamp)
    .run();
  authStage("bootstrap", { users_before: 0, outcome: "created", envelope_valid: true });
  return user;
}

/**
 * Verify credentials and open a session. Throws CmsAuthError(401) for unknown
 * users, inactive users, and wrong passwords alike (no oracle).
 */
export async function loginWithPassword(
  db: D1Database,
  username: string,
  password: string,
  now = new Date(),
): Promise<{ user: CmsSessionUser; token: string; expiresAt: string }> {
  const row = await db
    .prepare("SELECT * FROM cms_users WHERE username = ?")
    .bind(username.trim())
    .first<UserRow>();
  const valid =
    row !== null && row.active === 1 && (await verifyPassword(password, row.password_hash));
  if (!valid || !row || !isCmsRole(row.role)) {
    // Booleans only — never the username, hash, or password. `user_found` is
    // the signal that separates "bootstrap never ran / row missing" from
    // "row exists but the password did not verify".
    authStage("password", {
      outcome: "rejected",
      user_found: row !== null,
      user_active: row?.active === 1,
      role_valid: row ? isCmsRole(row.role) : false,
      password_verified: valid,
    });
    throw new CmsAuthError(401, "Invalid credentials.");
  }
  authStage("password", { outcome: "verified", password_verified: true });
  const token = createSessionToken();
  // Wave 1: a fresh session starts with a 15-minute IDLE deadline (refreshed
  // by every authenticated request, capped by the 12h absolute lifetime —
  // see resolveSessionUser/sessionAbsoluteExpiryIso). Previously a new
  // session inherited the full 12h as its first deadline.
  const expiresAt = sessionExpiryIso(CMS_SESSION_IDLE_TIMEOUT_SECONDS, now);
  await db
    .prepare(
      `INSERT INTO cms_sessions (id, user_id, token_hash, expires_at, created_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, NULL)`,
    )
    .bind(
      `cms_session_${crypto.randomUUID()}`,
      row.id,
      await hashSessionToken(token),
      expiresAt,
      now.toISOString(),
    )
    .run();
  return {
    user: {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
    },
    token,
    expiresAt,
  };
}

/** Revoke the session behind a raw token (logout is idempotent). */
export async function logoutSession(
  db: D1Database,
  token: string | null,
  now = new Date(),
): Promise<void> {
  if (!token) return;
  await db
    .prepare("UPDATE cms_sessions SET revoked_at = ? WHERE token_hash = ?")
    .bind(now.toISOString(), await hashSessionToken(token))
    .run();
}

// ---------------------------------------------------------------------------
// Request-scoped helpers (server functions / SSR loaders). Same mechanism as
// services/missions.server.ts: the Cloudflare env rides on the current
// request via Nitro's cloudflare-pages runtime — no globals, no singletons.
// ---------------------------------------------------------------------------

/** Raw session token from the current request's cookies (null when absent). */
export function getRequestSessionToken(): string | null {
  try {
    return getCookie(CMS_SESSION_COOKIE) ?? null;
  } catch {
    return null;
  }
}

/** Resolve the admin session for the current request (null = anonymous). */
export async function resolveRequestSession(
  db: D1Database,
  now = new Date(),
): Promise<CmsSession | null> {
  return resolveSessionUser(db, getRequestSessionToken(), now);
}

/**
 * Full login flow for the adminLogin server function: bootstrap provisioning
 * (first run only), credential verification, session creation + cookie.
 * Returns only the public session shape — the raw token travels via the
 * HttpOnly cookie, never in a response body.
 */
export async function performRequestLogin(
  db: D1Database,
  env: CmsWorkerEnv,
  username: string,
  password: string,
  now = new Date(),
): Promise<CmsSession> {
  await ensureBootstrapAdmin(db, env, now);
  const { user, token, expiresAt } = await loginWithPassword(db, username, password, now);
  setCookie(CMS_SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: CMS_SESSION_TTL_SECONDS,
  });
  return { user, expiresAt };
}

/** Full logout flow for the adminLogout server function (idempotent). */
export async function performRequestLogout(db: D1Database, now = new Date()): Promise<void> {
  await logoutSession(db, getRequestSessionToken(), now);
  deleteCookie(CMS_SESSION_COOKIE, { path: "/" });
}

/** Read-only access to the current request for env resolution elsewhere. */
export function getCmsRequest(): Request | null {
  try {
    return getRequest();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phase 20 — CSRF origin check + login rate limiting (defense in depth).
//
// Cookie context: mutations already ride on SameSite=Lax HttpOnly cookies,
// which blocks cross-site POST cookie sends. These helpers add a
// server-side second layer without changing legitimate same-origin flows:
//   * assertSameOriginForMutation() rejects a POST whose Origin/Referer host
//     disagrees with Host when either header is present; requests without
//     either header (non-browser clients, tests) pass through.
//   * Login throttling bounds password-guessing per username with a bounded
//     in-memory window (no KV writes, free-tier conscious). Distributed
//     brute force across instances is NOT stopped here — Cloudflare WAF /
//     rate-limit rules remain the production backstop (see report).
// ---------------------------------------------------------------------------

function headerHost(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Pure predicate: true when an Origin/Referer pair is same-origin with host. */
export function isSameOriginMutation(input: {
  origin: string | null;
  referer: string | null;
  host: string | null;
}): boolean {
  const host = (input.host ?? "").toLowerCase();
  if (host === "") return true;
  const originHost = headerHost(input.origin);
  if (originHost !== null) return originHost === host;
  const refererHost = headerHost(input.referer);
  if (refererHost !== null) return refererHost === host;
  return true;
}

/** Throw 403 when the current request carries a cross-origin Origin/Referer. */
export function assertSameOriginForMutation(): void {
  let req: Request | null = null;
  try {
    req = getRequest();
  } catch {
    return;
  }
  if (!req) return;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  if (origin === null && referer === null) return;
  const host =
    req.headers.get("host") ??
    (() => {
      try {
        return new URL(req.url).host;
      } catch {
        return null;
      }
    })();
  if (!isSameOriginMutation({ origin, referer, host })) {
    throw new CmsAuthError(403, "Cross-origin mutation rejected.");
  }
}

/**
 * Wave 1 — Turnstile server-side verification (official siteverify endpoint).
 *
 * Browser flow: Turnstile widget → challenge token → login request.
 * Server flow: receive token → POST to
 * https://challenges.cloudflare.com/turnstile/v0/siteverify with
 * (secret, response[, remoteip]) → only continue password verification on
 * `success: true`. The secret lives ONLY in server env
 * (CMS_TURNSTILE_SECRET, set via `wrangler secret put` / .dev.vars locally)
 * and NEVER enters the client bundle.
 *
 * Configuration modes (resolved per login attempt):
 *   * secret + site key configured → Turnstile MANDATORY, fail closed:
 *     missing/invalid/expired token, network error, or a failed verify all
 *     reject with the generic 401 (no oracle distinguishing Turnstile vs
 *     password vs account-state failures).
 *   * neither configured → Turnstile disabled; password path unchanged. This
 *     keeps local development working without committing credentials — but a
 *     production deployment MUST set both keys, and operations MUST treat a
 *     missing-keys production state as misconfigured, not as "Turnstile off
 *     by design". The settings/admin surface never reports which mode is
 *     active to unauthenticated callers.
 *   * exactly one configured → treated as configured-but-broken → fail
 *     closed (same generic 401). Half configuration never silently passes.
 */
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TIMEOUT_MS = 8000;
const TURNSTILE_MAX_TOKEN_LENGTH = 2048;

export function isTurnstileEnforced(env: CmsWorkerEnv): boolean {
  const secret =
    typeof env.CMS_TURNSTILE_SECRET === "string" ? env.CMS_TURNSTILE_SECRET.trim() : "";
  const siteKey =
    typeof env.CMS_TURNSTILE_SITE_KEY === "string" ? env.CMS_TURNSTILE_SITE_KEY.trim() : "";
  return secret !== "" && siteKey !== "";
}

export function isTurnstileHalfConfigured(env: CmsWorkerEnv): boolean {
  const secret =
    typeof env.CMS_TURNSTILE_SECRET === "string" ? env.CMS_TURNSTILE_SECRET.trim() : "";
  const siteKey =
    typeof env.CMS_TURNSTILE_SITE_KEY === "string" ? env.CMS_TURNSTILE_SITE_KEY.trim() : "";
  return (secret === "") !== (siteKey === "");
}

interface TurnstileVerifyResponse {
  success?: boolean;
  "error-codes"?: string[];
  hostname?: string;
  action?: string;
}

/**
 * Verify a Turnstile challenge token against Cloudflare's siteverify
 * endpoint. Returns true only on an explicit `success: true`. Every failure
 * mode — network error, timeout, non-2xx, malformed JSON, success:false —
 * returns false; the LOGIN caller maps false to the generic 401.
 * The token is never logged, never persisted, never audited.
 */
export async function verifyTurnstileToken(input: {
  secret: string;
  token: string;
  remoteIp?: string | null | undefined;
  expectedHostname?: string | null | undefined;
}): Promise<boolean> {
  const token = typeof input.token === "string" ? input.token.trim() : "";
  if (token === "" || token.length > TURNSTILE_MAX_TOKEN_LENGTH) return false;
  if (input.secret === "") return false;
  const body: Record<string, string> = { secret: input.secret, response: token };
  if (input.remoteIp) body["remoteip"] = input.remoteIp;
  let res: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS);
    try {
      res = await fetch(TURNSTILE_VERIFY_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    authStage("turnstile", { outcome: "network_error", http_status: null });
    return false;
  }
  if (!res.ok) {
    authStage("turnstile", { outcome: "http_error", http_status: res.status });
    return false;
  }
  let parsed: TurnstileVerifyResponse;
  try {
    parsed = (await res.json()) as TurnstileVerifyResponse;
  } catch {
    authStage("turnstile", { outcome: "malformed_json", http_status: res.status });
    return false;
  }
  // Cloudflare's own error-code names (e.g. invalid-input-response,
  // timeout-or-duplicate, invalid-input-secret) are safe to record: they
  // describe the failure CLASS, never the token or the secret. The single-use
  // "timeout-or-duplicate" code is the fingerprint of a replayed/reused token,
  // which no client-side change can fix.
  const errorCodes = Array.isArray(parsed?.["error-codes"])
    ? parsed["error-codes"].filter((code): code is string => typeof code === "string")
    : [];
  if (parsed?.success !== true) {
    authStage("turnstile", {
      outcome: "siteverify_rejected",
      http_status: res.status,
      success: false,
      error_codes: errorCodes,
      hostname: typeof parsed?.hostname === "string" ? parsed.hostname : null,
      action: typeof parsed?.action === "string" ? parsed.action : null,
      expected_hostname: input.expectedHostname ?? null,
    });
    return false;
  }
  if (
    input.expectedHostname &&
    typeof parsed.hostname === "string" &&
    parsed.hostname !== input.expectedHostname
  ) {
    authStage("turnstile", {
      outcome: "hostname_mismatch",
      http_status: res.status,
      success: true,
      hostname: parsed.hostname,
      expected_hostname: input.expectedHostname,
    });
    return false;
  }
  authStage("turnstile", {
    outcome: "verified",
    http_status: res.status,
    success: true,
    hostname: typeof parsed.hostname === "string" ? parsed.hostname : null,
    expected_hostname: input.expectedHostname ?? null,
  });
  return true;
}

/**
 * Enforce Turnstile for a login attempt. No-op when Turnstile is fully
 * unconfigured (local dev without keys). Throws generic CmsAuthError(401)
 * when enforced (or half-configured) and verification fails — callers must
 * NOT distinguish this from a bad password.
 */
export async function assertTurnstileForLogin(input: {
  env: CmsWorkerEnv;
  token: unknown;
  remoteIp?: string | null | undefined;
  expectedHostname?: string | null | undefined;
}): Promise<void> {
  const enforced = isTurnstileEnforced(input.env);
  const half = isTurnstileHalfConfigured(input.env);
  // Recording the resolved MODE is the single most useful production signal:
  // "off" means the widget cannot be enforced, "half-configured" means exactly
  // one key exists and every login fails closed. Booleans only — no key values.
  authStage("turnstile_mode", {
    enforced,
    half_configured: half,
    secret_present:
      typeof input.env.CMS_TURNSTILE_SECRET === "string" &&
      input.env.CMS_TURNSTILE_SECRET.trim() !== "",
    site_key_present:
      typeof input.env.CMS_TURNSTILE_SITE_KEY === "string" &&
      input.env.CMS_TURNSTILE_SITE_KEY.trim() !== "",
    token_present: typeof input.token === "string" && input.token.trim() !== "",
  });
  if (!enforced && !half) return;
  const secret =
    typeof input.env.CMS_TURNSTILE_SECRET === "string" ? input.env.CMS_TURNSTILE_SECRET.trim() : "";
  const ok =
    secret !== "" &&
    (await verifyTurnstileToken({
      secret,
      token: typeof input.token === "string" ? input.token : "",
      remoteIp: input.remoteIp,
      expectedHostname: input.expectedHostname,
    }));
  if (!ok) {
    // Same failure shape as a bad password: verifyPassword already burns
    // PBKDF2 time on the password path, so no extra delay is needed here to
    // avoid an oracle — the caller tries password verification next and its
    // timing dominates. (There is no standalone timing helper in this module;
    // the constant-time password comparison + generic message carry the load.)
    throw new CmsAuthError(401, "Invalid credentials.");
  }
}

const LOGIN_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_ATTEMPT_MAX = 10;
const LOGIN_ATTEMPT_MAX_KEYS = 500;
/**
 * Wave 1 — secondary IP-level throttle. Keyed ONLY on the Cloudflare-provided
 * CF-Connecting-IP header (the documented trustworthy client-IP mechanism on
 * Cloudflare; client-controlled X-Forwarded-For is NEVER read). Bounded like
 * the username map — attacker-controlled IPs cannot grow memory unboundedly.
 * 30 failures / 10 min / IP trips the gate; success never resets it (an IP
 * hammering many usernames keeps its own counter — per-account success must
 * not clear a distributed sweep's IP record).
 */
const LOGIN_IP_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_IP_MAX = 30;
const LOGIN_IP_MAX_KEYS = 1000;

const loginIpAttemptStore = new Map<string, LoginAttemptEntry>();

interface LoginAttemptEntry {
  count: number;
  windowStart: number;
}

const loginAttemptStore = new Map<string, LoginAttemptEntry>();

/** Test seam: clear all login-throttle counters. */
export function resetLoginRateLimits(): void {
  loginAttemptStore.clear();
}

function loginRateLimitKey(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Fail-closed login throttle: at most LOGIN_ATTEMPT_MAX failures per username
 * per 10-minute window. Callers record SUCCESS via noteLoginSuccess (resets)
 * and FAILURE via noteLoginFailure; checkLoginRateLimit throws 429-shaped
 * CmsAuthError... mapped here to 401-adjacent 403 to avoid new status
 * plumbing: callers surface "too many attempts" without an oracle.
 */
export function checkLoginRateLimit(username: string, now = Date.now()): void {
  const entry = loginAttemptStore.get(loginRateLimitKey(username));
  if (!entry) return;
  if (now - entry.windowStart >= LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttemptStore.delete(loginRateLimitKey(username));
    return;
  }
  if (entry.count >= LOGIN_ATTEMPT_MAX) {
    throw new CmsAuthError(403, "Too many login attempts. Try again later.");
  }
}

export function noteLoginFailure(username: string, now = Date.now()): void {
  const key = loginRateLimitKey(username);
  const entry = loginAttemptStore.get(key);
  if (!entry || now - entry.windowStart >= LOGIN_ATTEMPT_WINDOW_MS) {
    if (loginAttemptStore.size >= LOGIN_ATTEMPT_MAX_KEYS && !loginAttemptStore.has(key)) {
      const oldest = loginAttemptStore.keys().next();
      if (!oldest.done) loginAttemptStore.delete(oldest.value);
    }
    loginAttemptStore.set(key, { count: 1, windowStart: now });
    return;
  }
  entry.count += 1;
}

export function noteLoginSuccess(username: string): void {
  loginAttemptStore.delete(loginRateLimitKey(username));
}

/**
 * Trustworthy client IP for the IP-level throttle: ONLY CF-Connecting-IP,
 * which Cloudflare sets from the TCP peer and clients cannot spoof through
 * the CDN. X-Forwarded-For / X-Real-IP are never consulted. Returns null
 * outside the Cloudflare runtime or when the header is absent — callers
 * treat null as "no IP signal", never as a throttle key.
 */
export function getRequestClientIp(): string | null {
  let req: Request | null = null;
  try {
    req = getRequest();
  } catch {
    return null;
  }
  if (!req) return null;
  const raw = req.headers.get("cf-connecting-ip");
  if (!raw) return null;
  const ip = raw.trim();
  if (ip === "" || ip.length > 64) return null;
  return ip;
}

function loginIpRateLimitKey(ip: string): string {
  return ip.trim().toLowerCase().slice(0, 64);
}

/** Throw 403 when an IP burned through LOGIN_IP_MAX failures this window. */
export function checkLoginIpRateLimit(ip: string | null, now = Date.now()): void {
  if (!ip) return;
  const key = loginIpRateLimitKey(ip);
  const entry = loginIpAttemptStore.get(key);
  if (!entry) return;
  if (now - entry.windowStart >= LOGIN_IP_WINDOW_MS) {
    loginIpAttemptStore.delete(key);
    return;
  }
  if (entry.count >= LOGIN_IP_MAX) {
    throw new CmsAuthError(403, "Too many login attempts. Try again later.");
  }
}

/** Record an IP-level failure (bounded map; oldest evicted when full). */
export function noteLoginIpFailure(ip: string | null, now = Date.now()): void {
  if (!ip) return;
  const key = loginIpRateLimitKey(ip);
  const entry = loginIpAttemptStore.get(key);
  if (!entry || now - entry.windowStart >= LOGIN_IP_WINDOW_MS) {
    if (loginIpAttemptStore.size >= LOGIN_IP_MAX_KEYS && !loginIpAttemptStore.has(key)) {
      const oldest = loginIpAttemptStore.keys().next();
      if (!oldest.done) loginIpAttemptStore.delete(oldest.value);
    }
    loginIpAttemptStore.set(key, { count: 1, windowStart: now });
    return;
  }
  entry.count += 1;
}

/** Test seam: clear the IP-level throttle (username map untouched). */
export function resetLoginIpRateLimits(): void {
  loginIpAttemptStore.clear();
}
