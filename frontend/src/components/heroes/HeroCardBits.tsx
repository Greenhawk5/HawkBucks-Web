/**
 * Hero-card presentation bits for the public directory.
 *
 * Two designed components live here rather than inline in `HeroCard`, because
 * both answer the same question — "what does this hero actually do?" — and both
 * need to stay legible, accessible and consistent as the card is resized:
 *
 *   `HeroPerkModule`   the Standard Perk as a composed block (label, icon,
 *                      name, description-when-stored)
 *   `HeroAbilityStrip` the ability kit as a row of icons whose names are
 *                      reachable by pointer, keyboard and assistive tech
 *
 * Neither invents content. A perk description renders only when the CMS
 * actually stored one; an ability name always comes from `ability.name`. When
 * a field is absent the module simply omits it rather than guessing an effect
 * from the name.
 *
 * Stacking note (why the ability icons are real links): the card's title link
 * paints a stretched `::after` hit area over the whole card, so any element
 * that needs to receive hover/focus must sit above it. Rather than punching a
 * hole in that overlay (which would break "click anywhere on the card"), each
 * ability points at the same hero the card already points at — so the icon is
 * a genuine focusable control with an accessible name, and no click target
 * conflicts with another.
 *
 * RTL: directional properties here are logical (`ps-`, `pe-`, `start-`, `end-`,
 * `text-start`/`text-end`) so ar-SA and fa-IR mirror from the document `dir`.
 */

import * as React from "react";
import { Link } from "@tanstack/react-router";

import { MediaIcon } from "./HeroReferenceBits";
import { heroLabels } from "@/lib/cms/hero-labels";
import type { PublicHeroAbility, PublicHeroPerk } from "@/lib/cms/hero-reference";
import { cn } from "@/lib/utils";

/**
 * Standard Perk module.
 *
 * A left accent rule rather than a nested card: the perk sits *inside* the
 * hero card, and boxing it again would stack a third border/radius on top of
 * the artwork and the card shell. The rule gives the block its own visual
 * grouping without adding a container.
 */
export function HeroPerkModule({
  locale,
  perk,
  className,
}: {
  locale: string;
  perk: PublicHeroPerk;
  className?: string;
}) {
  const l = heroLabels(locale);
  const description = perk.description.trim();

  return (
    <div
      data-testid="hero-perk-module"
      data-slot={perk.slot}
      className={cn("border-s-2 border-primary/45 ps-3", className)}
    >
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {l.standardPerk}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        {/* Only drawn when the CMS actually associated an icon: an empty
            bordered square reads as a broken asset, and the left accent rule
            already carries the block's grouping. */}
        {perk.iconUrl ? <MediaIcon url={perk.iconUrl} sizeClass="h-7 w-7" /> : null}
        <p
          className="min-w-0 text-sm font-semibold leading-snug text-foreground"
          title={description || perk.name}
        >
          {perk.name}
        </p>
      </div>
      {/* Stored editorial description only. Never derived from the name. */}
      {description !== "" ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Ability strip.
 *
 * The icons are the visual entry point. Each one is a link to the hero it
 * belongs to, which makes it focusable and gives it a real accessible name;
 * the hovered or focused ability's name is echoed into a reserved caption line
 * beneath the strip so the information is never hover-only for pointer users,
 * and it is always present for assistive tech through each link's name.
 * Touch users get the same names from Quick View and the hero page.
 */
export function HeroAbilityStrip({
  locale,
  hintText,
  href,
  abilities,
  className,
}: {
  locale: string;
  /**
   * Resting caption. Kept to a short label rather than a sentence so it can
   * never wrap to a second line in a narrow card; the fuller explanation is
   * available as the strip's native tooltip.
   */
  hintText: string;
  /** Canonical hero detail URL — the destination every icon leads to. */
  href: string;
  /** Already in canonical `sort_order` order from the loader; not re-sorted. */
  abilities: readonly PublicHeroAbility[];
  className?: string;
}) {
  const l = heroLabels(locale);
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  if (abilities.length === 0) return null;

  const active = abilities.find((a) => a.key === activeKey);

  return (
    <div className={cn("mt-auto", className)}>
      <ul
        data-testid="hero-ability-strip"
        aria-label={l.abilities}
        title={hintText}
        className="flex flex-wrap items-center gap-1"
      >
        {abilities.map((a) => (
          <li key={a.key}>
            <Link
              to={href}
              aria-label={a.name}
              onMouseEnter={() => setActiveKey(a.key)}
              onMouseLeave={() => setActiveKey(null)}
              onFocus={() => setActiveKey(a.key)}
              onBlur={() => setActiveKey(null)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-panel-border/50 bg-background/40 outline-none transition-colors hover:border-primary/60 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MediaIcon
                url={a.iconUrl}
                sizeClass="h-7 w-7"
                fallbackText={a.name.slice(0, 2)}
                labelled={false}
              />
            </Link>
          </li>
        ))}
      </ul>
      {/* Fixed height so revealing a name never reflows the card. */}
      <p
        data-testid="hero-ability-caption"
        aria-hidden="true"
        className="mt-1.5 flex h-4 items-center overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-none text-muted-foreground"
      >
        {active ? active.name : l.abilities}
      </p>
    </div>
  );
}
