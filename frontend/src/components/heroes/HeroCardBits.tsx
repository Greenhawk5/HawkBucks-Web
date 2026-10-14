/**
 * Hero-card presentation bits for the public directory.
 *
 * Two designed components live here rather than inline in `HeroCard`, because
 * both answer the same question — "what does this hero actually do?" — and both
 * need to stay legible, accessible and consistent as the card is resized:
 *
 *   `HeroPerkRow`     the Standard Perk as one compact line: icon + name
 *   `HeroAbilityStrip` the ability kit as a row of icons whose names are
 *                      reachable by pointer, keyboard and assistive tech
 *
 * Neither invents content. Both read only what the CMS stored: an icon renders
 * only when an asset is actually associated, and a name always comes from the
 * stored `name`. When a field is absent the module omits it rather than
 * guessing.
 *
 * SPLIT OF RESPONSIBILITY (why the description moved out, not away)
 *   The listing card shows icon + name ONLY. The Standard Perk's description is
 *   a paragraph, and a truncated paragraph is the one thing that reliably makes
 *   a card look cluttered at four-across on a laptop. The full description is
 *   unchanged and still rendered by `PerkRow` on the hero detail page and by the
 *   Quick View dialog, which is where a reader has opted into studying a hero.
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

import { Link } from "@tanstack/react-router";

import { MediaIcon } from "./HeroReferenceBits";
import { heroLabels } from "@/lib/cms/hero-labels";
import type { PublicHeroAbility, PublicHeroPerk } from "@/lib/cms/hero-reference";
import { cn } from "@/lib/utils";

/**
 * Standard Perk row — the card's compact representation.
 *
 * A left accent rule rather than a nested card: the perk sits *inside* the hero
 * card, and boxing it again would stack a third border/radius on top of the
 * artwork and the card shell. The rule gives the block its own visual grouping
 * without adding a container.
 *
 * ICON: rendered only when the perk actually has an associated asset, for the
 * same reason as everywhere else in this codebase — an empty bordered square
 * reads as a broken image. When there is no icon the name simply starts at the
 * accent rule, so the row never looks half-drawn.
 *
 * NAME: always present, always the stored display name, always fully readable.
 * The row reserves two lines (`min-h`) and wraps (`line-clamp-2`) instead of
 * truncating to one line with an ellipsis: at six-across widths a single line
 * only fits ~15 characters, so `truncate` silently destroyed names like
 * "Enduring M…". Two 13px lines fit ~36 characters, which covers the catalog;
 * the rare longer name clamps with its full text still in the DOM, on the
 * native `title`, and one tap away in Quick View / the detail page — so
 * pointer, touch, keyboard, and assistive-tech users all reach it.
 * `items-start` keeps the icon pinned to the first text line when the name
 * wraps; `break-words` guards long localized compounds.
 */
export function HeroPerkRow({ perk, className }: { perk: PublicHeroPerk; className?: string }) {
  return (
    <div
      data-testid="hero-perk-module"
      data-slot={perk.slot}
      className={cn("flex items-start gap-2 border-s-2 border-primary/45 ps-2.5", className)}
    >
      {perk.iconUrl ? <MediaIcon url={perk.iconUrl} sizeClass="mt-0.5 h-5 w-5" /> : null}
      <p
        className="min-h-9 min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug text-foreground line-clamp-2"
        title={perk.name}
      >
        {perk.name}
      </p>
      {/* No slot label at all. The card only ever renders the STANDARD perk, so
          the name is self-describing; the label belongs on the hero detail
          page, where Standard and Commander appear side by side and it
          genuinely disambiguates. Rendering it sr-only here still put it in the
          accessibility tree and in every text extraction, which is noise the
          reader did not ask for. The `data-slot` attribute keeps the structure
          machine-readable for tests and structural CSS. */}
    </div>
  );
}

/**
 * Ability strip.
 *
 * The icons are the visual entry point. Each one is a link to the hero it
 * belongs to, which makes it focusable and gives it a real accessible name.
 * There is no resting caption line: it reserved a fixed-height row on every
 * card purely to echo a name that is already on each icon's accessible name and
 * on the hero page, which is the space the card now spends on being shorter
 * instead.
 *
 * The hovered or focused ability's name is announced through the link's own
 * accessible name, so the information is never hover-only for pointer users and
 * never missing for assistive tech. Touch users get the same names from Quick
 * View and the hero page.
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
  if (abilities.length === 0) return null;

  return (
    <ul
      data-testid="hero-ability-strip"
      aria-label={l.abilities}
      title={hintText}
      className={cn("mt-auto flex flex-wrap items-center gap-1", className)}
    >
      {abilities.map((a) => (
        <li key={a.key}>
          <Link
            to={href}
            aria-label={a.name}
            className="grid h-8 w-8 place-items-center rounded-lg border border-panel-border/50 bg-background/40 outline-none transition-colors hover:border-primary/60 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MediaIcon
              url={a.iconUrl}
              sizeClass="h-6 w-6"
              fallbackText={a.name.slice(0, 2)}
              labelled={false}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
