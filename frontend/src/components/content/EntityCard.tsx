import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import { rarityGlowStyle, rarityToken } from "@/lib/cms/rarity-tokens";
import { cn } from "@/lib/utils";

/**
 * Shared card foundation for every public content hub.
 *
 * One visual system (surface, hairline border, rarity accent, hover lift,
 * focus ring, media aspect) with entity-specific bodies composed inside it —
 * so Heroes, Schematics, Loadouts and Guides read as the same product without
 * being four copies of one card.
 *
 * Rarity is expressed as an accent bar + optional restrained glow, and always
 * paired with a text badge by RarityBadge, never color alone.
 */
export function EntityCard({
  rarity,
  testId,
  dataKind,
  interactive = true,
  className,
  children,
}: {
  rarity?: string | null | undefined;
  testId?: string;
  dataKind?: string;
  /** False for cards whose body has no single navigable target. */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const token = rarityToken(rarity);
  return (
    <article
      {...(testId ? { "data-testid": testId } : {})}
      {...(dataKind ? { "data-kind": dataKind } : {})}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-panel-border bg-background/40 backdrop-blur-sm",
        "transition-[transform,border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none",
        interactive &&
          "hover:-translate-y-1 hover:border-primary/70 focus-within:border-primary/70 motion-reduce:hover:translate-y-0",
        className,
      )}
      {...(token ? { style: rarityGlowStyle(token) } : {})}
    >
      {token ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-10 h-[3px]"
          style={{ backgroundColor: token.accent }}
        />
      ) : null}
      {children}
    </article>
  );
}

/** Media slot: fixed aspect so mixed source artwork never reflows the grid. */
export function EntityCardMedia({
  src,
  alt,
  fallbackIcon: FallbackIcon,
  aspect = "aspect-[4/3]",
  /** Above-the-fold covers must not be lazy — see phase19 performance guards. */
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  fallbackIcon?: LucideIcon;
  aspect?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(aspect, "w-full shrink-0 object-cover")}
        {...(priority
          ? { loading: "eager" as const, fetchPriority: "high" as const }
          : { loading: "lazy" as const })}
        decoding="async"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        aspect,
        "relative grid w-full shrink-0 place-items-center bg-muted/60 text-muted-foreground/50",
      )}
    >
      {FallbackIcon ? <FallbackIcon className="h-9 w-9" /> : null}
    </div>
  );
}

export function EntityCardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-1 flex-col p-4", className)}>{children}</div>;
}

/**
 * Title link. The whole card is NOT wrapped in an anchor: the detail button
 * below is a sibling link, and nested interactive elements would be invalid
 * HTML. `after:absolute after:inset-0` stretches this link's hit area across
 * the card, so the visible title is the real target for both pointer and
 * keyboard users while the secondary action stays separately reachable.
 */
export function EntityCardTitleLink({
  href,
  children,
  className,
  stretch = true,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  stretch?: boolean;
}) {
  return (
    <h3 className="font-display text-base font-bold leading-snug">
      <Link
        to={href}
        className={cn(
          "rounded outline-none transition-colors group-hover:text-primary focus-visible:ring-2 focus-visible:ring-ring",
          // Stretched hit area sits above the media; the explicit <Link>
          // button in the footer re-asserts its own stacking to stay clickable.
          stretch && "after:absolute after:inset-0 after:z-0 after:content-['']",
          className,
        )}
      >
        {children}
      </Link>
    </h3>
  );
}

/** Metadata chip. Text-only by design — never a color-coded status pill. */
export function MetaChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-panel-border/80 bg-background/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
