import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";

import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
import {
  heroLabels,
  categoryLabel,
  rarityLabel,
  tierCountLabel,
  formatNumber,
} from "@/lib/cms/hero-labels";
import { primaryRarity, sortRaritiesAsc } from "@/lib/cms/hero-reference";
import type { PublicHeroRarityProgress } from "@/lib/cms/hero-reference";
import { pickActiveSection, codexRangeText, heroPowerRange } from "@/lib/cms/hero-codex";
import type { PublicHeroDetail } from "@/lib/cms/public-hero-detail.loader";
import { getHeroGraph } from "@/lib/cms/content-graph.server";
import { heroDetailHref, loadoutDetailHref } from "./HeroCard";
import { ContentGraph } from "./ContentGraphClient";
import { RelatedGuides } from "./RelatedGuides";
import { RarityPill, MediaIcon, EmptyNote } from "@/components/heroes/HeroReferenceBits";
import { LocalizedTime } from "@/components/hawkbucks/LocalizedTime";
import { rarityShowcaseStyle } from "@/lib/cms/rarity-tokens";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Hero codex — presentation components used ONLY by the public hero detail
 * page (HeroDetail.tsx).
 *
 * The shared reference primitives (RarityPill, MediaIcon, EmptyNote) stay
 * untouched in HeroReferenceBits so the listing card and the
 * quick-view dialog cannot regress. Everything in this file is detail-page
 * specific: the identity header, the scroll-spy section nav, the perk /
 * ability / progression layouts, the facts rail and the related-heroes
 * discovery grid.
 *
 * RTL: directional properties are logical only (ms-/me-/ps-/pe-/start/end),
 * matching the convention enforced on the neighbouring reference files.
 */

export type CodexSectionId = "summary" | "perks" | "abilities" | "progression" | "related";

export interface CodexSectionLink {
  id: CodexSectionId;
  label: string;
}

/**
 * Distance from the viewport top at which a section counts as "current".
 * Top navbar (64px) + sticky section bar (~53px) + a little breathing room.
 */
const SPY_OFFSET = 136;

/**
 * Scroll-spy for the in-page section nav.
 *
 * Established-mechanism choice: a passive scroll listener with rAF
 * coalescing, the same approach as BackToTop — no IntersectionObserver
 * bookkeeping, no flicker around section boundaries (the last section at or
 * above the offset line wins; see pickActiveSection). Anchor clicks scroll
 * natively-aware (smooth unless reduced motion) and update the hash with
 * pushState, so there is no jump and no unrelated state reset.
 */
export function useCodexScrollSpy(ids: readonly CodexSectionId[]): {
  activeId: CodexSectionId | null;
  goTo: (id: CodexSectionId) => void;
} {
  const [activeId, setActiveId] = React.useState<CodexSectionId | null>(null);
  const lockUntil = React.useRef(0);
  const idsKey = ids.join("|");

  React.useEffect(() => {
    const list = idsKey.split("|").filter((v): v is CodexSectionId => v !== "");
    if (list.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      // A programmatic anchor scroll passes through intermediate sections;
      // hold the clicked target until the scroll settles instead of
      // flickering through every section on the way.
      if (Date.now() < lockUntil.current) return;
      const tops = list
        .map((id) => {
          const el = document.getElementById(id);
          return el ? { id, top: el.getBoundingClientRect().top } : null;
        })
        .filter((v): v is { id: CodexSectionId; top: number } => v !== null);
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActiveId(pickActiveSection(tops, SPY_OFFSET, nearBottom));
    };
    const onScroll = () => {
      if (raf !== 0) return;
      raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf !== 0) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [idsKey]);

  const goTo = React.useCallback((id: CodexSectionId) => {
    const el = document.getElementById(id);
    if (!el) return;
    lockUntil.current = Date.now() + 800;
    setActiveId(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.history.pushState(null, "", `#${id}`);
  }, []);

  return { activeId, goTo };
}

/**
 * Back navigation — a compact secondary control, not a call-to-action.
 * Destination and routing behaviour are unchanged; only the affordance is
 * designed (arrow mark, hover/focus/pressed states, subtle nudge).
 */
export function CodexBackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="group -ms-2 inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:text-foreground"
    >
      <ArrowLeft
        aria-hidden="true"
        className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 rtl:scale-x-[-1] rtl:group-hover:translate-x-0.5"
      />
      {label}
    </Link>
  );
}

