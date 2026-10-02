import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
import type { PublicHeroItem } from "@/lib/cms/public.loader";
import { RarityBadge } from "./RarityBadge";
import {
  EntityCard,
  EntityCardBody,
  EntityCardMedia,
  EntityCardTitleLink,
  MetaChip,
} from "@/components/content/EntityCard";

export function heroDetailHref(locale: string, slug: string): string {
  return locale === "en" ? `/heroes/${slug}` : `/${locale}/heroes/${slug}`;
}
export function loadoutDetailHref(locale: string, slug: string): string {
  return locale === "en" ? `/loadouts/${slug}` : `/${locale}/loadouts/${slug}`;
}

/** Hero card — collectible framing: portrait, rarity edge, class chip. */
export function HeroCard({
  hero,
  locale,
  onPreview,
}: {
  hero: PublicHeroItem & { rarity?: string | null };
  locale: string;
  onPreview?: (hero: PublicHeroItem) => void;
}) {
  const s = getPublicStrings(locale);
  const rarity = (hero as { rarity?: string | null }).rarity;
  return (
    <EntityCard rarity={rarity} testId="hero-card">
      <EntityCardMedia src={hero.imageUrl} alt={hero.title} fallbackIcon={Shield} />
      <EntityCardBody>
        <div className="flex flex-wrap items-center gap-2">
          <RarityBadge rarity={rarity} />
          <MetaChip>{heroClassLabel(locale, hero.heroClass)}</MetaChip>
        </div>
        <div className="mt-2">
          <EntityCardTitleLink href={heroDetailHref(locale, hero.slug)}>
            {hero.title}
          </EntityCardTitleLink>
        </div>
        {hero.category ? (
          <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            {hero.category}
          </p>
        ) : null}
        {hero.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {hero.description.slice(0, 140)}
          </p>
        ) : null}
        <div className="mt-auto flex items-center gap-2 pt-4">
          <Link
            to={heroDetailHref(locale, hero.slug)}
            className="relative z-10 inline-flex h-9 items-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {s.viewDetails}
          </Link>
          {onPreview ? (
            <button
              type="button"
              onClick={() => onPreview(hero)}
              aria-haspopup="dialog"
              className="relative z-10 inline-flex h-9 items-center rounded-lg border border-panel-border px-3 text-xs font-semibold text-muted-foreground outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              {s.openPreview}
            </button>
          ) : null}
        </div>
      </EntityCardBody>
    </EntityCard>
  );
}
