import { createServerFn } from "@tanstack/react-start";
import {
  requireContentId,
  requireNonEmptyString,
  asOptionalNumber,
  asOptionalString,
  asOptionalStringOrNull,
  stripUndefined,
} from "./admin-inputs";

/**
 * Game Item Catalog + evolution-override admin boundaries (SERVER-ONLY fns).
 *
 * Thin transport over `./catalog.server`: shape validation here (admin-inputs
 * helpers, fail-closed before any DB I/O), domain validation + audit in the
 * service. Every mutation requires `cms.write` + same-origin, exactly like the
 * hero/inventory boundaries. Nothing here publishes content — lifecycle stays
 * a separate, `cms.publish` action.
 */

async function requireCatalogSession(
  cap: "cms.read" | "cms.write" | "cms.publish",
  mutate = false,
) {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { resolveRequestSession, hasCapability, CmsAuthError, assertSameOriginForMutation } =
    await import("./auth.server");
  if (mutate) assertSameOriginForMutation();
  const { db } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  if (!hasCapability(session.user.role, cap)) throw new CmsAuthError(403, "Forbidden.");
  return { db, session };
}

function actorOf(session: { user: { id: string; username: string } }) {
  return { id: session.user.id, username: session.user.username };
}

// ---------------------------------------------------------------------------
// Catalog lists (cms.read)
// ---------------------------------------------------------------------------

export const listAdminCatalogResources = createServerFn({ method: "GET" })
  .validator((i: Record<string, unknown>) => ({
    search: asOptionalString(i["search"]),
    category: asOptionalString(i["category"]),
    status: asOptionalString(i["status"]),
    limit: asOptionalNumber(i["limit"]),
    offset: asOptionalNumber(i["offset"]),
  }))
  .handler(async ({ data }) => {
    const { db } = await requireCatalogSession("cms.read");
    const { listCatalogResources } = await import("./catalog.server");
    return listCatalogResources(db, stripUndefined(data));
  });

export const getAdminCatalogResource = createServerFn({ method: "GET" })
  .validator((i: { id: string }) => ({ id: requireNonEmptyString(i.id, "id") }))
  .handler(async ({ data }) => {
    const { db } = await requireCatalogSession("cms.read");
    const { getCatalogResource } = await import("./catalog.server");
    const resource = await getCatalogResource(db, data.id);
    if (!resource) throw new Error("Catalog item not found.");
    return { resource };
  });

export const listAdminCatalogDefs = createServerFn({ method: "GET" })
  .validator((i: Record<string, unknown>) => {
    const rawKind: unknown = i["kind"];
    if (rawKind !== "ability" && rawKind !== "perk") throw new Error("Invalid definition kind.");
    // Narrowed by the guard above; the explicit annotation preserves the
    // literal union. Optional fields use conditional spreads (not
    // stripUndefined, whose Partial<T> return reintroduces `| undefined`
    // and violates exactOptionalPropertyTypes) so absent keys stay absent.
    const kind: "ability" | "perk" = rawKind;
    const search = asOptionalString(i["search"]);
    const slot = asOptionalString(i["slot"]);
    const limit = asOptionalNumber(i["limit"]);
    const offset = asOptionalNumber(i["offset"]);
    return {
      kind,
      ...(search !== undefined ? { search } : {}),
      ...(slot !== undefined ? { slot } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
    };
  })
  .handler(async ({ data }) => {
    const { db } = await requireCatalogSession("cms.read");
    const { listCatalogDefs } = await import("./catalog.server");
    return listCatalogDefs(db, data);
  });

// ---------------------------------------------------------------------------
// Resource mutations (cms.write)
// ---------------------------------------------------------------------------

export const createAdminCatalogResource = createServerFn({ method: "POST" })
  .validator(
    (i: {
      resourceKey: string;
      displayName: string;
      category?: string;
      iconAssetId?: string | null;
      sortOrder?: number;
      upstreamRef?: string | null;
    }) =>
      stripUndefined({
        resourceKey: requireNonEmptyString(i.resourceKey, "resourceKey"),
        displayName: requireNonEmptyString(i.displayName, "displayName"),
        category: asOptionalString(i.category),
        iconAssetId: asOptionalStringOrNull(i.iconAssetId),
        sortOrder: asOptionalNumber(i.sortOrder),
        upstreamRef: asOptionalStringOrNull(i.upstreamRef),
      }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { createCatalogResource } = await import("./catalog.server");
    return createCatalogResource(
      db,
      data as Parameters<typeof createCatalogResource>[1],
      actorOf(session),
    );
  });

export const updateAdminCatalogResource = createServerFn({ method: "POST" })
  .validator(
    (i: {
      id: string;
      editorialName?: string | null;
      category?: string;
      status?: string;
      iconAssetId?: string | null;
      sortOrder?: number;
    }) =>
      stripUndefined({
        id: requireNonEmptyString(i.id, "id"),
        editorialName: asOptionalStringOrNull(i.editorialName),
        category: asOptionalString(i.category),
        status: asOptionalString(i.status),
        iconAssetId: asOptionalStringOrNull(i.iconAssetId),
        sortOrder: asOptionalNumber(i.sortOrder),
      }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { updateCatalogResource } = await import("./catalog.server");
    return updateCatalogResource(
      db,
      data as Parameters<typeof updateCatalogResource>[1],
      actorOf(session),
    );
  });

export const setAdminResourceTranslation = createServerFn({ method: "POST" })
  .validator((i: { resourceId: string; locale: string; name?: string; description?: string }) => ({
    resourceId: requireNonEmptyString(i.resourceId, "resourceId"),
    locale: requireNonEmptyString(i.locale, "locale"),
    name: asOptionalString(i.name),
    description: asOptionalString(i.description),
  }))
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { setResourceTranslation } = await import("./catalog.server");
    await setResourceTranslation(db, data, actorOf(session));
    return { ok: true as const };
  });

