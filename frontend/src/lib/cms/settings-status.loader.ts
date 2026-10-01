import { createServerFn } from "@tanstack/react-start";

/**
 * Wave 2 — Settings console status readers (read-only facts, never secrets).
 *
 * Every value is a SAFE-TO-DISPLAY posture fact:
 *   * Turnstile: enforced / half-configured / off (mode only, never keys);
 *   * R2 media: bucket bound or not, public base URL (public by design);
 *   * session facts: TTL + idle window constants (public contract);
 *   * auth telemetry: cms_auth_events present (migration 0011 ran) or not.
 *
 * No passwords, hashes, tokens, private keys, or env secrets ever cross this
 * boundary — status is Configured / Not configured / Managed server-side.
 */

async function requireSettingsSession() {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { resolveRequestSession, CmsAuthError } = await import("./auth.server");
  const { db } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  return { db, session };
}

export interface SettingsStatus {
  turnstile: "enforced" | "half-configured" | "off";
  r2BucketBound: boolean;
  r2BaseUrl: string | null;
  sessionAbsoluteHours: number;
  sessionIdleMinutes: number;
  telemetryAvailable: boolean;
  mediaTotal: number;
  userTotal: number;
}

export const getSettingsStatus = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async (): Promise<SettingsStatus> => {
    const { db, session } = await requireSettingsSession();
    void session;
    const { env } = await (await import("./db.server")).resolveRequestCmsDb();
    const { isTurnstileEnforced, isTurnstileHalfConfigured } = await import("./auth.server");
    const turnstile = isTurnstileEnforced(env)
      ? ("enforced" as const)
      : isTurnstileHalfConfigured(env)
        ? ("half-configured" as const)
        : ("off" as const);
    const bucket = (env as { MEDIA_BUCKET?: unknown }).MEDIA_BUCKET;
    const r2BucketBound =
      !!bucket &&
      typeof (bucket as { put?: unknown }).put === "function" &&
      typeof (bucket as { delete?: unknown }).delete === "function";
    const rawBase =
      typeof (env as { R2_PUBLIC_BASE_URL?: unknown }).R2_PUBLIC_BASE_URL === "string"
        ? String((env as { R2_PUBLIC_BASE_URL?: unknown }).R2_PUBLIC_BASE_URL).trim()
        : "";
    const { R2_PUBLIC_BASE_URL } = await import("./r2.server");
    const r2BaseUrl = rawBase !== "" ? rawBase : R2_PUBLIC_BASE_URL;
    const { CMS_SESSION_TTL_SECONDS, CMS_SESSION_IDLE_TIMEOUT_SECONDS } =
      await import("./auth.server");
    let telemetryAvailable = false;
    try {
      await db.prepare("SELECT id FROM cms_auth_events LIMIT 1").first<{ id: string }>();
      telemetryAvailable = true;
    } catch {
      telemetryAvailable = false;
    }
    const mediaRow = await db
      .prepare("SELECT COUNT(*) AS n FROM media_assets WHERE status != 'deleted'")
      .first<{ n: number }>()
      .catch(() => null);
    const userRow = await db
      .prepare("SELECT COUNT(*) AS n FROM cms_users")
      .first<{ n: number }>()
      .catch(() => null);
    return {
      turnstile,
      r2BucketBound,
      r2BaseUrl,
      sessionAbsoluteHours: Math.round(CMS_SESSION_TTL_SECONDS / 3600),
      sessionIdleMinutes: Math.round(CMS_SESSION_IDLE_TIMEOUT_SECONDS / 60),
      telemetryAvailable,
      mediaTotal: Number(mediaRow?.n ?? 0),
      userTotal: Number(userRow?.n ?? 0),
    };
  });
