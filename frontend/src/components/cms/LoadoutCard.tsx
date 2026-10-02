import { Link } from "@tanstack/react-router";
import { Boxes } from "lucide-react";

import { getPublicStrings } from "@/lib/cms/public-strings";
import type { PublicLoadoutItem } from "@/lib/cms/public.loader";
import {
  EntityCard,
  EntityCardBody,
  EntityCardMedia,
  EntityCardTitleLink,
  MetaChip,
} from "@/components/content/EntityCard";

export function loadoutDetailHref(locale: string, slug: string): string {
  return locale === "en" ? `/loadouts/${slug}` : `/${locale}/loadouts/${slug}`;
}

/**
 * Loadout card. Answers "what is this build, and who is it built around?"
 * before the reader opens it: the Commander slot gets the strong treatment,
 * Support is summarised rather than enumerated as a database list, and the
 * Team Perk gets a distinct but restrained line. Sparse support rosters are
 * reported as-is — never padded out to look complete.
 */
export function LoadoutCard({ loadout, locale }: { loadout: PublicLoadoutItem; locale: string }) {
  const s = getPublicStrings(locale);
  const commander = loadout.commander;
  const supportCount = loadout.supportCount ?? 0;
  return (
    <EntityCard testId="loadout-card">
      <EntityCardMedia
        src={loadout.imageUrl}
        alt={loadout.title}
        fallbackIcon={Boxes}
        aspect="aspect-[16/9]"
      />
      <EntityCardBody>
        {loadout.loadoutType ? <MetaChip>{loadout.loadoutType}</MetaChip> : null}
        <div className="mt-2">
          <EntityCardTitleLink href={loadoutDetailHref(locale, loadout.slug)}>
            {loadout.title}
          </EntityCardTitleLink>
        </div>

        {/* Commander leads the reading order — the strongest identity signal. */}
        {commander ? (
          <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-primary/25 bg-primary/[0.07] px-3 py-2">
            <span
              aria-hidden="true"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/15 font-display text-[10px] font-extrabold uppercase text-primary"
            >
              {s.commander.slice(0, 2)}
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[10px] font-bold uppercase tracking-[0.14em] text-primary/80">
                {s.commander}
              </span>
              <span className="block truncate text-sm font-semibold">{commander.title}</span>
            </span>
          </div>
        ) : null}

        <p className="mt-2 text-xs text-muted-foreground">
          {s.supportTeam}: {supportCount}
        </p>

        {loadout.teamPerkName ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-display font-bold uppercase tracking-[0.12em] text-primary/80">
              Team Perk
            </span>
            <span className="truncate">{loadout.teamPerkName}</span>
          </p>
        ) : null}

        {loadout.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {loadout.description.slice(0, 140)}
          </p>
        ) : null}

        <div className="mt-auto pt-4">
          <Link
            to={loadoutDetailHref(locale, loadout.slug)}
            className="relative z-10 inline-flex h-9 items-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {s.viewDetails}
          </Link>
        </div>
      </EntityCardBody>
    </EntityCard>
  );
}
