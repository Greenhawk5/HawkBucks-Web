import { Link } from "@tanstack/react-router";
import { getPublicStrings } from "@/lib/cms/public-strings";
import type { PublicInventoryItem } from "@/lib/cms/public-inventory.loader";

export function inventoryDetailHref(locale: string, slug: string): string {
  return locale === "en" ? `/inventory/${slug}` : `/${locale}/inventory/${slug}`;
}

/**
 * Phase 15 — public Inventory item card.
 * Shows delivery-URL image only (never provider/private media fields),
 * localized name, weapon/trap type + editorial subtype, safe metadata,
 * and a link to the canonical detail page. Logical CSS properties keep
 * RTL correct; artwork itself is never mirrored.
 */
export function InventoryCard({ item, locale }: { item: PublicInventoryItem; locale: string }) {
  const s = getPublicStrings(locale);
  const typeLabel = item.kind === "weapon" ? s.weaponLabel : s.trapLabel;
  const subtype = item.kind === "weapon" ? item.weaponSubtype : item.trapSubtype;
  return (
    <article
      className="overflow-hidden rounded-xl border border-panel-border bg-background/40 transition-all hover:-translate-y-0.5 hover:border-primary"
      data-testid="inventory-card"
      data-kind={item.kind}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.title}
          className="aspect-[4/3] w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="grid aspect-[4/3] w-full place-items-center bg-muted text-4xl"
          aria-hidden="true"
        >
          {item.kind === "trap" ? "🪤" : "⚔️"}
        </div>
      )}
      <div className="p-4">
        <h3 className="font-display text-base font-bold">
          <Link
            to={inventoryDetailHref(locale, item.slug)}
            className="rounded outline-none focus-visible:ring-2 focus-visible:ring-ring hover:text-primary"
          >
            {item.title}
          </Link>
        </h3>
        <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
          {typeLabel}
          {subtype ? ` · ${s.subtypeLabel}: ${subtype}` : ""}
        </p>
        {item.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {item.description.slice(0, 140)}
          </p>
        ) : null}
        <div className="mt-3">
          <Link
            to={inventoryDetailHref(locale, item.slug)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            {s.viewDetails}
          </Link>
        </div>
      </div>
    </article>
  );
}
