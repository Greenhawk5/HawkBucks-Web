import { Link } from "@tanstack/react-router";
import { heroClassLabel, getPublicStrings } from "@/lib/cms/public-strings";
import type { PublicHeroItem } from "@/lib/cms/public.loader";

export function heroDetailHref(locale: string, slug: string): string {
  return locale === "en" ? `/heroes/${slug}` : `/${locale}/heroes/${slug}`;
}
export function loadoutDetailHref(locale: string, slug: string): string {
  return locale === "en" ? `/loadouts/${slug}` : `/${locale}/loadouts/${slug}`;
}

export function HeroCard({
  hero,
  locale,
  onPreview,
}: {
  hero: PublicHeroItem;
  locale: string;
  onPreview?: (hero: PublicHeroItem) => void;
}) {
  const s = getPublicStrings(locale);
  return (
    <article
      className="overflow-hidden rounded-xl border border-panel-border bg-background/40 transition-all hover:-translate-y-0.5 hover:border-primary"
      data-testid="hero-card"
    >
      {hero.imageUrl ? (
        <img
          src={hero.imageUrl}
          alt={hero.title}
          className="aspect-[4/3] w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="grid aspect-[4/3] w-full place-items-center bg-muted text-4xl"
          aria-hidden="true"
        >
          🛡️
        </div>
      )}
      <div className="p-4">
        <h3 className="font-display text-base font-bold">
          <Link
            to={heroDetailHref(locale, hero.slug)}
            className="rounded outline-none focus-visible:ring-2 focus-visible:ring-ring hover:text-primary"
          >
            {hero.title}
          </Link>
        </h3>
        <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
          {s.classNameLabel}: {heroClassLabel(locale, hero.heroClass)}
          {hero.category ? ` · ${hero.category}` : ""}
        </p>
        {hero.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {hero.description.slice(0, 140)}
          </p>
        ) : null}
        <div className="mt-3 flex gap-2">
          <Link
            to={heroDetailHref(locale, hero.slug)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            {s.viewDetails}
          </Link>
          {onPreview ? (
            <button
              type="button"
              onClick={() => onPreview(hero)}
              className="rounded-lg border border-panel-border px-3 py-1.5 text-xs font-semibold hover:border-primary"
              aria-haspopup="dialog"
            >
              {s.openPreview}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
