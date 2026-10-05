import { createServerFn } from "@tanstack/react-start";
import { clampAdminPaging, requireNonEmptyString } from "./admin-inputs";

/**
 * Phase 11 — CMS admin server-function boundary.
 *
 * Browser → THESE server functions → src/lib/cms/*.server.ts → D1 / provider.
 * This file is the ONLY client-importable CMS surface: it carries no secrets,
 * no D1 handles, no provider keys — every handler dynamically imports the
 * server-only modules (same pattern as lib/preferences.loader.ts), so the
 * import-protection plugin keeps them out of the client bundle.
 *
 * Authorization is enforced INSIDE each handler via requireCapability — the
 * admin UI hiding a button enforces nothing.
 */

export interface AdminSessionShape {
  authenticated: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
    role: string;
  } | null;
  expiresAt: string | null;
}

export const getAdminSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminSessionShape> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { resolveRequestSession } = await import("./auth.server");
    const { db } = await resolveRequestCmsDb();
    const session = await resolveRequestSession(db);
    if (!session) {
      return { authenticated: false, user: null, expiresAt: null };
    }
    return { authenticated: true, user: session.user, expiresAt: session.expiresAt };
  },
);

export interface AdminLoginInput {
  username: string;
  password: string;
  /**
   * Wave 1 — Cloudflare Turnstile challenge token from the login-page widget.
   * Optional at the transport layer so local dev without Turnstile keys keeps
   * working; REQUIRED server-side whenever Turnstile is enforced (secret +
   * site key configured) — assertTurnstileForLogin fails closed on a missing
   * token in that mode. Never logged, persisted, or audited.
   */
  turnstileToken?: string;
}

/**
 * Wave 1 — public, client-safe reader for the Turnstile SITE key (public by
 * design; the SECRET never leaves auth.server.ts). Returns null when
 * Turnstile is unconfigured so the login page skips the widget in local dev.
 */
export const getTurnstileSiteKey = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ siteKey: string | null }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { isTurnstileEnforced } = await import("./auth.server");
    const { env } = await resolveRequestCmsDb();
    if (!isTurnstileEnforced(env)) return { siteKey: null };
    const siteKey =
      typeof env.CMS_TURNSTILE_SITE_KEY === "string" ? env.CMS_TURNSTILE_SITE_KEY.trim() : "";
    return { siteKey: siteKey === "" ? null : siteKey };
  },
);