/**
 * Hero identity header.
 *
 * Borderless portrait on a rarity-derived atmospheric glow, then rarity →
 * name → class (+ category) → short editorial tagline. No power/tier meta:
 * that lives in the progression section. The full description lives in the
 * Summary section, never here. The CMS banner slot is intentionally NOT
 * rendered: it has no user-facing meaning on the public page, and filling
 * the header's right edge with it is what produced the old layout's
 * unexplained second image. SEO/OG still uses bannerUrl (see the route
 * head), which is unaffected.
 */
export function CodexHeader({ hero, locale }: { hero: PublicHeroDetail; locale: string }) {
  const l = heroLabels(locale);
  const cat = categoryLabel(locale, hero.category);
  const summary = hero.summary.trim();
  const showcase = rarityShowcaseStyle(hero.rarity);

  return (
    <header className="relative overflow-hidden rounded-2xl border border-panel-border/60 bg-panel/50">
      {/* Atmospheric rarity glow: decorative, behind everything. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={showcase ?? {}}
      />
      <div className="relative grid items-center gap-6 p-5 sm:gap-8 sm:p-7 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:p-8">
        {/* Borderless portrait: native aspect kept, never cropped to fit. */}
        <div className="relative mx-auto w-full max-w-70 overflow-visible sm:max-w-80 md:max-w-none">
          {hero.imageUrl ? (
            <img
              src={hero.imageUrl}
              alt={`${hero.title} portrait`}
              fetchPriority="high"
              decoding="async"
              className="relative mx-auto aspect-square w-full object-contain object-top"
              style={{
                // Bottom-weighted feathered mask: the face and torso stay
                // fully opaque; only the lower silhouette dissolves into the
                // page background. No drop-shadow (a filtered shadow is drawn
                // from the unmasked box, which is what read as a rectangular
                // panel edge) and no blur, desaturation, or whole-image
                // opacity — the artwork itself is untouched.
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 0%, black 68%, rgba(0,0,0,0.55) 82%, transparent 97%)",
                maskImage:
                  "linear-gradient(to bottom, black 0%, black 68%, rgba(0,0,0,0.55) 82%, transparent 97%)",
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              className="grid aspect-square w-full place-items-center rounded-xl text-muted-foreground/40"
            >
              <Shield className="h-16 w-16" />
            </div>
          )}
        </div>

        <div className="min-w-0 text-center md:text-start">
          <RarityPill locale={locale} rarity={hero.rarity} />
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            {hero.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm md:justify-start">
            {hero.classIconUrl ? (
              <img
                src={hero.classIconUrl}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="h-5 w-5 shrink-0 rounded-sm object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <span className="font-semibold text-foreground/90">
              {heroClassLabel(locale, hero.heroClass)}
            </span>
            {cat ? (
              <>
                <span aria-hidden="true" className="text-muted-foreground/60">
                  {" · "}
                </span>
                <span className="text-muted-foreground">{cat}</span>
              </>
            ) : null}
          </p>
          {/* Short editorial tagline, verbatim from the loader. */}
          {summary !== "" ? (
            <p className="mt-3 text-[15px] leading-relaxed text-foreground/85">{summary}</p>
          ) : null}
          {hero.isLocaleFallback ? (
            <p
              data-testid="hero-locale-fallback"
              className="mt-2.5 max-w-xl rounded-md border border-panel-border/60 px-2 py-1 text-xs text-muted-foreground"
            >
              {l.localeFallbackNotice}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/**
 * Sticky, scroll-aware section navigator.
 *
 * A slim bar pinned under the app top navbar (top-16), horizontally
 * scrollable on narrow viewports so it never wraps into bulky rows or
 * overflows the page. Plain anchor links (real hrefs, real keyboard
 * behaviour); the active item is marked with aria-current and a primary
 * underline. A side rail was evaluated and rejected: inside the 1100px
 * AppShell with the global sidebar already present, a second rail would
 * squeeze the content column for no orientation benefit.
 */
/**
 * Sticky, scroll-aware section navigator — compact floating dock.
 *
 * Sprint 2 decision: a centered floating pill (Dynamic-Island language)
 * instead of the previous full-width rectangular bar. A vertical rail was
 * evaluated and rejected: inside the 1100px AppShell with the global sidebar
 * already present, a second rail would squeeze the content column for no
 * orientation benefit. The dock stays compact, centered, and visually quiet —
 * a small underline marks the active section.
 */
export function CodexSectionNav({
  locale,
  sections,
  activeId,
  onNavigate,
}: {
  locale: string;
  sections: readonly CodexSectionLink[];
  activeId: CodexSectionId | null;
  onNavigate: (id: CodexSectionId) => void;
}) {
  const l = heroLabels(locale);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Keep the active item in view inside the scrollable row. block:"nearest"
  // never moves the page itself while the stuck bar is on screen.
  React.useEffect(() => {
    if (!activeId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-section="${activeId}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  return (
    <div className="sticky top-18 z-20 flex justify-center">
      <nav
        aria-label={l.sectionNav}
        data-testid="hero-section-nav"
        className="max-w-full rounded-full border border-panel-border/60 bg-background/85 py-1.5 ps-1.5 pe-1.5 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md"
      >
        <div
          ref={listRef}
          className="flex max-w-full items-center gap-0.5 overflow-x-auto overflow-y-hidden pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {sections.map((sec) => {
            const active = sec.id === activeId;
            return (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                data-section={sec.id}
                aria-current={active ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(sec.id);
                }}
                className={cn(
                  "relative shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                  "active:scale-[0.97]",
                  active
                    ? "bg-primary/12 text-foreground"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                )}
              >
                {sec.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3.5 bottom-1 h-0.5 rounded-full bg-primary transition-opacity motion-reduce:transition-none",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** One codex section: heading owns the accessible name via aria-labelledby. */
export function CodexSection({
  id,
  title,
  children,
}: {
  id: CodexSectionId;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-32">
      <h2
        id={`${id}-heading`}
        className="border-b border-panel-border/60 pb-2 font-display text-xl font-bold tracking-tight"
      >
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Full hero description: the canonical long-form body from `description`
 * (cms_content_translations.body via the loader), verbatim, paragraphs
 * preserved. The short tagline lives in the header now and NEVER doubles here.
 * Uses the project's empty-content convention when nothing is authored.
 */
export function CodexSummary({ hero, locale }: { hero: PublicHeroDetail; locale: string }) {
  const paras = hero.description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
  if (paras.length === 0) return <EmptyNote>{heroLabels(locale).summaryEmpty}</EmptyNote>;
  return (
    <div className="max-w-[68ch] space-y-3 text-[15px] leading-relaxed text-foreground/85">
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

/**
 * Perks as a hairline-divided ledger, not a card stack: the name leads, the
 * slot (Standard / Commander) is secondary on the same baseline, and the full
 * description reads at a comfortable measure. Loader order is preserved
 * untouched (slot_order: standard before commander).
 */
export function CodexPerks({
  locale,
  perks,
}: {
  locale: string;
  perks: PublicHeroDetail["perks"];
}) {
  const l = heroLabels(locale);
  if (perks.length === 0) return <EmptyNote>{l.progressionEmpty}</EmptyNote>;
  return (
    <ul className="divide-y divide-panel-border/50">
      {perks.map((p) => (
        <li
          key={p.key}
          data-testid="hero-perk-row"
          data-slot={p.slot}
          className="flex gap-3.5 py-4 first:pt-0 last:pb-0"
        >
          <MediaIcon
            url={p.iconUrl}
            sizeClass="mt-0.5 h-10 w-10"
            fallbackText={p.name.slice(0, 2)}
          />
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-[15px] font-bold leading-snug">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                {p.slot === "commander" ? l.commanderPerk : l.standardPerk}
              </span>
            </p>
            {p.description ? (
              <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
                {p.description}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Abilities on a responsive one/two/three-column grid.
 *
 * Exactly three abilities share one balanced row on desktop: each tile takes
 * an equal third of the section width. Below the lg breakpoint the grid falls
 * back to two columns, then one on narrow mobile, so labels never cramp.
 * Icon and name share one visual centerline via items-center. Tiles are
 * informational list items, never buttons.
 */
export function CodexAbilities({
  locale,
  abilities,
}: {
  locale: string;
  abilities: PublicHeroDetail["abilities"];
}) {
  const l = heroLabels(locale);
  if (abilities.length === 0) return <EmptyNote>{l.abilities}</EmptyNote>;
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-2.5 sm:grid-cols-2",
        abilities.length === 3 ? "lg:grid-cols-3" : "",
      )}
    >
      {abilities.map((a) => (
        <li
          key={a.key}
          data-testid="hero-ability-row"
          className="flex min-w-0 items-center gap-2.5 rounded-xl border border-panel-border/60 bg-background/40 px-3 py-2.5"
        >
          <MediaIcon
            url={a.iconUrl}
            sizeClass="h-9 w-9 shrink-0"
            fallbackText={a.name.slice(0, 2)}
          />
          <div className="min-w-0">
            <p className="font-display text-sm font-bold leading-snug text-balance">{a.name}</p>
            {a.description ? (
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {a.description}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One resource entry: icon + prominent quantity + secondary name, kept together
 * as a compact inline chip that wraps inside its column. */
function ResourceLine({
  locale,
  iconUrl,
  amount,
  name,
}: {
  locale: string;
  iconUrl: string | null;
  amount: number;
  name: string;
}) {
  return (
    <span
      data-testid="hero-resource-cost"
      className="inline-flex min-w-0 max-w-full items-baseline gap-1.5 rounded-md bg-background/40 px-1.5 py-0.5 text-[13px]"
      title={`${name}: ${formatNumber(locale, amount)}`}
    >
      <MediaIcon url={iconUrl} sizeClass="h-4 w-4 translate-y-[3px] shrink-0" />
      <span className="font-semibold tabular-nums whitespace-nowrap">
        {formatNumber(locale, amount)}
      </span>
      <span className="min-w-0 truncate text-muted-foreground">{name}</span>
    </span>
  );
}

/**
 * Centered two-column resource grid for the desktop `Evolve to Next` cell.
 *
 * The grid as a whole is centered (capped width + auto margins) while every
 * entry stays left-aligned inside its own column. Equal `1fr` columns give
 * identical widths across all tiers; row-major placement keeps the loader's
 * exact resource order. The table wrapper already scrolls horizontally, so
 * the grid can never push the page itself into overflow.
 */
function ResourceGrid({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mx-auto grid w-full max-w-[26rem] grid-cols-2 gap-x-2 gap-y-1.5">{children}</ul>
  );
}

function TierTable({ locale, block }: { locale: string; block: PublicHeroRarityProgress }) {
  const l = heroLabels(locale);
  const rarityName = rarityLabel(locale, block.rarity) ?? block.rarity;
  const cell = "px-2.5 py-1.5 align-middle";
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-panel-border/60 sm:block">
      <table data-testid="hero-tier-table" className="w-full border-collapse text-sm">
        <caption className="sr-only">
          {l.progression} — {rarityName}
        </caption>
        <thead>
          <tr className="border-b border-panel-border/70 bg-background/40 text-center">
            <th
              scope="col"
              className="w-12 px-2.5 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:ps-3"
            >
              {l.tier}
            </th>
            <th
              scope="col"
              className="w-24 px-2.5 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {l.power}
            </th>
            <th
              scope="col"
              className="w-24 px-2.5 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {l.level}
            </th>
            <th
              scope="col"
              className="px-2.5 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground last:pe-3"
            >
              {l.evolveToNext}
            </th>
          </tr>
        </thead>
        <tbody>
          {block.tiers.map((tier) => (
            <tr key={tier.tier} className="border-b border-panel-border/40 last:border-b-0">
              <td className={`${cell} ps-3 text-center font-semibold tabular-nums`}>{tier.tier}</td>
              <td className={`${cell} text-center whitespace-nowrap tabular-nums`}>
                {codexRangeText(locale, tier.powerMin, tier.powerMax)}
              </td>
              <td className={`${cell} text-center whitespace-nowrap tabular-nums`}>
                {codexRangeText(locale, tier.levelMin, tier.levelMax)}
              </td>
              <td className={`${cell} pe-3`}>
                {tier.evolve.length > 0 ? (
                  // Centered two-column grid, entries left-aligned per cell:
                  // the grid sits centered under the heading, both columns
                  // share a stable width, and each chip keeps its icon +
                  // quantity + name together in loader order.
                  <ResourceGrid>
                    {tier.evolve.map((c) => (
                      <li key={`${tier.tier}-${c.resourceKey}`} className="min-w-0">
                        <ResourceLine
                          locale={locale}
                          iconUrl={c.iconUrl}
                          amount={c.amount}
                          name={c.name}
                        />
                      </li>
                    ))}
                  </ResourceGrid>
                ) : (
                  <span className="block text-center text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TierCards({ locale, block }: { locale: string; block: PublicHeroRarityProgress }) {
  const l = heroLabels(locale);
  return (
    <ul data-testid="hero-tier-list" className="space-y-2 sm:hidden">
      {block.tiers.map((tier) => (
        <li
          key={tier.tier}
          className="rounded-xl border border-panel-border/60 bg-background/40 px-3 py-2.5"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-bold">
              {l.tier} {tier.tier}
            </span>
            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {codexRangeText(locale, tier.powerMin, tier.powerMax)} · {l.level}{" "}
              {codexRangeText(locale, tier.levelMin, tier.levelMax)}
            </span>
          </div>
          {tier.evolve.length > 0 ? (
            <ul className="mt-1.5 flex flex-wrap gap-1.5 border-t border-panel-border/50 pt-2 text-[13px]">
              {tier.evolve.map((c) => (
                <li key={`${tier.tier}-${c.resourceKey}`} className="min-w-0">
                  <ResourceLine
                    locale={locale}
                    iconUrl={c.iconUrl}
                    amount={c.amount}
                    name={c.name}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Evolution & progression.
 *
 * Rarity selection uses the project's Radix tabs (correct tab semantics and
 * arrow-key support included) because costs genuinely differ per rarity; the
 * selected block's tiers, totals and recycling figures all come from that one
 * loader block, never recalculated. The desktop table keeps every numeric
 * range on one line; narrow viewports get one tier card per tier instead of a
 * squeezed table. Totals and recycling reuse the loader's exact arrays
 * rendered through the local compact ResourceLine entries.
 */
export function CodexProgression({ locale, hero }: { locale: string; hero: PublicHeroDetail }) {
  const l = heroLabels(locale);
  const prog = hero.progression;
  const rarityNames = prog ? sortRaritiesAsc(prog.rarities.map((r) => r.rarity)) : [];
  const [activeRarity, setActiveRarity] = React.useState<string | null>(null);
  const selectedRarity =
    activeRarity && rarityNames.includes(activeRarity)
      ? activeRarity
      : (primaryRarity(rarityNames, hero.rarity) ?? rarityNames[0] ?? null);
  const rarityBlock = prog?.rarities.find((r) => r.rarity === selectedRarity) ?? null;

  if (!prog || rarityNames.length === 0 || !rarityBlock || !selectedRarity) {
    return <EmptyNote>{l.progressionEmpty}</EmptyNote>;
  }

  const table = (
    <>
      <TierTable locale={locale} block={rarityBlock} />
      <TierCards locale={locale} block={rarityBlock} />
      {rarityBlock.total.length > 0 ? (
        <div className="mt-4 border-t border-panel-border/60 pt-3">
          <h3 className="text-sm font-bold">{l.totalToMax}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{l.evolveToMax}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {rarityBlock.total.map((c) => (
              <li key={c.resourceKey} className="min-w-0">
                <ResourceLine locale={locale} iconUrl={c.iconUrl} amount={c.amount} name={c.name} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {rarityBlock.recycle.length > 0 ? (
        <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wide">{l.recyclingReturns}</span>
          {rarityBlock.recycle.map((c) => (
            <span key={c.resourceKey} className="inline-flex items-baseline gap-1.5">
              <MediaIcon url={c.iconUrl} sizeClass="h-4 w-4 translate-y-[3px] shrink-0" />
              <span className="font-semibold tabular-nums text-foreground">
                {formatNumber(locale, c.amount)}
              </span>
              <span>{c.name}</span>
            </span>
          ))}
        </p>
      ) : null}
    </>
  );

  if (rarityNames.length < 2) return table;

  return (
    <Tabs value={selectedRarity} onValueChange={setActiveRarity}>
      <TabsList
        aria-label={l.rarity}
        className="mb-4 border border-panel-border/60 bg-background/40"
      >
        {rarityNames.map((r) => (
          <TabsTrigger
            key={r}
            value={r}
            className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            {rarityLabel(locale, r) ?? r}
          </TabsTrigger>
        ))}
      </TabsList>
      {rarityNames.map((r) => (
        <TabsContent key={r} value={r} className="mt-0">
          {r === selectedRarity ? table : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** One facts row: muted label, end-aligned value. The grid keeps every row
 * inside the rail at long locales: the label wraps instead of forcing the
 * panel wider, and the value wraps (never truncates dates) or stacks below
 * the label on very narrow rails. */
function FactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] items-baseline gap-x-3 gap-y-0.5 border-b border-panel-border/40 py-2 last:border-b-0 max-[420px]:grid-cols-1 max-[420px]:gap-y-1">
      <dt className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground break-words">
        {label}
      </dt>
      <dd className="min-w-0 text-start text-[13px] font-medium leading-snug break-words [overflow-wrap:anywhere] sm:text-end [&>*]:max-w-full [&>*]:break-words">
        {children}
      </dd>
    </div>
  );
}

/**
 * Facts rail — quick-reference metadata only.
 *
 * Sprint 2: the Last Updated row shows hero.lastUpdated (manual override when
 * set, else the automatic stamp from the latest successful hero-scoped CMS
 * save). Missing/legacy values omit the row — never a fabricated date. The
 * date renders through LocalizedTime so it is locale-formatted and
 * hydration-safe. On desktop the rail sticks below the section dock; on
 * mobile it drops to the end of the reading flow.
 */
export function CodexFacts({ hero, locale }: { hero: PublicHeroDetail; locale: string }) {
  const s = getPublicStrings(locale);
  const l = heroLabels(locale);
  const cat = categoryLabel(locale, hero.category);
  const powerRange = heroPowerRange(locale, hero.progression);
  const tierText = hero.progression?.tierCount
    ? tierCountLabel(locale, hero.progression.tierCount)
    : null;

  return (
    <aside aria-label={l.heroFacts} className="w-full shrink-0 lg:w-60">
      <div className="lg:sticky lg:top-32">
        <dl className="rounded-xl border border-panel-border/60 bg-background/40 px-3.5 py-1.5">
          <FactRow label={s.classNameLabel}>
            <span className="inline-flex items-center justify-end gap-1.5">
              {hero.classIconUrl ? (
                <img
                  src={hero.classIconUrl}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  className="h-4 w-4 shrink-0 rounded-sm object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              <span>{heroClassLabel(locale, hero.heroClass)}</span>
            </span>
          </FactRow>
          {cat ? <FactRow label={l.category}>{cat}</FactRow> : null}
          <FactRow label={l.rarity}>{rarityLabel(locale, hero.rarity)}</FactRow>
          {powerRange ? (
            <FactRow label={l.maxPower}>
              <span className="tabular-nums">{powerRange}</span>
            </FactRow>
          ) : null}
          {tierText ? <FactRow label={l.tierCount}>{tierText}</FactRow> : null}
          {hero.abilities.length > 0 ? (
            <FactRow label={l.abilities}>
              <span className="tabular-nums">{hero.abilities.length}</span>
            </FactRow>
          ) : null}
          {hero.lastUpdated ? (
            <FactRow label={l.lastUpdated}>
              <LocalizedTime
                value={hero.lastUpdated}
                kind="date"
                locale={locale}
                className="tabular-nums"
              />
            </FactRow>
          ) : null}
        </dl>
      </div>
    </aside>
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

/**
 * Related heroes — discovery, subordinate to the current hero.
 *
 * Loader grouping, ordering and destinations are preserved untouched. Every
 * card is one link (portrait, name, class + standard perk), equal heights via
 * the auto-fill grid, restrained hover/focus treatment. Empty groups render
 * nothing; a fully empty relation set renders the standard empty note while
 * the guides/graph rails below still show.
 */
export function CodexRelated({ hero, locale }: { hero: PublicHeroDetail; locale: string }) {
  const s = getPublicStrings(locale);
  const l = heroLabels(locale);
  const groups = hero.relatedHeroes.filter((g) => g.heroes.length > 0);

  return (
    <div className="space-y-6">
      {groups.length === 0 && hero.relatedLoadouts.length === 0 ? (
        <EmptyNote>{l.relatedEmpty}</EmptyNote>
      ) : null}

      {groups.map((group) => (
        <div key={group.kind}>
          <h3 className="mb-2.5 text-sm font-bold">{relatedGroupLabel(locale, group.kind)}</h3>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-2">
            {group.heroes.map((h) => (
              <li key={h.contentId} className="min-w-0">
                <Link
                  to={heroDetailHref(locale, h.slug)}
                  data-testid="hero-related-card"
                  className="flex h-full min-w-0 items-center gap-2.5 rounded-xl border border-panel-border/50 bg-background/30 py-2 pe-3 ps-2 outline-none transition-colors hover:border-primary/50 hover:bg-background/50 focus-visible:ring-2 focus-visible:ring-ring active:bg-background/60"
                >
                  {h.imageUrl ? (
                    <img
                      src={h.imageUrl}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-11 shrink-0 rounded-md bg-panel object-cover object-top"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid h-14 w-11 shrink-0 place-items-center rounded-md bg-background/40 text-muted-foreground/50"
                    >
                      <Shield className="h-5 w-5" />
                    </span>
                  )}
                  <span className="min-w-0 py-0.5">
                    <span
                      className="block truncate font-display text-[13px] font-bold leading-snug"
                      title={h.title}
                    >
                      {h.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs leading-snug text-muted-foreground">
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

      {hero.relatedLoadouts.length > 0 ? (
        <div>
          <h3 className="mb-2.5 text-sm font-bold">{s.relatedLoadouts}</h3>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-2.5">
            {hero.relatedLoadouts.map((ld) => (
              <li key={ld.contentId}>
                <Link
                  to={loadoutDetailHref(locale, ld.slug)}
                  className="flex h-full items-center gap-3 rounded-xl border border-panel-border/60 bg-background/40 p-2.5 outline-none transition-colors hover:border-primary/60 hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {ld.imageUrl ? (
                    <img
                      src={ld.imageUrl}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      className="h-12 w-12 shrink-0 rounded-lg border border-panel-border/50 object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-panel-border/50 bg-background/40 text-muted-foreground/50"
                    >
                      <Shield className="h-5 w-5" />
                    </span>
                  )}
                  <span className="min-w-0 truncate text-sm font-semibold">{ld.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-4">
        <RelatedGuides entityContentId={hero.contentId} locale={locale} />
        <ContentGraph
          load={getHeroGraph}
          contentId={hero.contentId}
          locale={locale}
          title={s.relatedLoadouts}
          testId="hero-content-graph"
        />
      </div>
    </div>
  );
}
