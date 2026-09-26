import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
import { HERO_CLASSES } from "@/lib/cms/heroes";
import { listPublicHeroes, type PublicHeroItem } from "@/lib/cms/public.loader";
import { HeroCard } from "./HeroCard";
import { HeroPreviewDialog } from "./HeroPreviewDialog";
import {
  parseHeroClassParam,
  parseHeroSortParam,
  parsePageParam,
  parseSearchParam,
  PUBLIC_PAGE_SIZE,
} from "@/lib/cms/public-content";

export function HeroesPage({
  locale,
  search,
  basePath,
}: {
  locale: string;
  search: Record<string, unknown>;
  basePath: string;
}) {
  const s = getPublicStrings(locale);
  const navigate = useNavigate();
  const heroClass = parseHeroClassParam(search["class"]);
  const sort = parseHeroSortParam(search["sort"]);
  const page = parsePageParam(search["page"]);
  const q = parseSearchParam(search["q"]) ?? "";
  const [draft, setDraft] = React.useState(q);
  const [items, setItems] = React.useState<PublicHeroItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [preview, setPreview] = React.useState<PublicHeroItem | null>(null);
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
  React.useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    listPublicHeroes({
      data: {
        locale,
        ...(heroClass === null ? {} : { heroClass }),
        ...(q === "" ? {} : { search: q }),
        sort,
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
  }, [locale, heroClass, q, sort, page]);
  const pages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));
  const qs = (extra: Record<string, unknown>): string => {
    const p = new URLSearchParams();
    if (heroClass) p.set("class", heroClass);
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
      <h1 className="font-display text-3xl font-extrabold">{s.heroesTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{s.heroesIntro}</p>
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="hero-search" className="text-xs font-bold uppercase tracking-wider">
            {s.searchLabel}
          </label>
          <input
            id="hero-search"
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={s.searchPlaceholder}
            className="mt-1 block w-64 rounded-lg border border-panel-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <span id="class-label" className="text-xs font-bold uppercase tracking-wider">
            {s.classLabel}
          </span>
          <div role="group" aria-labelledby="class-label" className="mt-1 flex flex-wrap gap-2">
            <Link
              to={qs({})}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${heroClass === null ? "border-primary bg-primary text-primary-foreground" : "border-panel-border"}`}
            >
              {s.classAll}
            </Link>
            {HERO_CLASSES.map((c) => (
              <Link
                key={c}
                to={qs({ class: c })}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${heroClass === c ? "border-primary bg-primary text-primary-foreground" : "border-panel-border"}`}
              >
                {heroClassLabel(locale, c)}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="hero-sort" className="text-xs font-bold uppercase tracking-wider">
            {s.sortLabel}
          </label>
          <select
            id="hero-sort"
            value={sort}
            onChange={(e) =>
              navigate({
                to: ".",
                search: (p: Record<string, unknown>) => ({
                  ...p,
                  sort: e.target.value === "editorial" ? undefined : e.target.value,
                  page: undefined,
                }),
                replace: true,
              } as never)
            }
            className="mt-1 block rounded-lg border border-panel-border bg-background px-3 py-2 text-sm"
          >
            <option value="editorial">{s.sortEditorial}</option>
            <option value="popularity">{s.sortPopularity}</option>
            <option value="name">{s.sortName}</option>
          </select>
        </div>
      </div>
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
        {items.map((h) => (
          <HeroCard key={h.contentId} hero={h} locale={locale} onPreview={setPreview} />
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
      <HeroPreviewDialog hero={preview} locale={locale} onClose={() => setPreview(null)} />
    </main>
  );
}