export const adminLogin = createServerFn({ method: "POST" })
  .validator((input: AdminLoginInput) => ({
    username: requireNonEmptyString(input.username, "username").trim(),
    password: requireNonEmptyString(input.password, "password"),
    turnstileToken:
      input.turnstileToken === undefined || input.turnstileToken === null
        ? undefined
        : (() => {
            if (typeof input.turnstileToken !== "string") {
              throw new Error("Invalid input: expected string.");
            }
            return input.turnstileToken.slice(0, 2048);
          })(),
  }))
  .handler(async ({ data }): Promise<AdminSessionShape> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const {
      performRequestLogin,
      assertSameOriginForMutation,
      assertTurnstileForLogin,
      checkLoginRateLimit,
      checkLoginIpRateLimit,
      getRequestClientIp,
      noteLoginFailure,
      noteLoginIpFailure,
      noteLoginSuccess,
      CmsAuthError,
    } = await import("./auth.server");
    const username = typeof data.username === "string" ? data.username.trim() : "";
    const password = typeof data.password === "string" ? data.password : "";
    if (username === "" || password === "") {
      throw new CmsAuthError(401, "Invalid credentials.");
    }
    assertSameOriginForMutation();
    // Defense in depth: per-account throttle (primary) + per-IP throttle
    // keyed ONLY on CF-Connecting-IP (secondary). Both checked BEFORE any
    // password work; both recorded on failure. Success resets the account
    // counter (existing behavior preserved); the IP counter is append-only
    // per window so distributed sweeps keep their record.
    checkLoginRateLimit(username);
    const clientIp = getRequestClientIp();
    checkLoginIpRateLimit(clientIp);
    const { db, env } = await resolveRequestCmsDb();
    try {
      // Bot gate FIRST: when Turnstile is enforced, an invalid token rejects
      // before password verification burns PBKDF2 time on bot traffic — and
      // every rejection (Turnstile, password, account state) surfaces the
      // same generic 401, so no oracle distinguishes the cause.
      // Hostname binding for the Turnstile response: derived from the
      // incoming request's Host header (NOT client input, NOT a global).
      // Null outside a request context → hostname check skipped, success
      // boolean still enforced.
      let expectedHostname: string | null = null;
      try {
        const { getCmsRequest } = await import("./auth.server");
        const req = getCmsRequest();
        const host = req?.headers.get("host") ?? null;
        if (host) expectedHostname = host.split(",")[0]?.trim().split(":")[0] ?? null;
        if (expectedHostname === "") expectedHostname = null;
      } catch {
        expectedHostname = null;
      }
      await assertTurnstileForLogin({
        env,
        token: data.turnstileToken,
        remoteIp: clientIp,
        expectedHostname,
      });
      const session = await performRequestLogin(db, env, username, password);
      noteLoginSuccess(username);
      // Wave 2 — auth telemetry (best-effort, privacy-scrubbed at write;
      // never blocks authentication). Outcome only — no secrets, no raw IP.
      // AWAITED: recordAuthEvent resolves the module load AND the INSERT before
      // this handler returns, so the row is durable in D1. The previous
      // `void import(...).then(...)` fire-and-forget let the runtime tear the
      // isolate down mid-write, which is why Activity & Security always read
      // 0 logins. It never throws, so the login result is unchanged.
      const { recordAuthEvent } = await import("./auth-telemetry.server");
      await recordAuthEvent(db, {
        kind: "login",
        outcome: "success",
        username,
        actorId: session.user.id,
      });
      return { authenticated: true, user: session.user, expiresAt: session.expiresAt };
    } catch (error) {
      noteLoginFailure(username);
      noteLoginIpFailure(clientIp);
      // Wave 2 — failed-login telemetry. Same privacy contract; recorded even
      // when the failure was a throttle or bot-gate rejection (generic 401/403
      // surface unchanged — this only appends an audit row).
      if (error instanceof CmsAuthError) {
        const status = error.status;
        if (status === 401 || status === 403) {
          // Awaited for the same durability reason as the success path — the
          // throw below re-throws immediately, so an un-awaited write would be
          // discarded along with the response.
          const { recordAuthEvent } = await import("./auth-telemetry.server");
          await recordAuthEvent(db, { kind: "login", outcome: "failure", username });
        }
      }
      throw error;
    }
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { performRequestLogout, assertSameOriginForMutation, resolveRequestSession } =
      await import("./auth.server");
    assertSameOriginForMutation();
    const { db } = await resolveRequestCmsDb();
    // Wave 2 — capture the actor BEFORE revocation clears the session.
    const before = await resolveRequestSession(db).catch(() => null);
    await performRequestLogout(db);
    // Wave 2 — logout telemetry (best-effort; anonymous logout still records
    // an event with a null actor so session-end volume stays honest).
    // Awaited so the row is durable before the handler returns.
    const { recordAuthEvent } = await import("./auth-telemetry.server");
    await recordAuthEvent(db, {
      kind: "logout",
      outcome: "success",
      username: before?.user.username ?? null,
      actorId: before?.user.id ?? null,
    });
    return { ok: true };
  },
);

export interface AdminTestPushInput {
  endpoint: string;
}

export interface AdminTestPushResult {
  success: boolean;
  delivered: boolean;
  status: number;
  message?: string;
}

/**
 * Notification hotfix — protected diagnostic test push.
 *
 * Sends the FIXED generic test payload to the subscription
 * registered for `endpoint` — which in practice is the browser
 * making the request (the admin's own device), since the client
 * passes its live PushSubscription endpoint. The Worker resolves
 * the row by endpoint and uses the real VAPID + RFC 8291
 * delivery path; it never claims or modifies the once-per-UTC-day
 * WebBox notification slot.
 *
 * Authorization: authenticated CMS session with the "cms.admin"
 * capability — enforced HERE server-side (UI hiding enforces
 * nothing). The payload is fixed server-side, so even a valid
 * admin cannot craft arbitrary notification content, and the
 * endpoint must be a well-formed https URL. This is NOT a public
 * push endpoint: anonymous → 401, insufficient role → 403.
 */