export const deleteAdminCatalogResource = createServerFn({ method: "POST" })
  .validator((i: { id: string }) => ({ id: requireNonEmptyString(i.id, "id") }))
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { deleteCatalogResource } = await import("./catalog.server");
    await deleteCatalogResource(db, data, actorOf(session));
    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Definition overrides (cms.write)
// ---------------------------------------------------------------------------

export const updateAdminAbilityDef = createServerFn({ method: "POST" })
  .validator((i: { id: string; editorialName?: string | null; iconAssetId?: string | null }) => {
    const id = requireNonEmptyString(i.id, "id");
    // requireNonEmptyString throws on empty input, so id is a valid string
    // here; it is spread back in because stripUndefined returns Partial<T>.
    return {
      id,
      ...stripUndefined({
        editorialName: asOptionalStringOrNull(i.editorialName),
        iconAssetId: asOptionalStringOrNull(i.iconAssetId),
      }),
    };
  })
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { updateAbilityDef } = await import("./catalog.server");
    return updateAbilityDef(db, data, actorOf(session));
  });

export const updateAdminPerkDef = createServerFn({ method: "POST" })
  .validator((i: { id: string; editorialName?: string | null; iconAssetId?: string | null }) => {
    const id = requireNonEmptyString(i.id, "id");
    // requireNonEmptyString throws on empty input, so id is a valid string
    // here; it is spread back in because stripUndefined returns Partial<T>.
    return {
      id,
      ...stripUndefined({
        editorialName: asOptionalStringOrNull(i.editorialName),
        iconAssetId: asOptionalStringOrNull(i.iconAssetId),
      }),
    };
  })
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { updatePerkDef } = await import("./catalog.server");
    return updatePerkDef(db, data, actorOf(session));
  });

export const setAdminAbilityDefTranslation = createServerFn({ method: "POST" })
  .validator((i: { defId: string; locale: string; editorialName?: string | null }) => ({
    defId: requireNonEmptyString(i.defId, "defId"),
    locale: requireNonEmptyString(i.locale, "locale"),
    editorialName: asOptionalStringOrNull(i.editorialName),
  }))
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { setAbilityDefTranslation } = await import("./catalog.server");
    await setAbilityDefTranslation(
      db,
      { defId: data.defId, locale: data.locale, editorialName: data.editorialName ?? undefined },
      actorOf(session),
    );
    return { ok: true as const };
  });

