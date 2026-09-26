/**
 * Phase 13 — public Heroes/Loadouts UI string base (no locale imports).
 * Holds the English source + interface so locale modules can extend
 * without a circular import.
 */
export interface PublicStrings {
  heroesTitle: string;
  heroesIntro: string;
  loadoutsTitle: string;
  loadoutsIntro: string;
  inventoryTitle: string;
  inventoryIntro: string;
  typeLabel: string;
  typeAll: string;
  typeWeapon: string;
  typeTrap: string;
  perksLabel: string;
  perkSlotLabel: string;
  backToInventory: string;
  weaponLabel: string;
  trapLabel: string;
  subtypeLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  classLabel: string;
  classAll: string;
  sortLabel: string;
  sortEditorial: string;
  sortPopularity: string;
  sortName: string;
  emptyTitle: string;
  emptyDesc: string;
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
  heroesIntro:
    "Browse every published Hero. Filter by class, search by name, and open any card for full details.",
  loadoutsTitle: "Loadouts",
  loadoutsIntro:
    "Curated Commander + Support teams. Each loadout shows its Commander and five Support slots.",
  inventoryTitle: "Inventory",
  inventoryIntro:
    "Browse every published schematic. Filter by weapons or traps, search by name, and open any card for full details.",
  typeLabel: "Type",
  typeAll: "All",
  typeWeapon: "Weapons",
  typeTrap: "Traps",
  perksLabel: "Perks",
  perkSlotLabel: "Slot",
  backToInventory: "Back to Inventory",
  weaponLabel: "Weapon",
  trapLabel: "Trap",
  subtypeLabel: "Subtype",
  searchLabel: "Search",
  searchPlaceholder: "Search by name…",
  classLabel: "Class",
  classAll: "All",
  sortLabel: "Sort",
  sortEditorial: "Featured",
  sortPopularity: "Popularity",
  sortName: "Name",
  emptyTitle: "No results",
  emptyDesc: "Try a different search or filter.",
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
