import { Link } from "@tanstack/react-router";
import { getPublicStrings } from "@/lib/cms/public-strings";
import type { PublicLoadoutDetail } from "@/lib/cms/public-loadout-detail.loader";
import type { PublicHeroItem } from "@/lib/cms/public.loader";
import { heroDetailHref } from "./HeroCard";

function SlotCard({
  hero,
  locale,
  label,
  emptyLabel,
}: {
  hero: PublicHeroItem | null;
  locale: string;
  label: string;
  emptyLabel: string;
}) {
  if (!hero) {
    return (
      <div
        className="rounded-xl border border-dashed border-panel-border p-4 text-center"
        data-testid="empty-support-slot"
      >
        <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-panel-border p-4" data-testid="filled-support-slot">
      <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
      <Link
        to={heroDetailHref(locale, hero.slug)}
        className="mt-1 block font-bold hover:text-primary"
      >
        {hero.title}
      </Link>
    </div>
  );
}

export function LoadoutDetail({
  loadout,
  locale,
  backHref,
}: {
  loadout: PublicLoadoutDetail;
  locale: string;
  backHref: string;
}) {
  const s = getPublicStrings(locale);
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link to={backHref} className="text-sm underline">
        ← {s.backToLoadouts}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-extrabold">{loadout.title}</h1>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
        {loadout.loadoutType}
      </p>
      {loadout.imageUrl ? (
        <img
          src={loadout.imageUrl}
          alt={loadout.title}
          className="mt-4 w-full rounded-xl object-cover"
        />
      ) : null}
      {loadout.description ? <p className="mt-4 leading-relaxed">{loadout.description}</p> : null}
      <section className="mt-8" aria-label={s.commander}>
        <h2 className="font-display text-xl font-bold">{s.commander}</h2>
        <div className="mt-3">
          <SlotCard
            hero={loadout.commander}
            locale={locale}
            label={s.commander}
            emptyLabel={s.emptySlot}
          />
        </div>
      </section>
      <section className="mt-8" aria-label={s.supportTeam}>
        <h2 className="font-display text-xl font-bold">{s.supportTeam}</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2">
          {loadout.support.map((hero, i) => (
            <li key={i} data-testid={`support-slot-${i + 1}`}>
              <SlotCard
                hero={hero}
                locale={locale}
                label={`${s.supportSlot} ${i + 1}`}
                emptyLabel={s.emptySlot}
              />
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
