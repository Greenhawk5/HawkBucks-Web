import * as React from "react";
import { Link } from "@tanstack/react-router";
import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
import type { PublicHeroDetail } from "@/lib/cms/public-hero-detail.loader";
import { getHeroGraph } from "@/lib/cms/content-graph.server";
import { heroDetailHref } from "./HeroCard";
import { loadoutDetailHref } from "./LoadoutCard";
import { ContentGraph } from "./ContentGraphClient";
import { RarityBadge } from "./RarityBadge";
import { RelatedGuides } from "./RelatedGuides";

export function HeroDetail({
  hero,
  locale,
  backHref,
}: {
  hero: PublicHeroDetail;
  locale: string;
  backHref: string;
}) {
  const s = getPublicStrings(locale);
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link to={backHref} className="text-sm underline">
        ← {s.backToHeroes}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-extrabold">{hero.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <RarityBadge rarity={(hero as { rarity?: string | null }).rarity} />
      </div>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
        {s.classNameLabel}: {heroClassLabel(locale, hero.heroClass)}
        {hero.category ? ` · ${s.categoryLabel}: ${hero.category}` : ""}
      </p>
      {hero.imageUrl ? (
        <img src={hero.imageUrl} alt={hero.title} className="mt-4 w-full rounded-xl object-cover" />
      ) : null}
      {hero.description ? <p className="mt-4 leading-relaxed">{hero.description}</p> : null}
      {hero.abilities.length > 0 ? (
        <section className="mt-8" aria-label={s.abilities}>
          <h2 className="font-display text-xl font-bold">{s.abilities}</h2>
          <ul className="mt-3 space-y-3">
            {hero.abilities.map((a) => (
              <li key={a.key} className="rounded-xl border border-panel-border p-4">
                <h3 className="font-bold">{a.name}</h3>
                {a.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {hero.relatedLoadouts.length > 0 ? (
        <section className="mt-8" aria-label={s.relatedLoadouts}>
          <h2 className="font-display text-xl font-bold">{s.relatedLoadouts}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {hero.relatedLoadouts.map((l) => (
              <li key={l.contentId} className="rounded-xl border border-panel-border p-4">
                <Link
                  to={loadoutDetailHref(locale, l.slug)}
                  className="font-bold hover:text-primary"
                >
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <RelatedGuides entityContentId={hero.contentId} locale={locale} />
      <ContentGraph
        load={getHeroGraph}
        contentId={hero.contentId}
        locale={locale}
        title="Related loadouts & guides"
        testId="hero-content-graph"
      />
      <p className="mt-8 text-xs text-muted-foreground">{heroDetailHref(locale, hero.slug)}</p>
    </main>
  );
}
export function useX(): null {
  return React.useMemo(() => null, []);
}
