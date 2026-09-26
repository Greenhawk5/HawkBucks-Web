import { createServerFn } from "@tanstack/react-start";
// Phase 15 — published-only schematic detail (public fields only).
export interface PublicSchematicDetail {
  contentId: string;
  slug: string;
  title: string;
  description: string;
  kind: "weapon" | "trap";
  iconUrl: string | null;
  translationStatus: string;
  completeLocales: string[];
  slugsByLocale: Record<string, string>;
  weapon: {
    contentId: string;
    slug: string;
    title: string;
    description: string;
    weaponSubtype: string;
    imageUrl: string | null;
  } | null;
  trap: {
    contentId: string;
    slug: string;
    title: string;
    description: string;
    trapSubtype: string;
    imageUrl: string | null;
  } | null;
  perks: Array<{
    contentId: string;
    perkKey: string;
    perkType: string;
    slotOrder: number;
    name: string | null;
    description: string;
    imageUrl: string | null;
  }>;
}
export const getPublicSchematic = createServerFn({ method: "GET" })
  .validator((i: { locale?: string; slug?: string }) => i)
  .handler(async ({ data }): Promise<{ schematic: PublicSchematicDetail | null }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { getPublishedSchematicDetail } = await import("./schematics-inventory.server");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const slug = typeof data.slug === "string" ? data.slug : "";
    if (slug === "") return { schematic: null };
    const { db } = await resolveRequestCmsDb();
    const s = await getPublishedSchematicDetail(db, { locale, slug });
    if (!s) return { schematic: null };
    const perks: PublicSchematicDetail["perks"] = s.perks.map((p) => ({
      contentId: p.perk.content.id,
      perkKey: p.perk.perk.perk_key,
      perkType: p.perk.perk.perk_type,
      slotOrder: p.slotOrder,
      name: p.perk.perkName,
      description: p.perk.perkDescription,
      imageUrl: p.perk.iconUrl,
    }));
    const { results: trows } = await db
      .prepare(
        "SELECT locale, slug, translation_status FROM cms_content_translations WHERE content_id = ?",
      )
      .bind(s.content.id)
      .all<{ locale: string; slug: string; translation_status: string }>();
    const completeLocales = trows
      .filter((t) => t.translation_status === "complete")
      .map((t) => t.locale);
    const slugsByLocale: Record<string, string> = {};
    for (const t of trows) {
      if (t.translation_status === "complete" && t.slug) slugsByLocale[t.locale] = t.slug;
    }
    return {
      schematic: {
        contentId: s.content.id,
        slug: s.translation.slug,
        title: s.translation.title,
        description: s.translation.body,
        kind: s.kind,
        iconUrl: s.iconUrl,
        translationStatus: s.translation.translation_status,
        completeLocales,
        slugsByLocale,
        weapon: s.weapon
          ? {
              contentId: s.weapon.content.id,
              slug: s.weapon.translation.slug,
              title: s.weapon.translation.title,
              description: s.weapon.translation.body,
              weaponSubtype: s.weapon.weapon.weapon_subtype,
              imageUrl: s.weapon.iconUrl,
            }
          : null,
        trap: s.trap
          ? {
              contentId: s.trap.content.id,
              slug: s.trap.translation.slug,
              title: s.trap.translation.title,
              description: s.trap.translation.body,
              trapSubtype: s.trap.trap.trap_subtype,
              imageUrl: s.trap.iconUrl,
            }
          : null,
        perks,
      },
    };
  });
