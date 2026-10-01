import { createServerFn } from "@tanstack/react-start";
import { clampAdminPaging } from "./admin-inputs";

/**
 * Wave 2 — Activity & Security intelligence readers (real data only).
 *
 * Surfaces over EXISTING + NEW (migration 0011) tables:
 *   * listActivityEvents — cms_audit_events with server-side action-prefix,
 *     outcome, actor, entity, and date-range filters (bounded 200/page);
 *   * getActivitySummary — KPI counts computed from the same tables over a
 *     caller window; NO percentages, NO trends — only counts with window;
 *   * getActivitySeries — per-day buckets for the ECharts multi-series area
 *     chart. Buckets come from stored created_at values only — days with no
 *     events are explicit zeros, never interpolated fabrication;
 *   * listAuthEvents — cms_auth_events login history (privacy-scrubbed at
 *     write; graceful empty state when migration 0011 has not run yet).
 *
 * All four require cms.admin — the same bar as the existing audit reader.
 * Every filter runs server-side in SQL.
 */

async function requireActivitySession() {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { resolveRequestSession, hasCapability, CmsAuthError } = await import("./auth.server");
  const { db } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  if (!hasCapability(session.user.role, "cms.admin")) throw new CmsAuthError(403, "Forbidden.");
  return { db, session };
}

const ACTION_FAMILIES = [
  "content.",
  "translation.",
  "media.",
  "slug.",
  "cms.",
  "preview.",
] as const;

export interface ActivityEventItem {
  id: string;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadataJson: string;
  createdAt: string;
}

