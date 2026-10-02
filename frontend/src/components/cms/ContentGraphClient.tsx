import * as React from "react";
import { GraphSection } from "./ContentGraph";
import type { GraphCard } from "@/lib/cms/content-graph.server";

/**
 * Client-side content-graph section. Fetches the CMS-driven graph once per
 * entity (published targets only) and renders crawlable <a href> cards.
 * SSR detail loaders already emit the primary related content; this covers
 * the reverse edges (guides referencing this entity, loadouts using it).
 */
export function ContentGraph({
  load,
  contentId,
  locale,
  title,
  testId,
}: {
  load: (args: { data: { contentId: string; locale: string } }) => Promise<{
    loadouts?: GraphCard[];
    guides?: GraphCard[];
    schematics?: GraphCard[];
  }>;
  contentId: string;
  locale: string;
  title: string;
  testId: string;
}) {
  const [items, setItems] = React.useState<GraphCard[]>([]);
  React.useEffect(() => {
    let live = true;
    load({ data: { contentId, locale } })
      .then((r) => {
        if (!live) return;
        const merged = [
          ...((r as { loadouts?: GraphCard[] }).loadouts ?? []),
          ...((r as { schematics?: GraphCard[] }).schematics ?? []),
          ...((r as { guides?: GraphCard[] }).guides ?? []),
        ];
        setItems(merged);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [load, contentId, locale]);
  return <GraphSection title={title} items={items} locale={locale} testId={testId} />;
}
