import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
import { categoryLabel, powerRangeLabelText } from "@/lib/cms/hero-labels";
import { rarityToken } from "@/lib/cms/rarity-tokens";
import type { PublicHeroItem } from "@/lib/cms/public.loader";
import type { HubHeroRow } from "@/lib/cms/public-hubs.loader";
import type {
  PublicHeroPerk,
  PublicHeroAbility,
  PublicHeroProgression,
} from "@/lib/cms/hero-reference";
import { cn } from "@/lib/utils";
import { EntityCard, EntityCardBody } from "@/components/content/EntityCard";
import { HeroAbilityStrip, HeroPerkModule } from "@/components/heroes/HeroCardBits";
import { RarityPill } from "@/components/heroes/HeroReferenceBits";

export function heroDetailHref(locale: string, slug: string): string {
  return locale === "en" ? `/heroes/${slug}` : `/${locale}/heroes/${slug}`;
}
export function loadoutDetailHref(locale: string, slug: string): string {
  return locale === "en" ? `/loadouts/${slug}` : `/${locale}/loadouts/${slug}`;
}

/**
 * Per-hero reference data attached by the listing loader.
 *
 * Kept separate from the DTO so the card stays usable with either the legacy
 * shape (no reference block) or the Phase 23 shape.
 */
export interface HeroCardReference {
  perks: PublicHeroPerk[];
  abilities: PublicHeroAbility[];
  progression: PublicHeroProgression | null;
  maxPower?: number | null;
}

export interface HeroCardData extends PublicHeroItem {
  rarity?: string | null;
  summary?: string | null;
  reference?: HeroCardReference | undefined;
}

/**
 * Hero card — a character-profile tile for the public directory.
 *
 * The card answers three questions in order, and stops there:
 *   1. Who is it?      artwork → name → class/category → rarity
 *   2. What does it do? Standard Perk module → ability strip
 *   3. How far does it go? one power line
 *
 * Everything else a hero row carries — commander perk, tier count, the
 * evolution and max-level material costs — is deliberately NOT here. Those are
 * progression-research facts and they belong on the hero detail page and in
 * Quick View, where a reader has opted into studying a specific hero. Keeping
 * them off the tile is what lets the artwork and the Standard Perk read at a
 * glance. No data was removed: the loader still attaches the full reference
 * block, and `HeroPreviewDialog` / `HeroDetail` still render the costs.
 *
 * Progression data is only read for the single power line, so a hero with no
 * progression rows simply loses that line rather than gaining an empty block.
 */
export function HeroCard({
  hero,
  locale,
  onPreview,
  priority = false,
  dense = false,
}: {
  hero: HeroCardData;
  locale: string;
  onPreview?: (hero: HeroCardData) => void;
  priority?: boolean;
  /** Shorter artwork crop for denser grids (Reference-adjacent layouts). */
  dense?: boolean;
}) {
  const s = getPublicStrings(locale);
  const rarity = hero.rarity ?? null;
  const token = rarityToken(rarity);
  const ref = hero.reference;
  const standard = ref?.perks.find((p) => p.slot === "standard") ?? null;
  const abilities = ref?.abilities ?? [];
  const href = heroDetailHref(locale, hero.slug);
  // One power figure, never two: the progression block's own max wins, and the
  // pre-computed column value is the fallback for heroes without tier rows.
  const maxPower = ref?.progression?.maxPower ?? ref?.maxPower ?? null;
  const category = categoryLabel(locale, hero.category);
  const powerLine = maxPower === null ? null : powerRangeLabelText(locale, maxPower, maxPower);

  return (
    <EntityCard
      rarity={rarity}
      testId="hero-card"
      accent="none"
      className="h-full transition-[transform,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none"
    >
      {/* Artwork is the primary visual element. `object-top` keeps a bust
          render from being cropped through the face. The 4:5 ratio is capped at
          20rem so a card that goes wide (the global sidebar can leave a single
          ~29rem column at tablet widths) crops the sides instead of growing a
          half-metre-tall portrait that would unbalance the whole tile. */}
      <div className="relative w-full shrink-0">
        {hero.imageUrl ? (
          <img
            src={hero.imageUrl}
            alt={hero.title}
            className={cn(
              "w-full bg-background/50 object-cover object-top",
              dense ? "aspect-[5/4]" : "aspect-[4/5]",
              "max-h-80",
            )}
            loading={priority ? ("eager" as const) : ("lazy" as const)}
            {...(priority ? { fetchPriority: "high" as const } : {})}
            decoding="async"
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              "grid w-full place-items-center bg-muted/30 text-muted-foreground/40",
              dense ? "aspect-[5/4]" : "aspect-[4/5]",
              "max-h-80",
            )}
          >
            <Shield className="h-9 w-9" />
          </div>
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent"
        />
        {/* Rarity accent, drawn where the artwork meets the body rather than
            above the image, where a bar would read as a loading strip. */}
        {token ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
            style={{ backgroundColor: token.accent }}
          />
        ) : null}
      </div>

      <EntityCardBody className="gap-3.5 p-4">
        {/* Identity. The title is a real anchor whose ::after overlay covers
            the card, so there is exactly ONE stretched hit area per card; the
            ability icons and Quick View re-assert their own stacking above it. */}
        <div className="flex flex-col gap-1.5">
          <h3 className="font-display text-lg font-bold leading-tight tracking-tight">
            <Link
              to={href}
              className="rounded outline-none transition-colors after:absolute after:inset-0 after:z-0 after:content-[''] hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              {hero.title}
            </Link>
          </h3>
          <p className="text-[13px] leading-snug text-muted-foreground">
            <span className="font-medium text-foreground/90">
              {heroClassLabel(locale, hero.heroClass)}
            </span>
            {category ? <span> · {category}</span> : null}
          </p>
          {rarity ? <RarityPill locale={locale} rarity={rarity} className="w-fit" /> : null}
        </div>

        {standard ? <HeroPerkModule locale={locale} perk={standard} /> : null}

        {abilities.length > 0 ? (
          <HeroAbilityStrip
            locale={locale}
            hintText={s.abilityHint}
            href={href}
            abilities={abilities}
          />
        ) : null}

        {/* Single secondary metadata line; evolution and material costs live
            on the hero page and in Quick View. */}
        {powerLine ? (
          <p className="text-xs tabular-nums text-muted-foreground">{powerLine}</p>
        ) : null}

        {onPreview ? (
          <button
            type="button"
            onClick={() => onPreview(hero)}
            aria-haspopup="dialog"
            className="relative z-10 mt-1 inline-flex h-8 w-fit items-center rounded-md border border-panel-border/80 px-2.5 text-[11px] font-semibold text-muted-foreground outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {s.openPreview}
          </button>
        ) : null}
      </EntityCardBody>
    </EntityCard>
  );
}

/**
 * Map a hub row to a card, attaching the page's pre-joined reference blocks.
 * The listing loader already resolved these for the whole page, so this is a
 * pure projection with no extra queries.
 */
export function heroRowToItem(r: HubHeroRow): HeroCardData {
  return {
    contentId: r.content_id,
    slug: r.slug,
    title: r.title,
    description: r.body ?? "",
    heroClass: r.hero_class,
    category: r.category,
    rarity: r.rarity,
    popularity: r.popularity,
    sortOrder: r.sort_order,
    imageUrl: r.delivery_url,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    translationStatus: r.translation_status,
    summary: r.summary ?? null,
    reference: r.reference,
  };
}

export { heroClassLabel };