export interface ActivityFilters {
  family?: string | undefined;
  outcome?: string | undefined;
  actor?: string | undefined;
  entityType?: string | undefined;
  since?: string | undefined;
  until?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

function parseActivityFilters(input: Record<string, unknown>): ActivityFilters & {
  limit: number;
  offset: number;
} {
  const { limit, offset } = clampAdminPaging(input);
  const rawFamily = input["family"];
  const family =
    typeof rawFamily === "string" && (ACTION_FAMILIES as readonly string[]).includes(rawFamily)
      ? rawFamily
      : undefined;
  const rawOutcome = input["outcome"];
  const outcome = rawOutcome === "success" || rawOutcome === "failure" ? rawOutcome : undefined;
  const rawActor = input["actor"];
  const actor =
    typeof rawActor === "string" && rawActor.trim() !== ""
      ? rawActor.trim().slice(0, 64)
      : undefined;
  const rawEntity = input["entityType"];
  const entityType =
    typeof rawEntity === "string" && rawEntity.trim() !== ""
      ? rawEntity.trim().slice(0, 64)
      : undefined;
  const rawSince = input["since"];
  const since =
    typeof rawSince === "string" && !Number.isNaN(Date.parse(rawSince))
      ? new Date(rawSince).toISOString()
      : undefined;
  const rawUntil = input["until"];
  const until =
    typeof rawUntil === "string" && !Number.isNaN(Date.parse(rawUntil))
      ? new Date(rawUntil).toISOString()
      : undefined;
  return { family, outcome, actor, entityType, since, until, limit, offset };
}

function outcomeForAction(action: string): "success" | "failure" | null {
  if (/(^|\.)(failure|fail|revoke|delete|expired)$/.test(action)) return "failure";
  if (/cms\.login/.test(action)) return "success";
  return null;
}

export const listActivityEvents = createServerFn({ method: "GET" })
  .validator((i: ActivityFilters) => parseActivityFilters(i as Record<string, unknown>))
  .handler(async ({ data }): Promise<{ items: ActivityEventItem[] }> => {
    const { db } = await requireActivitySession();
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (data.family) {
      clauses.push("action LIKE ?");
      values.push(data.family + "%");
    }
    if (data.actor) {
      clauses.push("actor_username = ?");
      values.push(data.actor);
    }
    if (data.entityType) {
      clauses.push("entity_type = ?");
      values.push(data.entityType);
    }
    if (data.since) {
      clauses.push("created_at >= ?");
      values.push(data.since);
    }
    if (data.until) {
      clauses.push("created_at <= ?");
      values.push(data.until);
    }
    const where = clauses.length > 0 ? "WHERE " + clauses.join(" AND ") : "";
    const limit = Math.min(data.limit, 200);
    const { results } = await db
      .prepare(
        "SELECT id, actor_username, action, entity_type, entity_id, metadata_json, created_at " +
          "FROM cms_audit_events " +
          where +
          " ORDER BY created_at DESC LIMIT ? OFFSET ?",
      )
      .bind(...values, limit, data.offset)
      .all<{
        id: string;
        actor_username: string | null;
        action: string;
        entity_type: string;
        entity_id: string;
        metadata_json: string;
        created_at: string;
      }>();
    let items = results.map((r) => ({
      id: r.id,
      actorUsername: r.actor_username,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      metadataJson: r.metadata_json,
      createdAt: r.created_at,
    }));
    // Outcome is a semantic overlay (no outcome column on cms_audit_events):
    // filter in JS after the bounded SQL page — documented, deterministic.
    if (data.outcome) {
      items = items.filter((i) => outcomeForAction(i.action) === data.outcome);
    }
    return { items };
  });

export interface ActivitySummary {
  windowDays: number;
  windowSince: string;
  successfulLogins: number;
  failedLogins: number;
  contentChanges: number;
  mediaOperations: number;
  hasAuthHistory: boolean;
}

export const getActivitySummary = createServerFn({ method: "GET" })
  .validator((i: { days?: number }) => ({
    days:
      typeof i.days === "number" && Number.isFinite(i.days)
        ? Math.max(1, Math.min(90, Math.floor(i.days)))
        : 7,
  }))
  .handler(async ({ data }): Promise<ActivitySummary> => {
    const { db } = await requireActivitySession();
    const since = new Date(Date.now() - data.days * 86400 * 1000).toISOString();
    const countAction = async (like: string): Promise<number> => {
      const row = await db
        .prepare(
          "SELECT COUNT(*) AS n FROM cms_audit_events WHERE action LIKE ? AND created_at >= ?",
        )
        .bind(like, since)
        .first<{ n: number }>();
      return Number(row?.n ?? 0);
    };
    const [contentBase, translationCount, slugCount, mediaOps] = await Promise.all([
      countAction("content.%"),
      countAction("translation.%"),
      countAction("slug.%"),
      countAction("media.%"),
    ]);
    const contentChanges = contentBase + translationCount + slugCount;
    // Auth KPIs prefer the dedicated cms_auth_events table (migration 0011);
    // fall back to legacy cms.login audit rows when the table does not exist
    // yet (pre-migration deployment) — and say so honestly.
    let successfulLogins = 0;
    let failedLogins = 0;
    let hasAuthHistory = false;
    try {
      const ok = await db
        .prepare(
          "SELECT COUNT(*) AS n FROM cms_auth_events WHERE kind = 'login' AND outcome = 'success' AND created_at >= ?",
        )
        .bind(since)
        .first<{ n: number }>();
      const bad = await db
        .prepare(
          "SELECT COUNT(*) AS n FROM cms_auth_events WHERE kind = 'login' AND outcome = 'failure' AND created_at >= ?",
        )
        .bind(since)
        .first<{ n: number }>();
      successfulLogins = Number(ok?.n ?? 0);
      failedLogins = Number(bad?.n ?? 0);
      hasAuthHistory = true;
    } catch {
      successfulLogins = await countAction("cms.login");
      failedLogins = 0;
      hasAuthHistory = false;
    }
    return {
      windowDays: data.days,
      windowSince: since,
      successfulLogins,
      failedLogins,
      contentChanges,
      mediaOperations: mediaOps,
      hasAuthHistory,
    };
  });

export interface ActivitySeriesPoint {
  day: string;
  successfulLogins: number;
  failedLogins: number;
  contentChanges: number;
  mediaOperations: number;
}

export const getActivitySeries = createServerFn({ method: "GET" })
  .validator((i: { days?: number }) => ({
    days:
      typeof i.days === "number" && Number.isFinite(i.days)
        ? Math.max(1, Math.min(90, Math.floor(i.days)))
        : 14,
  }))
  .handler(async ({ data }): Promise<{ days: ActivitySeriesPoint[]; hasAuthHistory: boolean }> => {
    const { db } = await requireActivitySession();
    const since = new Date(Date.now() - data.days * 86400 * 1000).toISOString();
    const labels: string[] = [];
    for (let i = data.days - 1; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 86400 * 1000);
      labels.push(d.toISOString().slice(0, 10));
    }
    const bucket = async (sql: string, bind: unknown[]): Promise<Map<string, number>> => {
      const out = new Map<string, number>();
      try {
        const { results } = await db
          .prepare(sql)
          .bind(...bind)
          .all<{ day: string; n: number }>();
        for (const r of results) out.set(r.day, Number(r.n ?? 0));
      } catch {
        // Missing table (pre-migration) → empty buckets, honestly reported.
      }
      return out;
    };
    const [auditContent, auditMedia, authOk, authBad] = await Promise.all([
      bucket(
        "SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM cms_audit_events " +
          "WHERE (action LIKE 'content.%' OR action LIKE 'translation.%' OR action LIKE 'slug.%') " +
          "AND created_at >= ? GROUP BY day",
        [since],
      ),
      bucket(
        "SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM cms_audit_events " +
          "WHERE action LIKE 'media.%' AND created_at >= ? GROUP BY day",
        [since],
      ),
      bucket(
        "SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM cms_auth_events " +
          "WHERE kind = 'login' AND outcome = 'success' AND created_at >= ? GROUP BY day",
        [since],
      ),
      bucket(
        "SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM cms_auth_events " +
          "WHERE kind = 'login' AND outcome = 'failure' AND created_at >= ? GROUP BY day",
        [since],
      ),
    ]);
    const hasAuthHistory = authOk.size > 0 || authBad.size > 0;
    const days: ActivitySeriesPoint[] = labels.map((day) => ({
      day,
      successfulLogins: authOk.get(day) ?? 0,
      failedLogins: authBad.get(day) ?? 0,
      contentChanges: auditContent.get(day) ?? 0,
      mediaOperations: auditMedia.get(day) ?? 0,
    }));
    return { days, hasAuthHistory };
  });

