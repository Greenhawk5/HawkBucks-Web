import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
import {
  heroLabels,
  categoryLabel,
  tierCountLabel,
  powerRangeLabelText,
  formatNumber,
} from "@/lib/cms/hero-labels";
import type { PublicHeroItem } from "@/lib/cms/public.loader";
import type { HubHeroRow } from "@/lib/cms/public-hubs.loader";
import type {
  PublicHeroPerk,
  PublicHeroAbility,
  PublicHeroProgression,
} from "@/lib/cms/hero-reference";
import { cn } from "@/lib/utils";
import { RarityBadge } from "./RarityBadge";
import {
  EntityCard,
  EntityCardBody,
  EntityCardTitleLink,
  MetaChip,
} from "@/components/content/EntityCard";
import {
  HeroClassification,
  MetaChip2,
  AbilityChip,
  ResourceCostChip,
} from "@/components/heroes/HeroReferenceBits";

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
 * Hero card — a dense reference record, not a marketing tile.
 *
 * Reading order: portrait + name (identity) -> class/category (classification)
 * -> rarity (rarity) -> standard + commander perk (role) -> ability icons (kit)
 * -> tier/power line (progression). A reader can tell what a hero does without
 * opening anything.
 *
 * The whole card is a single link target: `EntityCardTitleLink` stretches the
 * hit area, so there is exactly ONE interactive element per card rather than the
 * previous two competing buttons.
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
  dense?: boolean;
}) {
  const s = getPublicStrings(locale);
  const l = heroLabels(locale);
  const rarity = hero.rarity ?? null;
  const ref = hero.reference;
  const standard = ref?.perks.find((p) => p.slot === "standard") ?? null;
  const commander = ref?.perks.find((p) => p.slot === "commander") ?? null;
  const abilities = ref?.abilities ?? [];
  const prog = ref?.progression ?? null;
  const maxPower = ref?.maxPower ?? prog?.maxPower ?? null;
  const tierCount = prog?.tierCount ?? null;
  const summary = hero.summary && hero.summary.trim() !== "" ? hero.summary : null;
  const cat = categoryLabel(locale, hero.category);
  void cat;

  return (
    <EntityCard rarity={rarity} testId="hero-card" className="h-full">
      {/* Media: square, small, object-top so a bust render is not cropped oddly. */}
      {hero.imageUrl ? (
        <img
          src={hero.imageUrl}
          alt={hero.title}
          className={cn(
            "w-full shrink-0 border-b border-panel-border/50 bg-background/40 object-cover object-top",
            dense ? "aspect-[3/2]" : "aspect-square",
          )}
          loading={priority ? ("eager" as const) : ("lazy" as const)}
          {...(priority ? { fetchPriority: "high" as const } : {})}
          decoding="async"
        />
      ) : (
        <div
          aria-hidden="true"
          className={cn(
            "grid w-full shrink-0 place-items-center border-b border-panel-border/50 bg-muted/30 text-muted-foreground/40",
            dense ? "aspect-[3/2]" : "aspect-square",
          )}
        >
          <Shield className="h-8 w-8" />
        </div>
      )}

      <EntityCardBody className="gap-2 p-3">
        {/* Identity.
            The title is a REAL anchor rendered here rather than through the
            shared EntityCardTitleLink so the crawlable link is unambiguous in
            this file. It keeps the same stretched hit-area contract: the ::after
            overlay covers the card, so there is exactly ONE interactive element
            per card (the old card had a title link plus two buttons). */}
        <h3 className="font-display text-[15px] font-bold leading-snug">
          <Link
            to={heroDetailHref(locale, hero.slug)}
            className="rounded outline-none transition-colors after:absolute after:inset-0 after:z-0 after:content-[''] hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {hero.title}
          </Link>
        </h3>

        {/* Classification */}
        <HeroClassification locale={locale} heroClass={hero.heroClass} category={hero.category} />

        {/* Rarity — text + colour, never colour alone */}
        <div className="flex flex-wrap items-center gap-1.5">
          <RarityBadge rarity={rarity} />
          {tierCount ? <MetaChip2>{tierCountLabel(locale, tierCount)}</MetaChip2> : null}
          {maxPower !== null ? (
            <MetaChip2 title={l.maxPower}>
              {powerRangeLabelText(locale, maxPower, maxPower)}
            </MetaChip2>
          ) : null}
        </div>

        {/* Role — the single highest-value addition over the old card */}
        {standard ? (
          <ul className="space-y-1">
            <PerkLine locale={locale} label={l.standardPerk} perk={standard} />
            {commander ? (
              <PerkLine locale={locale} label={l.commanderPerk} perk={commander} muted />
            ) : null}
          </ul>
        ) : null}

        {/* Kit */}
        {abilities.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-1.5" aria-label={l.abilities}>
            {abilities.map((a) => (
              <li key={a.key}>
                <AbilityChip locale={locale} ability={a} />
              </li>
            ))}
          </ul>
        ) : null}

        {/* Progression headline */}
        {prog && prog.rarities.length > 0 ? <ProgressionLine locale={locale} prog={prog} /> : null}

        {/* Editorial summary only when an editor wrote one. Never a truncated body. */}
        {summary ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{summary}</p>
        ) : null}

        {/* Cost headline for the best rarity, if present */}
        {prog?.rarities.length ? <CostLine locale={locale} prog={prog} /> : null}

        {/* Secondary affordance: quick view only. The card itself is the link. */}
        {onPreview ? (
          <button
            type="button"
            onClick={() => onPreview(hero)}
            aria-haspopup="dialog"
            className="relative z-10 mt-auto inline-flex h-7 w-fit items-center rounded-md border border-panel-border/80 px-2 text-[11px] font-semibold text-muted-foreground outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {s.openPreview}
          </button>
        ) : null}
      </EntityCardBody>
    </EntityCard>
  );
}