export const sendTestPush = createServerFn({ method: "POST" })
  .validator((input: AdminTestPushInput) => {
    const endpoint = typeof input.endpoint === "string" ? input.endpoint.trim() : "";
    if (!endpoint || endpoint.length > 2048) {
      throw new Error("Invalid input: expected an endpoint URL.");
    }
    try {
      const parsed = new URL(endpoint);
      if (parsed.protocol !== "https:") {
        throw new Error("Invalid input: expected an https endpoint.");
      }
    } catch {
      throw new Error("Invalid input: expected an https endpoint.");
    }
    return { endpoint };
  })
  .handler(async ({ data }): Promise<AdminTestPushResult> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    // Explicitly typed so requireCapability's `asserts` signature is usable
    // (TS2775 rejects assertion calls on a bare destructured binding).
    const auth: typeof import("./auth.server") = await import("./auth.server");
    // POST mutation → CSRF guard first, before any DB or network work.
    auth.assertSameOriginForMutation();
    const { db } = await resolveRequestCmsDb();
    const session = await auth.resolveRequestSession(db);
    // Explicit capability gate: only CMS admins may trigger a test push.
    auth.requireCapability(session, "cms.admin");
    const { sendTestPushServer } = await import("@/services/push.server");
    return sendTestPushServer({ endpoint: data.endpoint });
  });

export interface AdminMediaListInput {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface AdminMediaItem {
  id: string;
  provider: string;
  deliveryUrl: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  altText: string;
  status: string;
  createdAt: string;
}

/** Minimal media-library reader for the admin proof-of-concept screen. */
export const listAdminMedia = createServerFn({ method: "GET" })
  .validator((input: AdminMediaListInput) => {
    if (
      input.status !== undefined &&
      input.status !== "ready" &&
      input.status !== "processing" &&
      input.status !== "failed" &&
      input.status !== "deleted"
    ) {
      throw new Error("Invalid media status filter.");
    }
    return { status: input.status, ...clampAdminPaging(input) };
  })
  .handler(async ({ data }): Promise<{ items: AdminMediaItem[] }> => {
    const { resolveRequestCmsDb, listMediaAssets } = await import("./db.server");
    const { resolveRequestSession, hasCapability, CmsAuthError } = await import("./auth.server");
    const { db } = await resolveRequestCmsDb();
    const session = await resolveRequestSession(db);
    // Explicit 401/403 (no assertion indirection): anonymous → 401,
    // authenticated-but-unprivileged → 403. UI hiding enforces nothing.
    if (!session) {
      throw new CmsAuthError(401, "CMS authentication required.");
    }
    if (!hasCapability(session.user.role, "cms.read")) {
      throw new CmsAuthError(403, 'Role lacks capability "cms.read".');
    }
    const status =
      data.status === "ready" ||
      data.status === "processing" ||
      data.status === "failed" ||
      data.status === "deleted"
        ? data.status
        : undefined;
    const rows = await listMediaAssets(
      db,
      status === undefined
        ? {
            limit: typeof data.limit === "number" ? data.limit : 50,
            offset: typeof data.offset === "number" ? data.offset : 0,
          }
        : {
            status,
            limit: typeof data.limit === "number" ? data.limit : 50,
            offset: typeof data.offset === "number" ? data.offset : 0,
          },
    );
    return {
      items: rows.map((row) => ({
        id: row.id,
        provider: row.provider,
        deliveryUrl: row.delivery_url,
        originalFilename: row.original_filename,
        mimeType: row.mime_type,
        byteSize: row.byte_size,
        width: row.width,
        height: row.height,
        altText: row.alt_text,
        status: row.status,
        createdAt: row.created_at,
      })),
    };
  });
