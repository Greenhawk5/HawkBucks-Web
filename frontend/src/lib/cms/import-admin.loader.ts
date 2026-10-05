import { createServerFn } from "@tanstack/react-start";

import { CmsAuthError, requireCapability, resolveRequestSession } from "./auth.server";
import {
  IMPORT_ENTITY_KINDS,
  MAX_IMPORT_DOCUMENT_BYTES,
  formatImportIssue,
  isImportEntityKind,
  parseImportDocument,
  type ImportEntityKind,
} from "./import-schemas";
import { SCHEMATIC_ENTITY_TYPE, TRAP_ENTITY_TYPE, WEAPON_ENTITY_TYPE } from "./content-types";
import type { D1Database } from "./db.server";

/**
 * Wave 1 — CMS JSON object import boundary.
 *
 * Flow (A1: validate the whole file, then create, with compensating rollback):
 *
 *   1. transport shape check (kind + document size)
 *   2. parse            → malformed JSON is reported as a PARSER error
 *   3. validate         → every item, all errors, nothing written yet
 *   4. resolve media    → one batched query proves each id is usable
 *   5. resolve targets  → schematics' weapon/trap must exist, match entity
 *                         type, and be unclaimed (incl. within the file)
 *   6. ── any issue at all → return { created: [], errors } with ZERO writes ──
 *   7. create sequentially, tracking every contentId
 *   8. any failure mid-way → roll back EVERY contentId created so far
 *
 * ATOMICITY, precisely
 * --------------------
 * D1 has no interactive transactions; `db.batch()` is the only atomic unit and
 * the existing create path is not batched. So this is *all-or-nothing with
 * compensation*, not a database transaction: if item 4 fails while creating,
 * items 1–3 are deleted before the error is returned. The admin therefore
 * observes N drafts or 0 drafts — never a silent partial import. The residual
 * window (process death between create and rollback) is inherent to the
 * platform's create path and is stated in the failure message rather than
 * hidden.
 *
 * Nothing here reimplements a domain rule: item validation delegates to the
 * editor predicates (import-schemas.ts), creation delegates to
 * content-create.server.ts, which is the same service `createAdminHero` /
 * `createAdminSchematic` use.
 */

async function requireWriteSession() {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { assertSameOriginForMutation } = await import("./auth.server");
  assertSameOriginForMutation();
  const { db } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  requireCapability(session, "cms.write");
  return { db, session };
}

export interface ImportAdminInput {
  /** Which CMS section the file targets; must be an importable entity kind. */
  kind: string;
  /** Raw JSON text, exactly as uploaded. Never trusted, always re-validated. */
  document: string;
}

export interface ImportItemResult {
  /** 1-based position in the uploaded file, preserved from the input order. */
  item: number;
  contentId: string;
  title: string;
  /**
   * The slug actually reserved. May differ from the requested slug because
   * `upsertContentTranslation` resolves collisions; reporting the requested
   * value would point the administrator at a URL that does not exist.
   */
  slug: string;
  /** Set when the requested slug was changed to resolve a collision. */
  slugAdjusted: boolean;
}

export interface ImportAdminResult {
  ok: boolean;
  kind: ImportEntityKind;
  created: ImportItemResult[];
  /** Empty on success. */
  errors: string[];
  /** Parser-level failure, kept separate from per-field validation errors. */
  parseError: string | null;
}

function failure(
  kind: ImportEntityKind,
  errors: string[],
  parseError: string | null,
): ImportAdminResult {
  return { ok: false, kind, created: [], errors, parseError };
}

