/**
 * Wave 2 — privacy-conscious auth telemetry (SERVER-ONLY).
 *
 * One append-only cms_auth_events row per login outcome, logout, session
 * expiry, and session revocation. Privacy rules (enforced HERE, at write):
 *   * username stored (account identifier — required for security auditing);
 *   * IP stored as SHA-256 hash ("hb-cms-ip-v1" domain) — NEVER raw IP;
 *   * geo ONLY coarse country/region/city from trusted Cloudflare headers
 *     (CF-IPCountry, CF-Region-Code/CF-Region, CF-City) — else NULL;
 *   * device as short parsed label + coarse kind — raw User-Agent NEVER stored;
 *   * session row id stored — NEVER raw session tokens or hashes.
 *
 * Pure helpers (parseDeviceLabel, hashClientIp, readCoarseGeo) are unit
 * tested; recordAuthEvent is best-effort (never breaks login/logout when D1
 * is missing the new table — e.g. a deployment that has not run migration
 * 0011 yet — it logs and returns).
 */

import "@tanstack/react-start/server-only";

import type { D1Database } from "./db.server";

export type AuthEventKind = "login" | "logout" | "session_expired" | "session_revoked";
export type AuthEventOutcome = "success" | "failure";

export interface AuthTelemetryInput {
  kind: AuthEventKind;
  outcome: AuthEventOutcome;
  username?: string | null | undefined;
  actorId?: string | null | undefined;
  sessionId?: string | null | undefined;
  /** Raw client IP (CF-Connecting-IP) — hashed before storage, never stored. */
  clientIp?: string | null | undefined;
  /** Trusted Cloudflare geo headers (already read from the request). */
  country?: string | null | undefined;
  region?: string | null | undefined;
  city?: string | null | undefined;
  /** Raw User-Agent — parsed to a short label, never stored. */
  userAgent?: string | null | undefined;
  at?: string | undefined;
}

export type DeviceKind = "desktop" | "mobile" | "tablet" | "unknown";

const BROWSER_PATTERNS: Array<[RegExp, string]> = [
  [/edg\/[\d.]+/i, "Edge"],
  [/opr\/[\d.]+|opera/i, "Opera"],
  [/firefox\/[\d.]+/i, "Firefox"],
  [/crios\/[\d.]+/i, "Chrome"],
  [/chrome\/[\d.]+/i, "Chrome"],
  [/fxios\/[\d.]+/i, "Firefox"],
  [/version\/[\d.]+.*safari/i, "Safari"],
  [/safari\/[\d.]+/i, "Safari"],
];

const OS_PATTERNS: Array<[RegExp, string]> = [
  [/windows nt/i, "Windows"],
  [/mac os x|macintosh/i, "macOS"],
  [/android/i, "Android"],
  [/iphone|ipad|ios/i, "iOS"],
  [/linux/i, "Linux"],
  [/cros/i, "ChromeOS"],
];

/**
 * Parse a raw User-Agent into a short display label ("Chrome · Windows ·
 * Desktop"). Unknown pieces collapse to "Unknown" — never echo the raw string.
 */
export function parseDeviceLabel(userAgent: string | null | undefined): {
  label: string;
  kind: DeviceKind;
} {
  if (!userAgent || userAgent.trim() === "" || userAgent.length > 512) {
    return { label: "Unknown device", kind: "unknown" };
  }
  const ua = userAgent;
  let browser: string | null = null;
  for (const [pattern, name] of BROWSER_PATTERNS) {
    if (pattern.test(ua)) {
      browser = name;
      break;
    }
  }
  let os: string | null = null;
  for (const [pattern, name] of OS_PATTERNS) {
    if (pattern.test(ua)) {
      os = name;
      break;
    }
  }
  const lower = ua.toLowerCase();
  const kind: DeviceKind =
    /tablet|ipad/.test(lower) && !/mobile/.test(lower)
      ? "tablet"
      : /mobile|android|iphone/.test(lower)
        ? "mobile"
        : /windows|macintosh|mac os x|linux|cros/.test(lower)
          ? "desktop"
          : "unknown";
  const kindLabel = kind === "unknown" ? "Unknown" : kind[0]?.toUpperCase() + kind.slice(1);
  return {
    label: `${browser ?? "Unknown browser"} · ${os ?? "Unknown OS"} · ${kindLabel}`,
    kind,
  };
}