export const setAdminPerkDefTranslation = createServerFn({ method: "POST" })
  .validator(
    (i: {
      defId: string;
      locale: string;
      editorialName?: string | null;
      editorialDescription?: string | null;
    }) => ({
      defId: requireNonEmptyString(i.defId, "defId"),
      locale: requireNonEmptyString(i.locale, "locale"),
      editorialName: asOptionalStringOrNull(i.editorialName),
      editorialDescription: asOptionalStringOrNull(i.editorialDescription),
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { setPerkDefTranslation } = await import("./catalog.server");
    await setPerkDefTranslation(
      db,
      {
        defId: data.defId,
        locale: data.locale,
        editorialName: data.editorialName ?? undefined,
        editorialDescription: data.editorialDescription ?? undefined,
      },
      actorOf(session),
    );
    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Hero evolution overrides (cms.write)
// ---------------------------------------------------------------------------

export const getAdminHeroEvolution = createServerFn({ method: "GET" })
  .validator((i: { contentId: string }) => ({ contentId: requireContentId(i.contentId) }))
  .handler(async ({ data }) => {
    const { db } = await requireCatalogSession("cms.read");
    const { getHeroEvolutionForEdit } = await import("./catalog.server");
    return getHeroEvolutionForEdit(db, data.contentId);
  });

export const setAdminProgressionOverride = createServerFn({ method: "POST" })
  .validator(
    (i: {
      id: string;
      editorialPowerMin?: number | null;
      editorialPowerMax?: number | null;
      editorialLevelMin?: number | null;
      editorialLevelMax?: number | null;
      excluded?: boolean;
    }) => {
      const out = stripUndefined({
        id: requireNonEmptyString(i.id, "id"),
        editorialPowerMin: asOptionalNumber(i.editorialPowerMin),
        editorialPowerMax: asOptionalNumber(i.editorialPowerMax),
        editorialLevelMin: asOptionalNumber(i.editorialLevelMin),
        editorialLevelMax: asOptionalNumber(i.editorialLevelMax),
      }) as Record<string, unknown>;
      if (i.editorialPowerMin === null) out["editorialPowerMin"] = null;
      if (i.editorialPowerMax === null) out["editorialPowerMax"] = null;
      if (i.editorialLevelMin === null) out["editorialLevelMin"] = null;
      if (i.editorialLevelMax === null) out["editorialLevelMax"] = null;
      if (i.excluded !== undefined) {
        if (typeof i.excluded !== "boolean") throw new Error("Invalid input: expected boolean.");
        out["excluded"] = i.excluded;
      }
      return out as Parameters<typeof import("./catalog.server").setProgressionOverride>[1] & {
        id: string;
      };
    },
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { setProgressionOverride } = await import("./catalog.server");
    return setProgressionOverride(db, data, actorOf(session));
  });

export const setAdminCostOverride = createServerFn({ method: "POST" })
  .validator((i: { id: string; editorialAmount?: number | null; excluded?: boolean }) => {
    const out = stripUndefined({
      id: requireNonEmptyString(i.id, "id"),
      editorialAmount: asOptionalNumber(i.editorialAmount),
    }) as Record<string, unknown>;
    if (i.editorialAmount === null) out["editorialAmount"] = null;
    if (i.excluded !== undefined) {
      if (typeof i.excluded !== "boolean") throw new Error("Invalid input: expected boolean.");
      out["excluded"] = i.excluded;
    }
    return out as Parameters<typeof import("./catalog.server").setCostOverride>[1] & { id: string };
  })
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { setCostOverride } = await import("./catalog.server");
    return setCostOverride(db, data, actorOf(session));
  });

export const addAdminCostRow = createServerFn({ method: "POST" })
  .validator(
    (i: {
      heroContentId: string;
      rarity: string;
      scope: string;
      tier: number;
      kind: string;
      resourceId: string;
      amount: number;
    }) => ({
      heroContentId: requireContentId(i.heroContentId),
      rarity: requireNonEmptyString(i.rarity, "rarity"),
      scope: requireNonEmptyString(i.scope, "scope"),
      tier: asOptionalNumber(i.tier) ?? 0,
      kind: requireNonEmptyString(i.kind, "kind"),
      resourceId: requireNonEmptyString(i.resourceId, "resourceId"),
      amount: asOptionalNumber(i.amount) ?? 0,
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { addCostRow } = await import("./catalog.server");
    return addCostRow(db, data, actorOf(session));
  });

export const deleteAdminCostRow = createServerFn({ method: "POST" })
  .validator((i: { id: string }) => ({ id: requireNonEmptyString(i.id, "id") }))
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { deleteCostRow } = await import("./catalog.server");
    await deleteCostRow(db, data, actorOf(session));
    return { ok: true as const };
  });

export const addAdminProgressionTier = createServerFn({ method: "POST" })
  .validator(
    (i: {
      heroContentId: string;
      rarity: string;
      tier: number;
      powerMin?: number | null;
      powerMax?: number | null;
      levelMin?: number | null;
      levelMax?: number | null;
    }) => {
      const out = stripUndefined({
        heroContentId: requireContentId(i.heroContentId),
        rarity: requireNonEmptyString(i.rarity, "rarity"),
        tier: asOptionalNumber(i.tier) ?? 0,
        powerMin: asOptionalNumber(i.powerMin),
        powerMax: asOptionalNumber(i.powerMax),
        levelMin: asOptionalNumber(i.levelMin),
        levelMax: asOptionalNumber(i.levelMax),
      }) as Record<string, unknown>;
      if (i.powerMin === null) out["powerMin"] = null;
      if (i.powerMax === null) out["powerMax"] = null;
      if (i.levelMin === null) out["levelMin"] = null;
      if (i.levelMax === null) out["levelMax"] = null;
      return out as Parameters<typeof import("./catalog.server").addProgressionTier>[1];
    },
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { addProgressionTier } = await import("./catalog.server");
    return addProgressionTier(db, data, actorOf(session));
  });

export const deleteAdminProgressionTier = createServerFn({ method: "POST" })
  .validator((i: { id: string }) => ({ id: requireNonEmptyString(i.id, "id") }))
  .handler(async ({ data }) => {
    const { db, session } = await requireCatalogSession("cms.write", true);
    const { deleteProgressionTier } = await import("./catalog.server");
    await deleteProgressionTier(db, data, actorOf(session));
    return { ok: true as const };
  });
