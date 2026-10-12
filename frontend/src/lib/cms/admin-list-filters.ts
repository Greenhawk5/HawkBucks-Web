/**
 * Per-entity list filters shared by admin list pages AND bulk selection.
 *
 * Why one module instead of per-route SQL
 * --------------------------------------
 * A cross-page "select everything matching" has to resolve its id set with the
 * SAME filter the editor can see, otherwise the selection would silently
 * include or exclude records the UI never showed. Both callers therefore build
 * their WHERE from the same table spec here.
 *
 * The client sends the FILTER (q / status / heroClass), never the id list, so a
 * crafted request cannot select records outside the visible result set; the id
 * set is always recomputed server-side.
 *
 * IMPORTANT SCHEMA FACT: `cms_contents` names its primary key `id`, while the
 * per-entity record tables name theirs `content_id`. Every spec therefore
 * declares `idExpr` explicitly rather than assuming one spelling.
 */

import { buildAdminListWhere } from "./admin-list";

export interface EntityListSpec {
  /** Entity type string as stored in `cms_contents.entity_type`. */
  entityType: string;
  /** FROM clause with joins. Must expose `c.status` and `idExpr`. */
  from: string;
  /** Deterministic ORDER BY ending in the unique id, so pages never overlap. */
  orderBy: string;
  /** Column list for the page SELECT. Must include `content_id` and `status`. */
  columns: string;
  /** Alias owning `idExpr`; the translation EXISTS subquery correlates on it. */
  idAlias: string;
  /** SQL expression for the content id. */
  idExpr: string;
  /** Optional extra equality clause, e.g. the hero class filter. */
  extraEquality?:
    | ((filter: {
        heroClass?: string;
        loadoutType?: string;
      }) => { clause: string; value: string } | null)
    | undefined;
}

const HERO_CLASSES = new Set(["soldier", "constructor", "ninja", "outlander"]);

/** Closed gameplay-type vocabulary shared by loadouts. Mirrors the create dialog. */
const LOADOUT_TYPES = new Set(["beginner", "meta", "farming", "boss", "fun", "custom"]);

/**
 * Inventory kinds share one table-per-kind shape.
 *
 * `kind` comes from a closed union here, so the interpolated table name can
 * never carry user input.
 */
export type InventoryKind = "weapon" | "trap" | "perk" | "schematic";

function inventorySpec(kind: InventoryKind): EntityListSpec {
  const table =
    kind === "weapon"
      ? "weapon_records"
      : kind === "trap"
        ? "trap_records"
        : kind === "perk"
          ? "perk_records"
          : "schematic_records";
  // `subtype` names differ per kind (`weapon_subtype`, `trap_subtype`,
  // `perk_type`) and `schematic_records` has NO subtype column at all, so they
  // are selected explicitly and aliased — never interpolated from a free string.
  // A `NULL AS subtype` keeps the row shape identical across all four kinds.
  const subtypeExpr =
    kind === "weapon"
      ? "r.weapon_subtype"
      : kind === "trap"
        ? "r.trap_subtype"
        : kind === "perk"
          ? "r.perk_type"
          : "NULL";
  return {
    entityType: kind,
    from: `${table} r JOIN cms_contents c ON c.id = r.content_id`,
    orderBy: "c.updated_at DESC, r.sort_order ASC, r.content_id ASC",
    idAlias: "r",
    idExpr: "r.content_id",
    columns: `r.content_id AS content_id, c.status AS status, r.popularity AS popularity,
       r.sort_order AS sort_order, ${subtypeExpr} AS subtype,
       c.default_locale AS default_locale, c.updated_at AS updated_at, c.entity_type AS entity_type`,
  };
}

