import * as React from "react";
import type { GraphCard } from "@/lib/cms/content-graph.server";

function cardHref(card: GraphCard, locale: string): string {
  const prefix = locale === "en" ? "" : `/${locale}`;
  if (card.entityType === "hero") return `${prefix}/heroes/${card.slug}`;
  if (card.entityType === "loadout") return `${prefix}/loadouts/${card.slug}`;
  if (
    card.entityType === "weapon" ||
    card.entityType === "trap" ||
    card.entityType === "perk" ||
    card.entityType === "schematic"
  )
    return `${prefix}/schematics/${card.slug}`;
  return `${prefix}/guides/${card.slug}`;
}

/** CMS-driven related-content section (published targets only, SSR-fed). */
export function GraphSection({
  title,
  items,
  locale,
  testId,
}: {
  title: string;
  items: GraphCard[];
  locale: string;
  testId: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8" aria-label={title} data-testid={testId}>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((c) => (
          <li key={c.contentId} className="rounded-xl border border-panel-border p-4">
            <a href={cardHref(c, locale)} className="font-bold hover:text-primary">
              {c.title}
            </a>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              {c.entityType}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Client loader for graph sections that the SSR detail loader skips. */
export function useContentGraph(
  fetcher: (contentId: string, locale: string) => Promise<GraphCard[]>,
  contentId: string,
  locale: string,
): GraphCard[] {
  const [items, setItems] = React.useState<GraphCard[]>([]);
  React.useEffect(() => {
    let live = true;
    fetcher(contentId, locale)
      .then((r) => {
        if (live) setItems(r);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [contentId, locale, fetcher]);
  return items;
}