export interface AuthHistoryItem {
  id: string;
  kind: string;
  outcome: string;
  username: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  deviceLabel: string | null;
  deviceKind: string | null;
  createdAt: string;
}

export const listAuthEvents = createServerFn({ method: "GET" })
  .validator((i: { kind?: string; outcome?: string; limit?: number; offset?: number }) => {
    const { limit, offset } = clampAdminPaging(i as { limit?: unknown; offset?: unknown });
    const rawKind = (i as { kind?: unknown }).kind;
    const kind =
      typeof rawKind === "string" &&
      ["login", "logout", "session_expired", "session_revoked"].includes(rawKind)
        ? rawKind
        : undefined;
    const rawOutcome = (i as { outcome?: unknown }).outcome;
    const outcome = rawOutcome === "success" || rawOutcome === "failure" ? rawOutcome : undefined;
    return { kind, outcome, limit: Math.min(limit, 100), offset };
  })
  .handler(async ({ data }): Promise<{ items: AuthHistoryItem[]; available: boolean }> => {
    const { db } = await requireActivitySession();
    try {
      const clauses: string[] = [];
      const values: unknown[] = [];
      if (data.kind) {
        clauses.push("kind = ?");
        values.push(data.kind);
      }
      if (data.outcome) {
        clauses.push("outcome = ?");
        values.push(data.outcome);
      }
      const where = clauses.length > 0 ? "WHERE " + clauses.join(" AND ") : "";
      const { results } = await db
        .prepare(
          "SELECT id, kind, outcome, username, country, region, city, " +
            "device_label, device_kind, created_at " +
            "FROM cms_auth_events " +
            where +
            " ORDER BY created_at DESC LIMIT ? OFFSET ?",
        )
        .bind(...values, data.limit, data.offset)
        .all<{
          id: string;
          kind: string;
          outcome: string;
          username: string | null;
          country: string | null;
          region: string | null;
          city: string | null;
          device_label: string | null;
          device_kind: string | null;
          created_at: string;
        }>();
      return {
        available: true,
        items: results.map((r) => ({
          id: r.id,
          kind: r.kind,
          outcome: r.outcome,
          username: r.username,
          country: r.country,
          region: r.region,
          city: r.city,
          deviceLabel: r.device_label,
          deviceKind: r.device_kind,
          createdAt: r.created_at,
        })),
      };
    } catch {
      // Pre-migration deployment: table absent → honest empty state, no fake rows.
      return { available: false, items: [] };
    }
  });
