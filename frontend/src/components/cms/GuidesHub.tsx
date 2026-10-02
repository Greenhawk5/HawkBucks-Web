import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

import { getPublicStrings } from "@/lib/cms/public-strings";
import { applyPublicParams } from "@/lib/cms/public-strings-base";
import type { HubGuideRow } from "@/lib/cms/public-hubs.loader";
import { parsePageParam, parseSearchParam, PUBLIC_PAGE_SIZE } from "@/lib/cms/public-content";
import { guideLocalizePath, guideTopicPath } from "@/lib/cms/guide-paths";
import { ContentDiscoveryBar } from "@/components/content/ContentDiscoveryBar";
import { ContentEmptyState } from "@/components/content/ContentEmptyState";
import { PaginationBar } from "@/components/content/PaginationBar";
import { PublicSectionHeader } from "@/components/content/PublicSectionHeader";
import { ResultCount } from "@/components/content/ResultCount";
import { GuideCard, guideHref } from "./GuideCard";

/**
 * Editorial Guides hub.
 *
 * The newest guide is promoted only on an unfiltered first page — i.e. only
 * when it genuinely is the current lead story. Nothing is hardcoded: with no
 * published guides the hub renders a complete, purposeful empty state instead
 * of placeholder content. The listing arrives from the route loader, so the
 * featured story, the grid and the result count all render server-side.
 */
export function GuidesHub({
  locale,
  search,
  basePath,
  topics,
  initial,
}: {
  locale: string;
  search: Record<string, unknown>;
  basePath: string;
  topics: Array<{ slug: string; title: string; description: string }>;
  initial: { items: HubGuideRow[]; total: number };
}) {
  const s = getPublicStrings(locale);
  const navigate = useNavigate();
  const category = typeof search["category"] === "string" ? search["category"] : null;
  const q = parseSearchParam(search["q"]) ?? "";
  const page = parsePageParam(search["page"]);
  const [draft, setDraft] = React.useState(q);

  React.useEffect(() => {
    setDraft(q);
  }, [q]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (draft !== q)
        navigate({
          to: ".",
          search: (p: Record<string, unknown>) => ({
            ...p,
            q: draft === "" ? undefined : draft,
            page: undefined,
          }),
          replace: true,
        } as never);
    }, 350);
    return () => clearTimeout(t);
  }, [draft, q, navigate]);

  const items = initial.items;
  const total = initial.total;
  const qs = (extra: Record<string, unknown>): string => {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (q) p.set("q", q);
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === null || v === "") p.delete(k);
      else p.set(k, String(v));
    }
    const str = p.toString();
    return str === "" ? basePath : `${basePath}?${str}`;
  };

  const pages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));
  const hasFilters = category !== null || q !== "";
  const activeFilterCount = (category !== null ? 1 : 0) + (q !== "" ? 1 : 0);
  const showFeatured = page === 1 && !q && category === null;
  const featured = showFeatured ? items[0] : undefined;
  const rest = featured ? items.slice(1) : items;
  const topicLabelFor = (slug: string | null): string | undefined =>
    slug === null ? undefined : (topics.find((t) => t.slug === slug)?.title ?? undefined);

  return (
    <div className="py-10">
      <PublicSectionHeader title={s.guidesTitle} description={s.guidesIntro} />

      {featured ? (
        <article className="mt-8 overflow-hidden rounded-2xl border border-panel-border bg-background/40">
          <div className="grid gap-0 sm:grid-cols-2">
            {featured.delivery_url ? (
              <img
                src={featured.delivery_url}
                alt=""
                className="aspect-[16/9] h-full w-full object-cover sm:aspect-auto"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            ) : null}
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
                {s.featuredGuide}
              </p>
              <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight">
                <Link
                  to={guideHref(locale, featured.slug)}
                  className="rounded outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {featured.title}
                </Link>
              </h2>
              {featured.excerpt ? (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {featured.excerpt}
                </p>
              ) : null}
              <div className="mt-5">
                <Link
                  to={guideHref(locale, featured.slug)}
                  className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-wider text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {s.readGuide}
                </Link>
              </div>
            </div>
          </div>
        </article>
      ) : null}

      <ContentDiscoveryBar
        searchId="guides-search"
        searchLabel={s.searchLabel}
        searchValue={draft}
        onSearchChange={setDraft}
        searchPlaceholder={s.searchPlaceholder}
        activeFilterCount={activeFilterCount}
        filtersLabel={s.filtersLabel}
      >
        {/* mt-4 matches the facet-grid spacing the other three hubs use below
            the search row, so Topics sits at the same vertical position. */}
        <div className="mt-4">
          <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {s.topicsLabel}
          </p>
          {/* Topic links are real routes (/guides/topics/<slug>), so they stay
              crawlable and indexable independently of the hub's own filters. */}
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={s.topicsLabel}>
            {topics.map((t) => (
              <li key={t.slug}>
                <Link
                  to={guideLocalizePath(guideTopicPath(t.slug), locale)}
                  className="inline-flex h-9 items-center rounded-full border border-panel-border px-3.5 text-xs font-bold text-muted-foreground outline-none transition-colors hover:border-primary/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5">
          <ResultCount
            count={total}
            label={applyPublicParams(s.resultGuides, { count: total })}
            className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"
          />
          {hasFilters ? (
            <Link
              to={basePath}
              className="text-xs font-bold uppercase tracking-[0.14em] text-primary underline underline-offset-4"
            >
              {s.clearFilters}
            </Link>
          ) : null}
        </div>
      </ContentDiscoveryBar>

      {items.length === 0 ? (
        <div className="mt-10">
          <ContentEmptyState
            icon={BookOpen}
            title={s.emptyGuidesTitle}
            description={s.emptyGuidesDesc}
          />
        </div>
      ) : null}

      {rest.length > 0 ? (
        <section aria-label={s.latestGuides} className="mt-8">
          <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">
            {s.latestGuides}
          </h2>
          <ul className="mt-4 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4 sm:gap-5">
            {rest.map((g) => (
              <li key={g.content_id} className="flex">
                <GuideCard guide={g} locale={locale} topicLabel={topicLabelFor(g.category_slug)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PaginationBar
        page={page}
        pageCount={pages}
        hrefForPage={(p) => qs({ page: p === 1 ? undefined : p })}
        label={s.guidesTitle}
      />
    </div>
  );
}