const SPECS: Record<string, EntityListSpec> = {
  hero: {
    entityType: "hero",
    from: "hero_records h JOIN cms_contents c ON c.id = h.content_id",
    orderBy: "c.updated_at DESC, h.sort_order ASC, h.content_id ASC",
    idAlias: "h",
    idExpr: "h.content_id",
    columns: `h.content_id AS content_id, c.status AS status, h.hero_class AS hero_class,
       h.category AS category, h.rarity AS rarity, h.popularity AS popularity,
       h.sort_order AS sort_order, c.default_locale AS default_locale, c.updated_at AS updated_at`,
    extraEquality: (filter) =>
      filter.heroClass !== undefined && filter.heroClass !== ""
        ? { clause: "h.hero_class = ?", value: filter.heroClass }
        : null,
  },
  loadout: {
    entityType: "loadout",
    from: "loadout_records l JOIN cms_contents c ON c.id = l.content_id",
    orderBy: "c.updated_at DESC, l.sort_order ASC, l.content_id ASC",
    idAlias: "l",
    idExpr: "l.content_id",
    columns: `l.content_id AS content_id, c.status AS status, l.loadout_type AS loadout_type,
       l.popularity AS popularity, l.sort_order AS sort_order,
       c.default_locale AS default_locale, c.updated_at AS updated_at, c.entity_type AS entity_type`,
    extraEquality: (filter) =>
      filter.loadoutType !== undefined && filter.loadoutType !== ""
        ? { clause: "l.loadout_type = ?", value: filter.loadoutType }
        : null,
  },
  article: {
    entityType: "article",
    from: "cms_contents c",
    orderBy: "c.updated_at DESC, c.id ASC",
    idAlias: "c",
    idExpr: "c.id",
    columns: `c.id AS content_id, c.status AS status, c.default_locale AS default_locale,
       c.updated_at AS updated_at, c.entity_type AS entity_type`,
  },
  weapon: inventorySpec("weapon"),
  trap: inventorySpec("trap"),
  perk: inventorySpec("perk"),
  schematic: inventorySpec("schematic"),
};

export function isKnownEntityType(value: unknown): value is string {
  return typeof value === "string" && Object.hasOwn(SPECS, value);
}

export function entityListSpec(entityType: string): EntityListSpec {
  const spec = SPECS[entityType];
  if (spec === undefined) throw new Error(`Unsupported entity type: ${entityType}`);
  return spec;
}

export interface ResolvedListFilter {
  from: string;
  where: string;
  values: unknown[];
  orderBy: string;
  columns: string;
}

/**
 * Build the WHERE body for an entity list.
 *
 * Every spec joins through `cms_contents`, so `c.entity_type = ?` is always the
 * first clause. That matters most for `article`, whose FROM is `cms_contents`
 * directly: without it the "articles" tab would list every content type.
 */
export function buildEntityListFilter(
  entityType: string,
  filter: {
    q?: string | undefined;
    status?: string | undefined;
    heroClass?: string | undefined;
    loadoutType?: string | undefined;
  },
): ResolvedListFilter {
  const spec = entityListSpec(entityType);

  const equality: string[] = ["c.entity_type = ?"];
  const equalityValues: unknown[] = [spec.entityType];

  const status = filter.status ?? "";
  if (status === "draft" || status === "published" || status === "archived") {
    equality.push("c.status = ?");
    equalityValues.push(status);
  }

  const extra =
    spec.extraEquality?.({
      heroClass: filter.heroClass ?? "",
      loadoutType: filter.loadoutType ?? "",
    }) ?? null;
  if (extra !== null) {
    // Validate before binding: a bogus value must not reach SQL at all.
    if (extra.clause === "h.hero_class = ?" && !HERO_CLASSES.has(extra.value)) {
      throw new Error("Invalid hero class filter.");
    }
    if (extra.clause === "l.loadout_type = ?" && !LOADOUT_TYPES.has(extra.value)) {
      throw new Error("Invalid loadout type filter.");
    }
    equality.push(extra.clause);
    equalityValues.push(extra.value);
  }

  const fragment = buildAdminListWhere({
    equality,
    equalityValues,
    searchColumns: [spec.idExpr],
    searchCorrelated: { outerAlias: spec.idAlias, columns: ["title", "slug"] },
    search: filter.q ?? "",
  });

  return {
    from: spec.from,
    where: fragment.where,
    values: fragment.values,
    orderBy: spec.orderBy,
    columns: spec.columns,
  };
}

/**
 * Same as `buildEntityListFilter` but WITHOUT the status clause, so status tabs
 * can report what each tab would yield.
 */
export function buildEntityListFilterForFacets(
  entityType: string,
  filter: {
    q?: string | undefined;
    heroClass?: string | undefined;
    loadoutType?: string | undefined;
  },
): ResolvedListFilter {
  return buildEntityListFilter(entityType, {
    q: filter.q ?? "",
    status: "",
    heroClass: filter.heroClass ?? "",
    loadoutType: filter.loadoutType ?? "",
  });
}
