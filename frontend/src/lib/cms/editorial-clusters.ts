/**
 * Phase 17 — editorial discovery clusters (PURE LOGIC, client-safe).
 *
 * Static editorial landing structure linking V-Bucks/Missions, Heroes,
 * Loadouts, and Inventory guides to already-published public routes.
 * Cluster listing/detail pages are indexable discovery surfaces; every link
 * below stays internal, concrete (no $placeholders), and localized at
 * render time via articleLocalizePath().
 */

export interface EditorialCluster {
  slug: string;
  title: string;
  description: string;
  links: Array<{ label: string; href: string }>;
}

export const EDITORIAL_CLUSTERS: EditorialCluster[] = [
  {
    slug: "vbucks-missions",
    title: "V-Bucks Missions",
    description: "Track daily V-Bucks alerts and learn how mission rewards work.",
    links: [
      { label: "Live mission tracker", href: "/vbucks-missions" },
      { label: "Missions guide", href: "/missions-guide" },
      { label: "Mission articles", href: "/articles" },
    ],
  },
  {
    slug: "heroes",
    title: "Heroes",
    description: "Browse published heroes and hero guides.",
    links: [
      { label: "Hero index", href: "/heroes" },
      { label: "Hero articles", href: "/articles" },
    ],
  },
  {
    slug: "loadouts",
    title: "Loadouts",
    description: "Commander plus support rosters for every playstyle.",
    links: [
      { label: "Loadout index", href: "/loadouts" },
      { label: "Loadout articles", href: "/articles" },
    ],
  },
  {
    slug: "inventory",
    title: "Inventory",
    description: "Weapons, traps, perks, and schematics.",
    links: [
      { label: "Inventory index", href: "/inventory" },
      { label: "Inventory articles", href: "/articles" },
    ],
  },
];

export function getEditorialCluster(slug: string): EditorialCluster | null {
  return EDITORIAL_CLUSTERS.find((cluster) => cluster.slug === slug) ?? null;
}

export function clusterLandingPath(slug: string): string {
  return `/guides/${slug}`;
}

export function clusterTitleFor(slug: string): string {
  return getEditorialCluster(slug)?.title ?? "Guides";
}

export function clusterDescriptionFor(slug: string): string {
  return getEditorialCluster(slug)?.description ?? "HawkBucks guides.";
}

/**
 * Resolve the topic filter for a cluster. Every cluster maps to exactly one
 * axis (category preferred, tag as fallback). An unmapped cluster returns
 * null so routes fail closed with an empty listing — never an unfiltered
 * dump of every published article.
 */
export function clusterTopicFor(slug: string): {
  categorySlug?: string;
  tagSlug?: string;
} | null {
  if (slug === "vbucks-missions") {
    // V-Bucks is a TAG-axis cluster (canonical tag "vbucks"). There is no
    // vbucks category; fail closed instead of falling back to the
    // unfiltered article index (audit HIGH finding).
    const tagSlug = CLUSTER_TAG_MAP[slug];
    if (typeof tagSlug === "string" && tagSlug !== "") return { tagSlug };
    return null;
  }
  const categorySlug = CLUSTER_CATEGORY_MAP[slug];
  if (typeof categorySlug === "string" && categorySlug !== "") return { categorySlug };
  const tagSlug = CLUSTER_TAG_MAP[slug];
  if (typeof tagSlug === "string" && tagSlug !== "") return { tagSlug };
  return null;
}

/**
 * Pure topic-membership predicate shared by the cluster regression tests.
 * Returns true only when an article's taxonomy satisfies the resolved topic
 * filter: exact category match, or membership in the tag list. Null/empty
 * filters never match (fail closed — an invalid cluster mapping hides all
 * articles rather than showing the unfiltered index).
 */
export function articleMatchesTopic(
  article: { categorySlug?: string | null; tagSlugs?: string[] | undefined },
  topic: { categorySlug?: string; tagSlug?: string } | null,
): boolean {
  if (!topic) return false;
  if (typeof topic.categorySlug === "string" && topic.categorySlug !== "") {
    return article.categorySlug === topic.categorySlug;
  }
  if (typeof topic.tagSlug === "string" && topic.tagSlug !== "") {
    return Array.isArray(article.tagSlugs) && article.tagSlugs.includes(topic.tagSlug);
  }
  return false;
}

export const CLUSTER_CATEGORY_MAP: Record<string, string | undefined> = {
  "vbucks-missions": undefined,
  heroes: "heroes",
  loadouts: "loadouts",
  inventory: "inventory",
};

export const CLUSTER_TAG_MAP: Record<string, string | undefined> = {
  "vbucks-missions": "vbucks",
  heroes: "heroes",
  loadouts: "loadouts",
  inventory: "inventory",
};

/**
 * Localized href for a cluster link. English keeps the bare path; every
 * other locale gets `/<code>` prefix — the Phase 6 canonical URL model, so
 * clusters never break hreflang/canonical behavior.
 */
export function localizeClusterHref(href: string, locale: string): string {
  if (locale === "en") return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}
