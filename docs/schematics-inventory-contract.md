# HawkBucks Schematics / Inventory — Phase 14 Data Contract

> Foundation only (no public Inventory UI). Phase 15 consumes these published
> public readers; no schema redesign should be required.

## Entities

| Entity | `cms_contents.entity_type` | Canonical table (PK `content_id`) | Names/text |
|---|---|---|---|
| Weapon | `weapon` | `weapon_records` | `cms_content_translations` (Phase 11) |
| Trap | `trap` | `trap_records` | `cms_content_translations` |
| Schematic | `schematic` | `schematic_records` | `cms_content_translations` |
| Perk | `perk` | `perk_records` | `cms_content_translations` + `perk_translations` (effect text, mirrors hero abilities) |

Names/descriptions shown in Phase 15 come from `cms_content_translations`
(title/body). `perk_translations(name, description)` is the fallback effect
text when a perk has no content translation in the requested locale — exact
locale first, then first-available, never fabricated (same fallback honesty
as Phase 11 `resolveContentTranslation`).

## Subtypes (HawkBucks EDITORIAL, not official Epic taxonomy)

- `weapon_records.weapon_subtype`: `assault | smg | pistol | shotgun |
  sniper | melee | explosive | other`
- `trap_records.trap_subtype`: `damage | healer | utility | other`
- `perk_records.perk_type`: `offense | defense | utility | team | other`
- `perk_records.perk_key`: stable machine id (`/^[a-z0-9][a-z0-9_-]{0,63}$/`).

Machine values are stable; human labels stay in translations. Do not add new
values without a migration + public-reader update.

## Schematic relationship

- A schematic references **exactly one** weapon OR one trap
  (`schematic_records.weapon_content_id` XOR `trap_content_id`; CHECK +
  application validation + type-correct asserts).
- One schematic per weapon/trap (`UNIQUE(weapon_content_id)`,
  `UNIQUE(trap_content_id)`); re-target via `retargetSchematicRecord`.
- `kind` is derived (`weapon_content_id IS NOT NULL ? "weapon" : "trap"`).

## Perk slots / ordering

- `schematic_perks(schematic_content_id, perk_content_id, slot_order)`.
- `slot_order` 0–31, stable ascending; gaps allowed; no duplicate perk and
  no duplicate slot per schematic (`UNIQUE` pairs); max 12 perks.
- `setSchematicPerks` replaces the full set (delete + ordered insert).
- Public detail returns perks ordered by `slot_order`, skipping unpublished
  perks (no leak). Zero perks is valid.

## Translations

- Phase 11 architecture reused: `cms_content_translations` + `cms_slugs`
  scoped by `(entity_type, locale)` for weapons/traps/schematics/perks.
- `perk_translations` keyed `UNIQUE(perk_content_id, locale)`.
- 9 locales: `en es fr ru de pt zh ar-SA fa-IR`; exact-locale preferred;
  `translation_status` semantics unchanged; only `complete` feeds hreflang.
- No fabricated translations anywhere.

## Publishing

- Lifecycle lives ONLY in `cms_contents.status` (`draft | published |
  archived`); entity tables carry no status.
- Public readers join `cms_contents` and require `status='published'` on the
  parent AND every related entity (weapon/trap/perks/schematic members).
- Drafts/archived/unpublished relations are invisible (filtered in SQL +
  re-checked in code).

## Public reader contract (server-only)

- `src/lib/cms/schematics-inventory.server.ts`: `getPublishedWeaponBySlug`,
  `listPublishedWeapons`, `getPublishedTrapBySlug`, `listPublishedTraps`,
  `getPublishedSchematicBySlug/Detail`, `listPublishedSchematics`,
  `listPublishedPerks`, `getPublishedPerkBySlug`. Bounded (≤100), deterministic
  ordering (`sort_order ASC, popularity DESC`; perks by `slot_order ASC`).
- `src/lib/cms/public-inventory.loader.ts`: safe list shapes
  (`contentId/slug/title/description/subtype/popularity/sortOrder/imageUrl/
  translationStatus`, schematics add `kind/weaponContentId/trapContentId/
  perkCount`, perks expose `perkKey/perkType/name/description/imageUrl`).
- `src/lib/cms/public-schematic-detail.loader.ts`: `getPublicSchematic`
  detail with kind-specific weapon/trap block, ordered perks,
  `completeLocales/slugsByLocale` for hreflang.
- Only `delivery_url` crosses the boundary — never provider ids, secrets,
  sessions, audit, preview hashes. All user input bound via `?` placeholders.

## CMS CRUD

- `src/lib/cms/schematics-admin.loader.ts`: list/create/update for all four
  entities + `upsertAdminPerkTranslation`, `setAdminSchematicPerks`,
  `publishAdminInventoryContent`. Capabilities: `cms.read` (list),
  `cms.write` (mutate), `cms.publish` (publish). Writes validate references,
  type-correctness, dedupe, slot bounds, subtypes, translation integrity,
  media usability (`assertMediaUnreferenced` covers the four icon columns).

## Media

- Reuses Phase 11 `media_assets` (`icon_asset_id → SET NULL`); public
  readers expose only `delivery_url`.

## Limitations / deferred

- No public Inventory UI/routes/sitemap (Phase 15). No full-text search
  index (Phase 15 filters client-side on bounded lists). No rarity/power
  columns (no domain evidence). Perk `slot_order > 31` and `> 12` perks are
  rejected rather than paged.
