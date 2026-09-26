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
  user_id: string;
  username: string;
  display_name: string;
  role: string;
  active: number;
  expires_at: string;
}

/**
 * Resolve the current admin session from a raw token. Returns null for every
 * failure mode (unknown token, expired, revoked, inactive user) — callers
 * map null to 401 via requireCapability.
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
      `SELECT s.user_id, u.username, u.display_name, u.role, u.active, s.expires_at
       FROM cms_sessions s
       JOIN cms_users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL`,
    )
    .bind(tokenHash)
    .first<SessionRow>();
  if (!row || row.active !== 1) return null;
  if (isExpired(row.expires_at, now)) return null;
  if (!isCmsRole(row.role)) return null;
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
 * One-time bootstrap: when cms_users is empty AND the deployment provides
 * CMS_ADMIN_USERNAME / CMS_ADMIN_PASSWORD_HASH env secrets, the first admin
 * is provisioned from them. The envelope is validated BEFORE the insert: a
 * malformed or Workers-incompatible hash fails closed (returns null) instead
 * of seeding an admin that can never log in. Otherwise login fails closed —
 * there is no default password, anywhere, ever.
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
  if (!username || !passwordHash) return null;
  // Fail closed on malformed or Workers-incompatible envelopes — seeding one
  // would provision an admin that can never log in.
  if (!isValidPasswordEnvelope(passwordHash)) return null;
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
    throw new CmsAuthError(401, "Invalid credentials.");
  }
  const token = createSessionToken();
  const expiresAt = sessionExpiryIso(CMS_SESSION_TTL_SECONDS, now);
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
