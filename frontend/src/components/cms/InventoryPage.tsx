import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { getPublicStrings } from "@/lib/cms/public-strings";
import { listPublicInventory, type PublicInventoryItem } from "@/lib/cms/public-inventory.loader";
import {
  PUBLIC_PAGE_SIZE,
  parseInventorySortParam,
  parseInventoryTypeParam,
  parsePageParam,
  parseSearchParam,
} from "@/lib/cms/public-content";
import { InventoryCard } from "./InventoryCard";

const TYPE_FILTERS = ["all", "weapon", "trap"] as const;

/**
 * Phase 15 — public Inventory listing.
 * SSR-first via the unified published-only `listPublicInventory` reader
 * (server-side search/filter/sort/pagination; URL is the source of truth).
 * The browser never touches D1 and never loads an unbounded catalog.
 */
export function InventoryPage({
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
  const type = parseInventoryTypeParam(search["type"]);
  const sort = parseInventorySortParam(search["sort"]);
  const page = parsePageParam(search["page"]);
  const q = parseSearchParam(search["q"]) ?? "";
  const [draft, setDraft] = React.useState(q);
  const [items, setItems] = React.useState<PublicInventoryItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
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
    listPublicInventory({
      data: {
        locale,
        type,
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
  }, [locale, type, q, sort, page]);
  const pages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));
  const qs = (extra: Record<string, unknown>) => {
    const p = new URLSearchParams();
    if (type !== "all") p.set("type", type);
    if (q) p.set("q", q);
    if (sort !== "editorial") p.set("sort", sort);
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === null || v === "") p.delete(k);
      else p.set(k, String(v));
    }
    const str = p.toString();
    return str === "" ? basePath : `${basePath}?${str}`;
  };
  const typeLabel = (t: (typeof TYPE_FILTERS)[number]) =>
    t === "all" ? s.typeAll : t === "weapon" ? s.typeWeapon : s.typeTrap;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold">{s.inventoryTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{s.inventoryIntro}</p>
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="inventory-search" className="text-xs font-bold uppercase tracking-wider">
            {s.searchLabel}
          </label>
          <input
            id="inventory-search"
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={s.searchPlaceholder}
            className="mt-1 block w-64 rounded-lg border border-panel-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <span id="inventory-type-label" className="text-xs font-bold uppercase tracking-wider">
            {s.typeLabel}
          </span>
          <div
            role="group"
            aria-labelledby="inventory-type-label"
            className="mt-1 flex flex-wrap gap-2"
          >
            {TYPE_FILTERS.map((t) => (
              <Link
                key={t}
                to={qs({ type: t === "all" ? undefined : t, page: undefined })}
                aria-current={type === t ? "true" : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${type === t ? "border-primary bg-primary text-primary-foreground" : "border-panel-border"}`}
              >
                {typeLabel(t)}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="inventory-sort" className="text-xs font-bold uppercase tracking-wider">
            {s.sortLabel}
          </label>
          <select
            id="inventory-sort"
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
        {items.map((item) => (
          <InventoryCard key={`${item.kind}-${item.contentId}`} item={item} locale={locale} />
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