function PerkLine({
  locale,
  label,
  perk,
  muted = false,
}: {
  locale: string;
  label: string;
  perk: PublicHeroPerk;
  muted?: boolean;
}) {
  return (
    <li className="flex min-w-0 items-center gap-1.5" title={perk.description || perk.name}>
      {perk.iconUrl ? (
        <img
          src={perk.iconUrl}
          alt=""
          aria-hidden="true"
          className="h-4 w-4 shrink-0 rounded-sm object-contain"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <span className="sr-only">{label}:</span>
      <span
        className={cn("min-w-0 truncate text-xs", muted ? "text-muted-foreground" : "font-medium")}
      >
        {perk.name}
      </span>
    </li>
  );
}

function ProgressionLine({ locale, prog }: { locale: string; prog: PublicHeroProgression }) {
  const best = prog.rarities[prog.rarities.length - 1];
  if (!best) return null;
  const top = best.tiers[best.tiers.length - 1];
  const label = powerRangeLabelText(locale, top?.powerMin ?? null, top?.powerMax ?? null);
  return (
    <p className="text-[11px] tabular-nums text-muted-foreground">
      {tierCountLabel(locale, best.tiers.length) ? (
        <span>{tierCountLabel(locale, best.tiers.length)}</span>
      ) : null}
      {label ? (
        <>
          {" · "}
          <span>{label}</span>
        </>
      ) : null}
    </p>
  );
}

function CostLine({ locale, prog }: { locale: string; prog: PublicHeroProgression }) {
  const best = prog.rarities[prog.rarities.length - 1];
  if (!best || best.total.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1" aria-label={heroLabels(locale).totalToMax}>
      {best.total.slice(0, 4).map((c) => (
        <li key={`${c.resourceKey}-${c.amount}`}>
          <ResourceCostChip locale={locale} cost={c} />
        </li>
      ))}
    </ul>
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

export { heroClassLabel, MetaChip };
