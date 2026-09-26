export interface SlotEntry {
  heroContentId: string;
  slotOrder: number;
}
export interface LoadoutSlots {
  commander: string | null;
  support: [string | null, string | null, string | null, string | null, string | null];
}
/** Map slot_order rows to Commander + 5 stable Support slots (gap-preserving). */
export function mapLoadoutSlots(rows: readonly SlotEntry[]): LoadoutSlots {
  const byOrder = new Map<number, string>();
  for (const r of rows) {
    if (typeof r.heroContentId !== "string" || r.heroContentId === "") continue;
    if (!Number.isInteger(r.slotOrder) || r.slotOrder < 0 || r.slotOrder > 5) continue;
    if (!byOrder.has(r.slotOrder)) byOrder.set(r.slotOrder, r.heroContentId);
  }
  // Collapse duplicate hero ids to first occurrence (defense in depth).
  const seen = new Set<string>();
  for (const [order, id] of [...byOrder.entries()].sort((a, b) => a[0] - b[0])) {
    if (seen.has(id)) byOrder.delete(order);
    else seen.add(id);
  }
  const commander = byOrder.get(0) ?? null;
  const support: LoadoutSlots["support"] = [null, null, null, null, null];
  for (let i = 1; i <= 5; i++) support[i - 1] = byOrder.get(i) ?? null;
  return { commander, support };
}
/** Occupied hero count (commander + filled support). Team Perk never counted. */
export function countSlotHeroes(slots: LoadoutSlots): number {
  return (slots.commander ? 1 : 0) + slots.support.filter((s) => s !== null).length;
}

/**
 * Phase 12/13 slot contract — structural slot positions (pure, client-safe).
 *
 * The admin editor text field holds one comma-separated segment per slot:
 * segment 0 = Commander (required, structurally distinct), segments 1..5 =
 * Support 1..5. An empty segment, a blank segment, or the literal token
 * `(empty)` (case-insensitive) all mean "empty slot" and map to `null`
 * WITHOUT collapsing positions. Only TRAILING empties are trimmed (a save
 * of fewer than 6 heroes stays valid); interior empties are preserved.
 *
 * Throws on >6 segments (caller must surface, never silently truncate).
 */
export const LOADOUT_EMPTY_SLOT_TOKEN = "(empty)";
export const MAX_LOADOUT_SLOTS = 6;

export function parseLoadoutSlotInput(raw: unknown): Array<string | null> {
  const text = typeof raw === "string" ? raw : "";
  const segments = text.split(",");
  if (segments.length > MAX_LOADOUT_SLOTS)
    throw new Error(`A loadout holds at most ${MAX_LOADOUT_SLOTS} heroes.`);
  const slots = segments.map((seg) => {
    const t = seg.trim();
    if (t === "" || /^\(empty\)$/i.test(t)) return null;
    return t;
  });
  // Trim trailing empties only: [A,B,null,D,null,F] keeps interior nulls;
  // [A] stays a valid commander-only save.
  let last = -1;
  for (let i = 0; i < slots.length; i += 1) if (slots[i] !== null) last = i;
  if (last < 0) return [];
  return slots.slice(0, last + 1);
}

/**
 * Render stored slot rows back into the editor field. Rows only exist for
 * filled slots, so positions are rebuilt from each row's slotOrder with the
 * `(empty)` token marking gaps — a plain map+join would compact them.
 * Trailing vacancies are omitted (same shape parseLoadoutSlotInput accepts).
 */
