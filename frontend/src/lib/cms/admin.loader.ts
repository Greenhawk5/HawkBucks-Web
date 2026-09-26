import { createServerFn } from "@tanstack/react-start";

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
}

export const adminLogin = createServerFn({ method: "POST" })
  .validator((input: AdminLoginInput) => input)
  .handler(async ({ data }): Promise<AdminSessionShape> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { performRequestLogin, CmsAuthError } = await import("./auth.server");
    const username = typeof data.username === "string" ? data.username.trim() : "";
    const password = typeof data.password === "string" ? data.password : "";
    if (username === "" || password === "") {
      throw new CmsAuthError(401, "Invalid credentials.");
    }
    const { db, env } = await resolveRequestCmsDb();
    const session = await performRequestLogin(db, env, username, password);
    return { authenticated: true, user: session.user, expiresAt: session.expiresAt };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { performRequestLogout } = await import("./auth.server");
    const { db } = await resolveRequestCmsDb();
    await performRequestLogout(db);
    return { ok: true };
  },
);

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
  .validator((input: AdminMediaListInput) => input)
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
