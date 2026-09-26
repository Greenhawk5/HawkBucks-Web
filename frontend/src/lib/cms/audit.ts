/**
 * Phase 11 — generic audit/history support for privileged CMS operations.
 *
 * Convention: audit records are APPEND-ONLY. Application code only INSERTs
 * and SELECTs cms_audit_events (no update/delete helpers exist anywhere).
 * Every privileged mutation (content create/update/publish/unpublish,
 * translation upsert, slug change, media upload/delete, preview issuance,
 * auth events) records one event with actor + action + resource + timestamp.
 *
 * Secrets, tokens, password material, and provider private metadata must
 * NEVER enter metadata_json — buildAuditEvent redacts suspicious keys.
 *
 * Pure logic, no framework imports.
 */

export const AUDIT_ACTIONS = [
  "cms.login",
  "cms.logout",
  "content.create",
  "content.update",
  "content.publish",
  "content.unpublish",
  "content.archive",
  "translation.upsert",
  "slug.reserve",
  "media.upload",
  "media.delete",
  "preview.issue",
  "preview.revoke",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditActor {
  id: string | null;
  username: string | null;
}

export interface AuditEventInput {
  actor: AuditActor;
  action: AuditAction | (string & {});
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  /** ISO timestamp override (tests); defaults to now. */
  at?: string;
}

export interface AuditEvent {
  id: string;
  actorId: string | null;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadataJson: string;
  createdAt: string;
}

/** Keys that must never be persisted, matched case-insensitively. */
const SECRET_KEY_PATTERN =
  /(secret|token|password|passwd|pwd|private_key|privatekey|api[_-]?key|auth|credential|session|cookie)/i;

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEY_PATTERN.test(key) ? "[redacted]" : redactValue(entry);
    }
    return out;
  }
  return value;
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!metadata) return {};
  return redactValue(metadata) as Record<string, unknown>;
}

function createEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `audit_${crypto.randomUUID()}`;
  }
  return `audit_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function buildAuditEvent(input: AuditEventInput): AuditEvent {
  const createdAt = input.at ?? new Date().toISOString();
  return {
    id: createEventId(),
    actorId: input.actor.id,
    actorUsername: input.actor.username,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadataJson: JSON.stringify(sanitizeAuditMetadata(input.metadata)),
    createdAt,
  };
}