/** SHA-256 hash of a client IP under a fixed domain — raw IP never persists. */
export async function hashClientIp(ip: string | null | undefined): Promise<string | null> {
  if (!ip || ip.trim() === "" || ip.length > 64) return null;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`hb-cms-ip-v1:${ip.trim()}`),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanGeo(value: string | null | undefined, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > max) return null;
  // Coarse geo codes only — letters, digits, spaces, dashes, dots.
  if (!/^[A-Za-z0-9 _.~-]+$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Read coarse geo from trusted Cloudflare headers on the request. Only the
 * documented CDN-set headers are consulted — client-controlled values are
 * never trusted for geo.
 */
export function readCoarseGeo(req: Request | null): {
  country: string | null;
  region: string | null;
  city: string | null;
} {
  if (!req) return { country: null, region: null, city: null };
  const country = cleanGeo(req.headers.get("cf-ipcountry"), 4) ?? null;
  const region =
    cleanGeo(req.headers.get("cf-region-code") ?? req.headers.get("cf-region"), 16) ?? null;
  const city = cleanGeo(req.headers.get("cf-city"), 64) ?? null;
  // "XX"/"T1" are Cloudflare's unknown/tor markers — store as NULL (no signal).
  return {
    country: country === "XX" || country === "T1" ? null : country,
    region,
    city,
  };
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/**
 * Best-effort auth-event insert. Resolves the request context itself (IP, geo,
 * UA) unless the caller already supplied values. Never throws — telemetry must
 * never break authentication flows; a missing table (pre-0011 deployment)
 * degrades to a no-op.
 */
export async function recordAuthTelemetry(
  db: D1Database,
  input: AuthTelemetryInput,
): Promise<void> {
  try {
    let clientIp = input.clientIp ?? null;
    let country = input.country ?? null;
    let region = input.region ?? null;
    let city = input.city ?? null;
    let userAgent = input.userAgent ?? null;
    try {
      const { getCmsRequest } = await import("./auth.server");
      const { getRequestClientIp } = await import("./auth.server");
      const req = getCmsRequest();
      if (req) {
        if (clientIp == null) clientIp = getRequestClientIp();
        if (userAgent == null) userAgent = req.headers.get("user-agent");
        if (input.country === undefined || input.region === undefined || input.city === undefined) {
          const geo = readCoarseGeo(req);
          if (input.country === undefined) country = geo.country;
          if (input.region === undefined) region = geo.region;
          if (input.city === undefined) city = geo.city;
        }
      }
    } catch {
      // No request context (unit tests) — use caller-supplied values as-is.
    }
    const { label, kind } = parseDeviceLabel(userAgent);
    const ipHash = await hashClientIp(clientIp);
    await db
      .prepare(
        `INSERT INTO cms_auth_events
          (id, kind, outcome, username, actor_id, session_id, ip_hash,
           country, region, city, device_label, device_kind, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newId("auth"),
        input.kind,
        input.outcome,
        input.username ?? null,
        input.actorId ?? null,
        input.sessionId ?? null,
        ipHash,
        cleanGeo(country, 4),
        cleanGeo(region, 16),
        cleanGeo(city, 64),
        label,
        kind,
        input.at ?? new Date().toISOString(),
      )
      .run();
  } catch {
    // Telemetry is advisory — authentication flows must never fail because an
    // audit insert did (missing table, D1 hiccup, no request context).
  }
}

export interface AuthEventRow {
  id: string;
  kind: string;
  outcome: string;
  username: string | null;
  actorId: string | null;
  sessionId: string | null;
  ipHash: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  deviceLabel: string | null;
  deviceKind: string | null;
  createdAt: string;
}