export function formatLoadoutSlotInput(
  heroes: ReadonlyArray<{ contentId: string; slotOrder: number }> | null | undefined,
): string {
  if (!heroes || heroes.length === 0) return "";
  const slots: Array<string | null> = [null, null, null, null, null, null];
  for (const h of heroes) {
    if (!Number.isInteger(h.slotOrder) || h.slotOrder < 0 || h.slotOrder > MAX_LOADOUT_SLOTS - 1)
      continue;
    if (typeof h.contentId === "string" && h.contentId !== "") slots[h.slotOrder] = h.contentId;
  }
  let last = -1;
  for (let i = 0; i < slots.length; i += 1) if (slots[i] !== null) last = i;
  if (last < 0) return "";
  return slots
    .slice(0, last + 1)
    .map((s) => (s === null ? LOADOUT_EMPTY_SLOT_TOKEN : s))
    .join(", ");
}
export interface SortableRow {
  sort_order: number;
  popularity: number;
  title: string;
}
export type HeroSort = "editorial" | "popularity" | "name";
export type LoadoutSort = "editorial" | "popularity" | "name";
export function comparePublicHeroes(sort: HeroSort): (a: SortableRow, b: SortableRow) => number {
  if (sort === "popularity")
    return (a, b) =>
      b.popularity - a.popularity || a.sort_order - b.sort_order || a.title.localeCompare(b.title);
  if (sort === "name")
    return (a, b) => a.title.localeCompare(b.title) || a.sort_order - b.sort_order;
  return (a, b) =>
    a.sort_order - b.sort_order || b.popularity - a.popularity || a.title.localeCompare(b.title);
}
export function comparePublicLoadouts(
  sort: LoadoutSort,
): (a: SortableRow, b: SortableRow) => number {
  return comparePublicHeroes(sort);
}
export function toSafeHeadText(value: unknown, maxLength = 300): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
export function heroDetailPath(slug: string): string {
  return `/heroes/${slug}`;
}
export function loadoutDetailPath(slug: string): string {
  return `/loadouts/${slug}`;
}
export function schematicDetailPath(slug: string): string {
  return `/inventory/${slug}`;
}

/** Phase 15 — inventory listing query state (pure logic, SSR/test safe). */
export const INVENTORY_TYPES = ["all", "weapon", "trap"] as const;
export type InventoryTypeFilter = (typeof INVENTORY_TYPES)[number];
export const INVENTORY_SORTS = ["editorial", "popularity", "name"] as const;
export type InventorySort = (typeof INVENTORY_SORTS)[number];

export function isInventoryTypeFilter(v: unknown): v is InventoryTypeFilter {
  return typeof v === "string" && (INVENTORY_TYPES as readonly string[]).includes(v);
}
export function isInventorySort(v: unknown): v is InventorySort {
  return typeof v === "string" && (INVENTORY_SORTS as readonly string[]).includes(v);
}
/** `?type=` fails safe to "all" (unknown values never filter silently). */
export function parseInventoryTypeParam(v: unknown): InventoryTypeFilter {
  return isInventoryTypeFilter(v) ? v : "all";
}
export function parseInventorySortParam(v: unknown): InventorySort {
  return isInventorySort(v) ? v : "editorial";
}
export function compareInventoryItems(
  sort: InventorySort,
): (a: SortableRow, b: SortableRow) => number {
  return comparePublicHeroes(sort);
}
export function buildInventoryJsonLd(input: { url: string; breadcrumbBase: string }): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: input.breadcrumbBase },
      { "@type": "ListItem", position: 2, name: "Inventory", item: input.url },
    ],
  };
}
export function buildSchematicJsonLd(input: {
  name: string;
  description: string;
  url: string;
  image: string | null;
  kind: string;
  perkNames: string[];
  breadcrumbBase: string;
}): unknown {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: input.breadcrumbBase },
      {
        "@type": "ListItem",
        position: 2,
        name: "Inventory",
        item: `${input.breadcrumbBase}inventory`,
      },
      { "@type": "ListItem", position: 3, name: input.name, item: input.url },
    ],
  };
  const entity: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: input.url,
    mainEntity: {
      "@type": "Thing",
      name: input.name,
      description: input.description,
      additionalProperty: { "@type": "PropertyValue", name: "kind", value: input.kind },
    },
  };
  if (input.image) entity["primaryImageOfPage"] = input.image;
  return [itemList, entity];
}
/**
 * Per-entity hreflang alternates with localized slugs. Slugs are namespaced
 * per (entity_type, locale) in cms_slugs, so the es/fr/... alternate must use
 * that locale's slug — never the current locale's slug. Falls back to the
 * current slug when a locale's slug is unknown; drops locales without a
 * complete translation (Phase 11 contract). x-default always targets en.
 */
