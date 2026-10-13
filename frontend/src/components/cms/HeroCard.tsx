import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
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
import { HeroAbilityStrip, HeroPerkRow } from "@/components/heroes/HeroCardBits";
import { MediaIcon, RarityPill } from "@/components/heroes/HeroReferenceBits";

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
  /**
   * Registered class glyph for `heroClass`, resolved once per listing page by
   * the loader. NULL/absent means no icon is registered — the card then renders
   * the class name alone rather than a placeholder box.
   */
  classIconUrl?: string | null;
}

/**
 * Hero card — a character-profile tile for the public directory.
 *
 * The card answers three questions in order, and stops there:
 *   1. Who is it?   artwork → name → class → rarity
 *   2. What is it?  Standard Perk icon + name, then the ability icons
 *   3. Let me see?  Quick View, for the hero detail page
 *
 * Deliberately NOT on the tile, because a listing is for scanning and none of
 * these survive being read at card size:
 *   * the Standard Perk's description paragraph (kept in `HeroPerkRow` below the
 *     name only on the hero detail page and in Quick View);
 *   * the power line and the max-power figure — progression research, and the
 *     hero page carries it in full;
 *   * evolution and material costs, which live on the detail page;
 *   * the category tag, which the category filter and the hero page already
 *     express and which only added a second line of text to every tile.
 *
 * No data was removed anywhere. The loader still attaches the full reference
 * block, so `HeroDetail` and `HeroPreviewDialog` still render the descriptions,
 * the power range and the costs — this card simply stops repeating them.
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

  return (
    <EntityCard
      rarity={rarity}
      testId="hero-card"
      accent="none"
      className="h-full w-full transition-[transform,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none"
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

      <EntityCardBody className="gap-3 p-4">
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
          {/* Class glyph, when one is registered for the class. The icon is
              drawn ONLY when it actually exists: an empty bordered square would
              read as a broken asset, and the class name is already a complete
              label on its own. A registered glyph is shared with the class
              filter via `class_icon_url` — never a second hardcoded URL. */}
          <p className="flex items-center gap-1.5 text-[13px] leading-snug text-muted-foreground">
            {hero.classIconUrl ? (
              <img
                src={hero.classIconUrl}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                // Fixed box + object-contain, so a registered glyph never
                // shifts the class name while it arrives.
                className="h-4 w-4 shrink-0 rounded-sm object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <span className="font-medium text-foreground/90">
              {heroClassLabel(locale, hero.heroClass)}
            </span>
          </p>
          {rarity ? <RarityPill locale={locale} rarity={rarity} className="w-fit" /> : null}
        </div>

        {standard ? <HeroPerkRow perk={standard} /> : null}

        {abilities.length > 0 ? (
          <HeroAbilityStrip
            locale={locale}
            hintText={s.abilityHint}
            href={href}
            abilities={abilities}
          />
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
    classIconUrl: r.class_icon_url ?? null,
  };
}

export { heroClassLabel };
