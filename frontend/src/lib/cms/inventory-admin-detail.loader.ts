import { createServerFn } from "@tanstack/react-start";
import { requireContentId } from "./admin-inputs";

/**
 * Phase 16 — inventory detail reader backing /admin/inventory/$contentId.
 *
 * Read-only detail surface over the four Phase 14 entity tables. The editor
 * route already has dedicated mutation boundaries (updateAdminWeapon,
 * updateAdminTrap, upsertAdminPerkTranslation, setAdminSchematicPerks,
 * publishAdminInventoryContent); this module only assembles the current
 * record + translations so one loader round-trip renders the form.
 */

async function requireInventoryRead() {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { resolveRequestSession, hasCapability, CmsAuthError } = await import("./auth.server");
  const { db } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  if (!hasCapability(session.user.role, "cms.read")) throw new CmsAuthError(403, "Forbidden.");
  return { db };
}

export const getContentByIdLite = createServerFn({ method: "GET" })
  .validator((input: { contentId: string }) => ({
    contentId: requireContentId(input.contentId),
  }))
  .handler(async ({ data }): Promise<{ entityType: string; status: string }> => {
    const { db } = await requireInventoryRead();
    const { getContentById } = await import("./db.server");
    const content = await getContentById(db, data.contentId);
    if (!content) throw new Error("Content not found.");
    return { entityType: content.entity_type, status: content.status };
  });

export interface InventoryDetail {
  contentId: string;
  record: Record<string, string | number | null>;
  translations: Array<{ locale: string; title: string; body: string; slug: string }>;
}

export const getInventoryDetail = createServerFn({ method: "GET" })
  .validator((input: { contentId: string }) => ({
    contentId: requireContentId(input.contentId),
  }))
  .handler(async ({ data }): Promise<InventoryDetail> => {
    const { db } = await requireInventoryRead();
    const { getContentById } = await import("./db.server");
    const content = await getContentById(db, data.contentId);
    if (!content) throw new Error("Content not found.");

    const table =
      content.entity_type === "weapon"
        ? "weapon_records"
        : content.entity_type === "trap"
          ? "trap_records"
          : content.entity_type === "perk"
            ? "perk_records"
            : content.entity_type === "schematic"
              ? "schematic_records"
              : null;
    if (!table) throw new Error(`Not an inventory entity: ${content.entity_type}.`);

    const record = await db
      .prepare(`SELECT * FROM ${table} WHERE content_id = ?`)
      .bind(data.contentId)
      .first<Record<string, string | number | null>>();
    if (!record) throw new Error("Inventory record not found.");

    const { results } = await db
      .prepare(
        "SELECT locale, title, body, slug FROM cms_content_translations WHERE content_id = ?",
      )
      .bind(data.contentId)
      .all<{ locale: string; title: string; body: string; slug: string }>();

    return {
      contentId: data.contentId,
      record: record as Record<string, string | number | null>,
      translations: results,
    };
  });
