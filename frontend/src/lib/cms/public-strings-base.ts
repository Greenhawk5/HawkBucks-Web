/**
 * Public content-hub UI strings (Heroes / Schematics / Loadouts / Guides).
 * Holds the English source + interface so locale modules can extend
 * without a circular import.
 *
 * COPY POLICY: these strings are read by players, never by maintainers.
 * Nothing here may mention the CMS, the database, publishing, or any other
 * implementation detail — the pages must read as a game-content destination.
 */
export interface PublicStrings {
  heroesTitle: string;
  heroesIntro: string;
  loadoutsTitle: string;
  loadoutsIntro: string;
  schematicsTitle: string;
  schematicsIntro: string;
  guidesTitle: string;
  guidesIntro: string;
  typeLabel: string;
  typeAll: string;
  typeWeapon: string;
  typeTrap: string;
  perksLabel: string;
  perkSlotLabel: string;
  backToSchematics: string;
  weaponLabel: string;
  trapLabel: string;
  subtypeLabel: string;
  placementLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  classLabel: string;
  classAll: string;
  sortLabel: string;
  sortEditorial: string;
  sortPopularity: string;
  sortName: string;
  sortRecent: string;
  rarityLabel: string;
  /** Public hub rarity facet labels (Legendary / Mythic only). */
  rarityLegendary: string;
  rarityMythic: string;
  filtersLabel: string;
  clearFilters: string;
  resultHeroes: string;
  resultSchematics: string;
  resultLoadouts: string;
  resultGuides: string;
  emptyHeroesTitle: string;
  emptyHeroesDesc: string;
  emptySchematicsTitle: string;
  emptySchematicsDesc: string;
  emptyLoadoutsTitle: string;
  emptyLoadoutsDesc: string;
  emptyGuidesTitle: string;
  emptyGuidesDesc: string;
  featuredGuide: string;
  latestGuides: string;
  readGuide: string;
  topicsLabel: string;
  topicAll: string;
  loading: string;
  loadError: string;
  retry: string;
  viewDetails: string;
  openPreview: string;
  close: string;
  commander: string;
  supportTeam: string;
  supportSlot: string;
  emptySlot: string;
  abilities: string;
  relatedLoadouts: string;
  backToHeroes: string;
  backToLoadouts: string;
  categoryLabel: string;
  classNameLabel: string;
}

export const en: PublicStrings = {
  heroesTitle: "Heroes",
  heroesIntro: "Explore Save the World Heroes, their classes, rarities, abilities, and perks.",
  loadoutsTitle: "Loadouts",
  loadoutsIntro:
    "Explore curated Hero loadouts built around Commanders, Support Heroes, Team Perks, and recommended gear.",
  schematicsTitle: "Schematics",
  schematicsIntro:
    "Browse weapons and traps, compare their types and perks, and find the gear that fits your loadout.",
  guidesTitle: "Guides",
  guidesIntro: "Guides, comparisons, builds, and practical tips for Save the World.",
  typeLabel: "Type",
  typeAll: "All",
  typeWeapon: "Weapons",
  typeTrap: "Traps",
  perksLabel: "Perks",
  perkSlotLabel: "Slot",
  backToSchematics: "Back to Schematics",
  weaponLabel: "Weapon",
  trapLabel: "Trap",
  subtypeLabel: "Subtype",
  placementLabel: "Placement",
  searchLabel: "Search",
  searchPlaceholder: "Search by name…",
  classLabel: "Class",
  classAll: "All",
  sortLabel: "Sort",
  sortEditorial: "Featured",
  sortPopularity: "Popularity",
  sortName: "Name",
  sortRecent: "Recently updated",
  rarityLabel: "Rarity",
  rarityLegendary: "Legendary",
  rarityMythic: "Mythic",
  filtersLabel: "Filters",
  clearFilters: "Clear filters",
  resultHeroes: "{count} Heroes",
  resultSchematics: "{count} Schematics",
  resultLoadouts: "{count} Loadouts",
  resultGuides: "{count} Guides",
  emptyHeroesTitle: "No Heroes found",
  emptyHeroesDesc: "Try another name, class, or rarity.",
  emptySchematicsTitle: "No Schematics found",
  emptySchematicsDesc: "Try another search or adjust your filters.",
  emptyLoadoutsTitle: "No Loadouts found",
  emptyLoadoutsDesc: "Try another search or clear your filters.",
  emptyGuidesTitle: "No Guides found",
  emptyGuidesDesc: "Try another search or browse another topic.",
  featuredGuide: "Featured guide",
  latestGuides: "Latest guides",
  readGuide: "Read guide",
  topicsLabel: "Topics",
  topicAll: "All topics",
  loading: "Loading…",
  loadError: "Could not load content. Please try again.",
  retry: "Retry",
  viewDetails: "View details",
  openPreview: "Quick view",
  close: "Close",
  commander: "Commander",
  supportTeam: "Support Team",
  supportSlot: "Support Slot",
  emptySlot: "Empty slot",
  abilities: "Abilities",
  relatedLoadouts: "Related loadouts",
  backToHeroes: "Back to Heroes",
  backToLoadouts: "Back to Loadouts",
  categoryLabel: "Category",
  classNameLabel: "Class",
};

/**
 * `{placeholder}` interpolation for public strings, matching the i18n core's
 * contract so a count renders identically whether it comes from the shell
 * dictionary or a content-hub string. Unknown placeholders stay intact.
 */
export function applyPublicParams(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (slot, name: string) => {
    const value = params[name];
    return value === undefined ? slot : String(value);
  });
}