export const importAdminObjects = createServerFn({ method: "POST" })
  .validator((input: ImportAdminInput) => {
    if (typeof input?.kind !== "string" || !isImportEntityKind(input.kind)) {
      throw new Error(
        `Unsupported import kind. Expected one of ${JSON.stringify(IMPORT_ENTITY_KINDS)}.`,
      );
    }
    if (typeof input?.document !== "string" || input.document.trim() === "") {
      throw new Error("document is required.");
    }
    if (input.document.length > MAX_IMPORT_DOCUMENT_BYTES) {
      throw new Error("document exceeds the maximum import size.");
    }
    return { kind: input.kind, document: input.document };
  })
  .handler(async ({ data }): Promise<ImportAdminResult> => {
    const { db, session } = await requireWriteSession();
    const kind = data.kind;
    const actor = { id: session.user.id, username: session.user.username };

    // --- 2 + 3. parse and validate the ENTIRE document before any write ------
    const parsed = parseImportDocument(data.document, kind);
    if (!parsed.ok) {
      if (parsed.parseError !== null) {
        return failure(kind, [], parsed.parseError);
      }
      return failure(kind, parsed.issues.map(formatImportIssue), null);
    }
    const document = parsed.document;
    const errors: string[] = [];

    // --- 4. resolve every referenced media id in ONE query --------------------
    // `listUsableMediaAssetIds` applies the same `isUsableMediaStatus` rule as
    // the per-item `assertMediaUsable` the writer will run, so this pre-check
    // can never approve an id the writer would then reject.
    const { listUsableMediaAssetIds } = await import("./db.server");
    const mediaRefs = collectMediaRefs(document.items);
    if (mediaRefs.ids.size > 0) {
      const usable = await listUsableMediaAssetIds(db, [...mediaRefs.ids]);
      for (const [id, locations] of mediaRefs.byId) {
        if (usable.has(id)) continue;
        errors.push(
          `${locations} → expected an existing, usable Media Asset id; ${JSON.stringify(id)} is unknown, tombstoned, or failed`,
        );
      }
    }

    // --- 5. resolve schematic targets ---------------------------------------
    if (kind === SCHEMATIC_ENTITY_TYPE) {
      errors.push(...(await validateSchematicTargets(db, document.items)));
    }

    if (errors.length > 0) {
      // Nothing was written. This is the "no silent partial import" guarantee.
      return failure(kind, errors, null);
    }

    // --- 7. create sequentially, tracking every content id ------------------
    const { createDraftFromImportItem, rollbackCreatedDrafts } =
      await import("./content-create.server");
    const created: ImportItemResult[] = [];
    const rollbackRefs: Array<{ entityType: string; contentId: string }> = [];

    for (let index = 0; index < document.items.length; index++) {
      const entry = document.items[index];
      if (entry === undefined) continue;
      const itemNumber = index + 1;
      try {
        const result = await createDraftFromImportItem(db, actor, entry);
        rollbackRefs.push({ entityType: entry.kind, contentId: result.contentId });
        const validated = entry.item;
        const requestedSlug =
          typeof validated.slug === "string" && validated.slug !== ""
            ? validated.slug
            : validated.title;
        created.push({
          item: itemNumber,
          contentId: result.contentId,
          title: validated.title,
          slug: result.slug,
          slugAdjusted: result.slug !== requestedSlug,
        });
      } catch (e) {
        // --- 8. compensate: undo EVERY draft this import created ------------
        const report = await rollbackCreatedDrafts(db, rollbackRefs, actor);
        const detail =
          report.failures.length === 0
            ? ""
            : ` Manual cleanup required for ${report.failures.length} draft(s): ${report.failures.map((f) => f.contentId).join(", ")}.`;
        return failure(
          kind,
          [
            `Item ${itemNumber}: the server rejected this record after ${created.length} draft(s) were created, so the whole import was rolled back (${report.removed}/${report.attempted} removed). Reason: ${e instanceof Error ? e.message : "unknown error"}.${detail}`,
          ],
          null,
        );
      }
    }

    // First-class audit record for the import as a whole. The per-item
    // content.create events are already written by the create service; this one
    // records the bulk operation itself, which is what an auditor needs to see.
    const { recordAuditEvent } = await import("./db.server");
    const { buildAuditEvent } = await import("./audit");
    await recordAuditEvent(
      db,
      buildAuditEvent({
        actor,
        action: "content.import",
        entityType: kind,
        entityId: `import_${created.length}`,
        metadata: {
          kind,
          items: created.length,
          contentIds: created.map((c) => c.contentId),
          slugs: created.map((c) => c.slug),
        },
      }),
    );

    return {
      ok: true,
      kind,
      created,
      errors: [],
      parseError: null,
    };
  });

/**
 * Resolve targets for schematic items BEFORE creating anything.
 *
 * Three classes of problem, all of which would otherwise surface only when the
 * writer hits them — i.e. halfway through a bulk import:
 *   a. the referenced content id does not exist;
 *   b. it exists but is the wrong entity type (e.g. a hero id as a weapon);
 *   c. it already has a schematic, or two items in this file claim the same one
 *      (`idx_schematic_records_weapon` / `_trap` are UNIQUE, so the second
 *      create would abort the whole run).
 */