export function entityHreflangAlternates(input: {
  kind: "hero" | "loadout" | "schematic";
  currentSlug: string;
  completeLocales: readonly string[];
  slugsByLocale?: Readonly<Record<string, string>> | undefined;
  hreflangOf: (locale: string) => string;
  localizePath: (basePath: string, language: string) => string;
  canonicalUrlFor: (pathname: string) => string;
}): Array<{ hreflang: string; href: string }> {
  const baseFor = (locale: string): string => {
    const slug = input.slugsByLocale?.[locale] ?? input.currentSlug;
    if (input.kind === "hero") return heroDetailPath(slug);
    if (input.kind === "loadout") return loadoutDetailPath(slug);
    return schematicDetailPath(slug);
  };
  const out: Array<{ hreflang: string; href: string }> = [];
  for (const locale of input.completeLocales) {
    out.push({
      hreflang: input.hreflangOf(locale),
      href: input.canonicalUrlFor(input.localizePath(baseFor(locale), locale)),
    });
  }
  // Reciprocity guard: en must always be present (loader guarantees the
  // current locale row exists).
  if (!input.completeLocales.includes("en")) {
    out.unshift({
      hreflang: input.hreflangOf("en"),
      href: input.canonicalUrlFor(input.localizePath(baseFor("en"), "en")),
    });
  }
  out.push({ hreflang: "x-default", href: input.canonicalUrlFor(baseFor("en")) });
  return out;
}
export function filterHreflangForTranslations<T extends { hreflang: string; href: string }>(
  alternates: readonly T[],
  completeLocales: readonly string[],
  hreflangOf: (locale: string) => string,
): T[] {
  const allowed = new Set(completeLocales.map(hreflangOf));
  return alternates.filter((a) => a.hreflang === "x-default" || allowed.has(a.hreflang));
}
const HERO_CATEGORIES = ["assault", "support", "recon", "defense", "special"] as const;
const LOADOUT_TYPES = ["beginner", "meta", "farming", "boss", "fun", "custom"] as const;
export function isSupportedCategory(v: unknown): boolean {
  return typeof v === "string" && (HERO_CATEGORIES as readonly string[]).includes(v);
}
export function isSupportedLoadoutType(v: unknown): boolean {
  return typeof v === "string" && (LOADOUT_TYPES as readonly string[]).includes(v);
}
export function buildHeroJsonLd(input: {
  name: string;
  description: string;
  url: string;
  image: string | null;
  heroClass: string;
  breadcrumbBase: string;
}): unknown {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: input.breadcrumbBase },
      { "@type": "ListItem", position: 2, name: "Heroes", item: `${input.breadcrumbBase}heroes` },
      { "@type": "ListItem", position: 3, name: input.name, item: input.url },
    ],
  };
  const entity: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: input.url,
    mainEntity: {
      "@type": "Thing",
      name: input.name,
      description: input.description,
      additionalProperty: { "@type": "PropertyValue", name: "heroClass", value: input.heroClass },
    },
  };
  if (input.image) entity["primaryImageOfPage"] = input.image;
  return [itemList, entity];
}
export function buildLoadoutJsonLd(input: {
  name: string;
  description: string;
  url: string;
  image: string | null;
  heroNames: string[];
  breadcrumbBase: string;
}): unknown {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: input.breadcrumbBase },
      {
        "@type": "ListItem",
        position: 2,
        name: "Loadouts",
        item: `${input.breadcrumbBase}loadouts`,
      },
      { "@type": "ListItem", position: 3, name: input.name, item: input.url },
    ],
  };
  const entity: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: input.url,
    mainEntity: {
      "@type": "ItemList",
      name: input.name,
      description: input.description,
      numberOfItems: input.heroNames.length,
      itemListElement: input.heroNames.map((n, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: n,
      })),
    },
  };
  if (input.image) entity["primaryImageOfPage"] = input.image;
  return [itemList, entity];
}
