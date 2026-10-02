import type { ReactNode } from "react";

/**
 * Section identity block shared by the four public content hubs. Establishes
 * the page hierarchy (title → description) above the discovery toolbar, and
 * provides one anchor point for optional header content such as a personal
 * stats strip on Loadouts.
 */
export function PublicSectionHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    // No background, border or gradient: the identity block must sit directly on
    // the page surface so the header never reads as a card. Keeping it unpainted
    // (rather than matching a colour) means it stays correct if the global page
    // background changes.
    <header>
      {eyebrow ? (
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-2 font-display text-3xl font-extrabold uppercase leading-none tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {description}
      </p>
      {children}
    </header>
  );
}