async function validateSchematicTargets(
  db: D1Database,
  items: Array<{ kind: string; item: unknown }>,
): Promise<string[]> {
  const errors: string[] = [];

  interface Target {
    contentId: string;
    expected: typeof WEAPON_ENTITY_TYPE | typeof TRAP_ENTITY_TYPE;
    item: number;
    field: string;
  }
  const targets: Target[] = [];
  const claimedWithinFile = new Map<string, number>();

  for (let index = 0; index < items.length; index++) {
    const item = items[index]?.item as
      { weaponContentId?: string | null; trapContentId?: string | null } | undefined;
    if (item === undefined) continue;
    const itemNumber = index + 1;
    const weapon = item.weaponContentId ?? null;
    const trap = item.trapContentId ?? null;
    for (const [value, expected, field] of [
      [weapon, WEAPON_ENTITY_TYPE, "weaponContentId"],
      [trap, TRAP_ENTITY_TYPE, "trapContentId"],
    ] as const) {
      if (value === null) continue;
      targets.push({ contentId: value, expected, item: itemNumber, field });
      const previous = claimedWithinFile.get(value);
      if (previous !== undefined) {
        errors.push(
          `Item ${itemNumber} → ${field}: ${JSON.stringify(value)} is already claimed by item ${previous} in this file; each weapon or trap may have exactly one schematic`,
        );
      } else {
        claimedWithinFile.set(value, itemNumber);
      }
    }
  }
  if (targets.length === 0) return errors;

  const unique = [...new Set(targets.map((t) => t.contentId))];
  const placeholders = unique.map(() => "?").join(", ");
  const { results } = await db
    .prepare(
      `SELECT c.id AS id, c.entity_type AS entity_type
         FROM cms_contents c
        WHERE c.id IN (${placeholders})`,
    )
    .bind(...unique)
    .all<{ id: string; entity_type: string }>();
  const found = new Map(results.map((r) => [r.id, r.entity_type]));

  for (const target of targets) {
    const entityType = found.get(target.contentId);
    if (entityType === undefined) {
      errors.push(
        `Item ${target.item} → ${target.field}: no content with id ${JSON.stringify(target.contentId)} exists`,
      );
      continue;
    }
    if (entityType !== target.expected) {
      errors.push(
        `Item ${target.item} → ${target.field}: expected a "${target.expected}" content id, but ${JSON.stringify(target.contentId)} is a "${entityType}"`,
      );
    }
  }

  // Existing schematics claim their weapon/trap exclusively (UNIQUE indexes).
  const { results: claimed } = await db
    .prepare(
      `SELECT weapon_content_id, trap_content_id FROM schematic_records
        WHERE weapon_content_id IN (${placeholders}) OR trap_content_id IN (${placeholders})`,
    )
    .bind(...unique, ...unique)
    .all<{ weapon_content_id: string | null; trap_content_id: string | null }>();
  const claimedIds = new Set<string>();
  for (const row of claimed) {
    if (row.weapon_content_id !== null) claimedIds.add(row.weapon_content_id);
    if (row.trap_content_id !== null) claimedIds.add(row.trap_content_id);
  }
  for (const target of targets) {
    if (!claimedIds.has(target.contentId)) continue;
    errors.push(
      `Item ${target.item} → ${target.field}: ${JSON.stringify(target.contentId)} already has a schematic`,
    );
  }

  return errors;
}

/**
 * Collect every media id referenced by the document, keeping the item numbers
 * that reference each one so the error can point at all of them at once.
 */
function collectMediaRefs(items: Array<{ kind: string; item: unknown }>): {
  ids: Set<string>;
  byId: Map<string, string[]>;
} {
  const ids = new Set<string>();
  const byId = new Map<string, string[]>();
  items.forEach((entry, index) => {
    const itemNumber = index + 1;
    const fields = entry.item as Record<string, unknown>;
    for (const key of ["portraitAssetId", "bannerAssetId", "iconAssetId"]) {
      const value = fields[key];
      if (typeof value !== "string" || value === "") continue;
      ids.add(value);
      const locations = byId.get(value);
      const label = `Item ${itemNumber} → ${key}`;
      if (locations === undefined) byId.set(value, [label]);
      else locations.push(label);
    }
  });
  return { ids, byId };
}
