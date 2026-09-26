import * as React from "react";
import { Link } from "@tanstack/react-router";
import { getPublicStrings } from "@/lib/cms/public-strings";
import { listPublicLoadouts, type PublicLoadoutItem } from "@/lib/cms/public.loader";
import {
  PUBLIC_PAGE_SIZE,
  parseLoadoutSortParam,
  parsePageParam,
  parseSearchParam,
} from "@/lib/cms/public-content";
import { LoadoutCard } from "./LoadoutCard";

export function LoadoutsPage({
  locale,
  search,
  basePath,
}: {
  locale: string;
  search: Record<string, unknown>;
  basePath: string;
}) {
  const s = getPublicStrings(locale);
  const sort = parseLoadoutSortParam(search["sort"]);
  const page = parsePageParam(search["page"]);
  const q = parseSearchParam(search["q"]) ?? "";
  const [items, setItems] = React.useState<PublicLoadoutItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    listPublicLoadouts({
      data: {
        locale,
        sort,
        ...(q === "" ? {} : { search: q }),
        limit: PUBLIC_PAGE_SIZE,
        offset: (page - 1) * PUBLIC_PAGE_SIZE,
      },
    })
      .then((r) => {
        if (live) {
          setItems(r.items);
          setTotal(r.total);
          setLoading(false);
        }
      })
      .catch(() => {
        if (live) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [locale, sort, q, page]);
  const pages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));
  const qs = (extra: Record<string, unknown>): string => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sort !== "editorial") p.set("sort", sort);
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== "") p.set(k, String(v));
    }
    const str = p.toString();
    return str === "" ? basePath : `${basePath}?${str}`;
  };
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold">{s.loadoutsTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{s.loadoutsIntro}</p>
      {loading ? (
        <p className="mt-8 text-sm" role="status">
          {s.loading}
        </p>
      ) : null}
      {error && !loading ? (
        <p className="mt-8 text-sm" role="alert">
          {s.loadError}
        </p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-panel-border p-10 text-center">
          <h2 className="font-display text-lg font-bold">{s.emptyTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{s.emptyDesc}</p>
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((l) => (
          <LoadoutCard key={l.contentId} loadout={l} locale={locale} />
        ))}
      </div>
      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-8 flex items-center gap-3 text-sm">
          {page > 1 ? <Link to={qs({ page: page - 1 })}>Page {page - 1}</Link> : null}
          <span aria-current="page">
            {page} / {pages}
          </span>
          {page < pages ? <Link to={qs({ page: page + 1 })}>Page {page + 1}</Link> : null}
        </nav>
      ) : null}
    </main>
  );
}
