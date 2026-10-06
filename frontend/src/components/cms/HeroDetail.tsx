import * as React from "react";
import { Link } from "@tanstack/react-router";

import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
import {
  heroLabels,
  categoryLabel,
  rarityLabel,
  tierCountLabel,
  powerRangeLabelText,
  formatNumber,
} from "@/lib/cms/hero-labels";
import { primaryRarity, sortRaritiesAsc, sumAmounts } from "@/lib/cms/hero-reference";
import type { PublicHeroDetail } from "@/lib/cms/public-hero-detail.loader";
import { getHeroGraph } from "@/lib/cms/content-graph.server";
import { heroDetailHref, loadoutDetailHref } from "./HeroCard";
import { ContentGraph } from "./ContentGraphClient";
import { RelatedGuides } from "./RelatedGuides";
import {
  RarityPill,
  HeroClassification,
  PerkRow,
  AbilityRow,
  ResourceCostChip,
  MetaPair,
  EmptyNote,
  MetaChip2,
} from "@/components/heroes/HeroReferenceBits";
import { cn } from "@/lib/utils";

/**
 * Hero detail — a reference entry, not a marketing landing page.
 *
 * Three zones: a wide content column, an in-page section nav, and a sticky
 * metadata rail. Rarity tabs drive the progression table because evolution costs
 * genuinely differ per rarity; everything above the fold is identity,
 * classification and perks, so the fold is never spent on artwork.
 *
 * The old page had `useX()` (dead) and printed its own route at the bottom;
 * both are gone.
 */
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
  const l = heroLabels(locale);

  const prog = hero.progression;
  const rarityNames = prog ? sortRaritiesAsc(prog.rarities.map((r) => r.rarity)) : [];
  const [activeRarity, setActiveRarity] = React.useState<string | null>(null);
  const selectedRarity =
    activeRarity && rarityNames.includes(activeRarity)
      ? activeRarity
      : (primaryRarity(rarityNames, hero.rarity) ?? rarityNames[0] ?? null);
  const rarityBlock = prog?.rarities.find((r) => r.rarity === selectedRarity) ?? null;

  const sections = React.useMemo(
    () =>
      [
        { id: "identity", label: s.classNameLabel },
        { id: "perks", label: l.perks },
        { id: "abilities", label: l.abilities },
        { id: "progression", label: l.progression },
        { id: "related", label: l.relatedHeroes },
      ] as const,
    [s.classNameLabel, l.perks, l.abilities, l.progression, l.relatedHeroes],
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Link
        to={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
      >
        ← {s.backToHeroes}
      </Link>

      {/* ---- identity zone: the only above-the-fold content ---- */}
      <header id="identity" className="mt-4 scroll-mt-24">
        <div className="flex flex-col gap-5 lg:flex-row">
          {hero.imageUrl ? (
            <img
              src={hero.imageUrl}
              alt={hero.title}
              className="h-40 w-40 shrink-0 rounded-xl border border-panel-border/60 bg-background/40 object-cover object-top lg:h-56 lg:w-56"
              fetchPriority="high"
              decoding="async"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-extrabold tracking-tight lg:text-4xl">
              {hero.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <HeroClassification
                locale={locale}
                heroClass={hero.heroClass}
                category={hero.category}
              />
              <RarityPill locale={locale} rarity={hero.rarity} />
              {prog?.tierCount ? (
                <MetaChip2>{tierCountLabel(locale, prog.tierCount)}</MetaChip2>
              ) : null}
            </div>
            {hero.summary ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {hero.summary}
              </p>
            ) : null}
            {hero.isLocaleFallback ? (
              <p
                data-testid="hero-locale-fallback"
                className="mt-2 rounded-md border border-panel-border/60 px-2 py-1 text-xs text-muted-foreground"
              >
                {l.localeFallbackNotice}
              </p>
            ) : null}
          </div>
          {/* Banner is only rendered when an editor actually set one. */}
          {hero.bannerUrl ? (
            <img
              src={hero.bannerUrl}
              alt=""
              aria-hidden="true"
              className="hidden h-24 w-56 shrink-0 rounded-lg border border-panel-border/50 object-cover lg:block"
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        {/* ---- content column ---- */}
        <div className="min-w-0 flex-1">
          {/* Section nav */}
          <nav
            aria-label={l.summary}
            className="sticky top-16 z-20 mb-6 -mx-1 flex gap-1 overflow-x-auto border-b border-panel-border/60 px-1 py-2"
          >
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
              >
                {sec.label}
              </a>
            ))}
          </nav>

          {/* Perks */}
          <Section id="perks" title={l.perks}>
            {hero.perks.length > 0 ? (
              <ul>
                {hero.perks.map((p) => (
                  <PerkRow key={p.key} locale={locale} perk={p} />
                ))}
              </ul>
            ) : (
              <EmptyNote>{l.progressionEmpty}</EmptyNote>
            )}
          </Section>

          {/* Abilities */}
          <Section id="abilities" title={l.abilities}>
            {hero.abilities.length > 0 ? (
              <ul className="grid gap-x-6 sm:grid-cols-2">
                {hero.abilities.map((a) => (
                  <AbilityRow key={a.key} ability={a} />
                ))}
              </ul>
            ) : (
              <EmptyNote>{l.abilities}</EmptyNote>
            )}
          </Section>

          {/* Progression */}
          <Section id="progression" title={l.progression}>
            {prog && rarityNames.length > 0 && rarityBlock ? (
              <>
                {/* Rarity tabs: costs genuinely differ per rarity. */}
                {rarityNames.length > 1 ? (
                  <div role="tablist" aria-label={l.rarity} className="mb-3 flex flex-wrap gap-1">
                    {rarityNames.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="tab"
                        aria-selected={r === selectedRarity}
                        onClick={() => setActiveRarity(r)}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                          r === selectedRarity
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-panel-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {rarityLabel(locale, r) ?? r}
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* Dense tier table. Mobile transposes: a 4-column table at 375px
                    is unreadable, so each tier becomes its own block. */}
                <div className="hidden overflow-x-auto sm:block">
                  <table data-testid="hero-tier-table" className="w-full border-collapse text-sm">
                    <caption className="sr-only">
                      {l.progression} —{" "}
                      {rarityLabel(locale, rarityBlock.rarity) ?? rarityBlock.rarity}
                    </caption>
                    <thead>
                      <tr className="border-b border-panel-border/70 text-start">
                        <th
                          scope="col"
                          className="py-1.5 pe-3 text-start text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {l.tier}
                        </th>
                        <th
                          scope="col"
                          className="py-1.5 pe-3 text-start text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {l.power}
                        </th>
                        <th
                          scope="col"
                          className="py-1.5 pe-3 text-start text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {l.level}
                        </th>
                        <th
                          scope="col"
                          className="py-1.5 text-start text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {l.evolveToNext}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rarityBlock.tiers.map((tier) => (
                        <tr
                          key={tier.tier}
                          className="border-b border-panel-border/40 last:border-b-0"
                        >
                          <td className="py-2 pe-3 align-top font-semibold tabular-nums">
                            {tier.tier}
                          </td>
                          <td className="py-2 pe-3 align-top tabular-nums">
                            {tier.powerMin !== null || tier.powerMax !== null
                              ? `${formatNumber(locale, tier.powerMin)}-${formatNumber(locale, tier.powerMax)}`
                              : "—"}
                          </td>
                          <td className="py-2 pe-3 align-top tabular-nums">
                            {tier.levelMin !== null || tier.levelMax !== null
                              ? `${tier.levelMin}-${tier.levelMax}`
                              : "—"}
                          </td>
                          <td className="py-2 align-top">
                            {tier.evolve.length > 0 ? (
                              <ul className="flex flex-wrap gap-1">
                                {tier.evolve.map((c) => (
                                  <li key={`${tier.tier}-${c.resourceKey}`}>
                                    <ResourceCostChip locale={locale} cost={c} />
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: one block per tier */}
                <ul data-testid="hero-tier-list" className="space-y-2 sm:hidden">
                  {rarityBlock.tiers.map((tier) => (
                    <li key={tier.tier} className="rounded-md border border-panel-border/60 p-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold uppercase tracking-wide">
                          {l.tier} {tier.tier}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {tier.powerMin !== null || tier.powerMax !== null
                            ? `${formatNumber(locale, tier.powerMin)}-${formatNumber(locale, tier.powerMax)}`
                            : ""}
                        </span>
                      </div>
                      {tier.evolve.length > 0 ? (
                        <ul className="mt-1.5 flex flex-wrap gap-1">
                          {tier.evolve.map((c) => (
                            <li key={`${tier.tier}-${c.resourceKey}`}>
                              <ResourceCostChip locale={locale} cost={c} />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>

                {/* Totals */}
                {rarityBlock.total.length > 0 ? (
                  <div className="mt-4 rounded-md border border-panel-border/60 p-3">
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {l.totalToMax}
                    </h3>
                    <ul className="flex flex-wrap gap-1.5">
                      {rarityBlock.total.map((c) => (
                        <li key={c.resourceKey}>
                          <ResourceCostChip locale={locale} cost={c} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {rarityBlock.recycle.length > 0 ? (
                  <div className="mt-3 rounded-md border border-panel-border/60 p-3">
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {l.recyclingReturns}
                    </h3>
                    <ul className="flex flex-wrap gap-1.5">
                      {rarityBlock.recycle.map((c) => (
                        <li key={`${c.resourceKey}-${c.amount}`}>
                          <ResourceCostChip locale={locale} cost={c} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyNote>{l.progressionEmpty}</EmptyNote>
            )}
          </Section>

          {/* Related */}
          <Section id="related" title={l.relatedHeroes}>
            {hero.relatedHeroes.length > 0 ? (
              <div className="space-y-5">
                {hero.relatedHeroes.map((group) => (
                  <div key={group.kind}>
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {relatedGroupLabel(locale, group.kind)}
                    </h3>
                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-2">
                      {group.heroes.map((h) => (
                        <li key={h.contentId}>
                          <Link
                            to={heroDetailHref(locale, h.slug)}
                            data-testid="hero-related-card"
                            className="flex items-center gap-2 rounded-md border border-panel-border/60 p-2 transition-colors hover:border-primary/60"
                          >
                            {h.imageUrl ? (
                              <img
                                src={h.imageUrl}
                                alt=""
                                aria-hidden="true"
                                className="h-9 w-9 shrink-0 rounded border border-panel-border/50 object-cover object-top"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : null}
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold">
                                {h.title}
                              </span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {heroClassLabel(locale, h.heroClass)}
                                {h.standardPerkName ? ` · ${h.standardPerkName}` : ""}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyNote>{l.relatedEmpty}</EmptyNote>
            )}

            {hero.relatedLoadouts.length > 0 ? (
              <div className="mt-5">
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {s.relatedLoadouts}
                </h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {hero.relatedLoadouts.map((ld) => (
                    <li key={ld.contentId}>
                      <Link
                        to={loadoutDetailHref(locale, ld.slug)}
                        className="flex items-center gap-2 rounded-md border border-panel-border/60 p-2 text-sm font-medium hover:border-primary/60 hover:text-primary"
                      >
                        {ld.imageUrl ? (
                          <img
                            src={ld.imageUrl}
                            alt=""
                            aria-hidden="true"
                            className="h-9 w-9 shrink-0 rounded border border-panel-border/50 object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                        <span className="min-w-0 truncate">{ld.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              <RelatedGuides entityContentId={hero.contentId} locale={locale} />
              <ContentGraph
                load={getHeroGraph}
                contentId={hero.contentId}
                locale={locale}
                title={s.relatedLoadouts}
                testId="hero-content-graph"
              />
            </div>
          </Section>

          {/* Long-form editorial body, last: it is supporting prose, not data. */}
          {hero.description ? (
            <section
              aria-label={s.heroesTitle}
              className="mt-8 border-t border-panel-border/60 pt-6"
            >
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {l.summary}
              </h2>
              <div className="max-w-2xl space-y-3 leading-relaxed">
                {hero.description.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* ---- metadata rail ---- */}
        <aside className="w-full shrink-0 lg:w-64" aria-label={l.summary}>
          <div className="lg:sticky lg:top-24">
            <dl className="rounded-lg border border-panel-border/60 p-3">
              <MetaPair label={s.classNameLabel} value={heroClassLabel(locale, hero.heroClass)} />
              <MetaPair label={l.category} value={categoryLabel(locale, hero.category)} />
              <MetaPair label={l.rarity} value={rarityLabel(locale, hero.rarity)} />
              <MetaPair
                label={l.maxPower}
                value={
                  prog?.maxPower !== null && prog?.maxPower !== undefined
                    ? powerRangeLabelText(locale, prog.maxPower, prog.maxPower)
                    : null
                }
              />
              <MetaPair
                label={l.tierCount}
                value={prog?.tierCount ? tierCountLabel(locale, prog.tierCount) : null}
              />
              <MetaPair
                label={l.abilities}
                value={hero.abilities.length > 0 ? String(hero.abilities.length) : null}
              />
              <MetaPair
                label="Slug"
                value={<span className="font-mono text-xs">{hero.slug}</span>}
              />
            </dl>

            {hero.dataSource === "stw-sync" ? (
              <p className="mt-3 rounded-md border border-dashed border-panel-border/60 px-2 py-1.5 text-[11px] text-muted-foreground">
                {l.referenceSynced}
                {hero.dataSnapshotAt ? (
                  <span className="mt-0.5 block font-mono text-[10px] opacity-70">
                    {hero.dataSnapshotAt.slice(0, 10)}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-label={title} className="mb-8 scroll-mt-24 last:mb-0">
      <h2 className="mb-2 border-b border-panel-border/60 pb-1.5 font-display text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function relatedGroupLabel(locale: string, kind: string): string {
  const l = heroLabels(locale);
  switch (kind) {
    case "curated":
      return l.relatedCurated;
    case "same_category":
      return l.relatedSameCategory;
    case "same_perk":
      return l.relatedSamePerk;
    case "same_ability":
      return l.relatedSameAbility;
    case "same_class":
      return l.relatedSameClass;
    default:
      return l.relatedHeroes;
  }
}

export { sumAmounts };
