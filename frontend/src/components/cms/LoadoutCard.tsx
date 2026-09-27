import { Link } from "@tanstack/react-router";
import { getPublicStrings } from "@/lib/cms/public-strings";
import type { PublicLoadoutItem } from "@/lib/cms/public.loader";
export function loadoutDetailHref(locale: string, slug: string): string {
  return locale === "en" ? `/loadouts/${slug}` : `/${locale}/loadouts/${slug}`;
}
export function LoadoutCard({ loadout, locale }: { loadout: PublicLoadoutItem; locale: string }) {
  const s = getPublicStrings(locale);
  return (
    <article
      className="overflow-hidden rounded-xl border border-panel-border bg-background/40 transition-all hover:-translate-y-0.5 hover:border-primary"
      data-testid="loadout-card"
    >
      {loadout.imageUrl ? (
        <img
          src={loadout.imageUrl}
          alt={loadout.title}
          className="aspect-[16/9] w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="grid aspect-[16/9] w-full place-items-center bg-muted text-4xl"
          aria-hidden="true"
        >
          🎒
        </div>
      )}
      <div className="p-4">
        <h3 className="font-display text-base font-bold">
          <Link
            to={loadoutDetailHref(locale, loadout.slug)}
            className="rounded outline-none focus-visible:ring-2 focus-visible:ring-ring hover:text-primary"
          >
            {loadout.title}
          </Link>
        </h3>
        <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
          {loadout.loadoutType}
        </p>
        {loadout.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {loadout.description.slice(0, 140)}
          </p>
        ) : null}
        <div className="mt-3">
          <Link
            to={loadoutDetailHref(locale, loadout.slug)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            {s.viewDetails}
          </Link>
        </div>
      </div>
    </article>
  );
}
