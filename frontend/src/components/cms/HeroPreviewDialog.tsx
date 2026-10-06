import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Shield } from "lucide-react";

import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
import {
  heroLabels,
  categoryLabel,
  tierCountLabel,
  powerRangeLabelText,
} from "@/lib/cms/hero-labels";
import { getHeroQuickView, type PublicHeroQuickView } from "@/lib/cms/public-hero-quickview.loader";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  HeroClassification,
  PerkRow,
  AbilityRow,
  ResourceCostChip,
  EmptyNote,
} from "@/components/heroes/HeroReferenceBits";
import { heroDetailHref } from "./HeroCard";
import { cn } from "@/lib/utils";

/** What the listing already knows about a hero, so the dialog can render instantly. */
export interface HeroPreviewSeed {
  slug: string;
  title: string;
  heroClass: string;
  category?: string | null;
  rarity?: string | null;
}

/**
 * Hero quick view.
 *
 * Answers "what is this hero and what do they do" in one glance, then hands off
 * to the full page. It deliberately does NOT restate the long description: the
 * old dialog rendered `body.slice(0, 600)`, which duplicated the detail page
 * while still missing every piece of structured data.
 *
 * The payload is fetched LAZILY on open. The listing card cannot carry it - that
 * would mean loading perks, abilities and progression for all 24 cards on the
 * page - and the dialog is where that data is actually wanted.
 */
export function HeroPreviewDialog({
  hero,
  locale,
  onClose,
}: {
  hero: HeroPreviewSeed | null;
  locale: string;
  onClose: () => void;
}) {
  const s = getPublicStrings(locale);
  const l = heroLabels(locale);
  const [data, setData] = React.useState<PublicHeroQuickView | null>(null);
  const [state, setState] = React.useState<"idle" | "loading" | "ready" | "error">("idle");

  // Reset on every open so a previously viewed hero never flashes in place of
  // the new one.
  React.useEffect(() => {
    if (!hero) {
      setData(null);
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    setData(null);
    getHeroQuickView({ data: { locale, slug: hero.slug } })
      .then((res) => {
        if (cancelled) return;
        setData(res.hero);
        setState(res.hero ? "ready" : "error");
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [hero?.slug, locale]);

  const rarity = data?.rarity ?? hero?.rarity ?? null;
  const heroClass = data?.heroClass ?? hero?.heroClass ?? "";
  const category = data?.category ?? hero?.category ?? null;
  const title = data?.title ?? hero?.title ?? "";

  return (
    <Dialog
      open={hero !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        data-testid="hero-preview-dialog"
        aria-describedby="hero-preview-summary"
      >
        <DialogTitle className="font-display text-xl font-bold">{title}</DialogTitle>
        <DialogDescription id="hero-preview-summary" className="text-xs text-muted-foreground">
          {s.classNameLabel}: {heroClassLabel(locale, heroClass)}
          {categoryLabel(locale, category) ? ` · ${categoryLabel(locale, category)}` : ""}
        </DialogDescription>

        {state === "loading" ? (
          <div
            className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {l.loading}
          </div>
        ) : null}

        {state === "error" ? (
          <div className="mt-4">
            <EmptyNote>{l.loadError}</EmptyNote>
            <QuickViewFooter locale={locale} slug={hero?.slug ?? ""} label={s.viewDetails} />
          </div>
        ) : null}

        {state === "ready" && data ? (
          <div className="mt-4 space-y-4">
            {/* Identity strip */}
            <div className="flex gap-3">
              {data.imageUrl ? (
                <img
                  src={data.imageUrl}
                  alt={data.title}
                  className="h-24 w-24 shrink-0 rounded-lg border border-panel-border/60 object-cover object-top"
                  decoding="async"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="grid h-24 w-24 shrink-0 place-items-center rounded-lg border border-panel-border/60 bg-muted/30 text-muted-foreground/40"
                >
                  <Shield className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0 space-y-2">
                <HeroClassification
                  locale={locale}
                  heroClass={data.heroClass}
                  category={data.category}
                />
                {data.summary ? (
                  <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {data.summary}
                  </p>
                ) : null}
                {data.tierCount || data.maxPower ? (
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {tierCountLabel(locale, data.tierCount) ?? ""}
                    {data.maxPower !== null
                      ? ` · ${powerRangeLabelText(locale, data.maxPower, data.maxPower) ?? ""}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Perks — the defining trait, full text */}
            <section aria-label={l.perks}>
              <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {l.perks}
              </h3>
              {data.perks.length > 0 ? (
                <ul>
                  {data.perks.map((p) => (
                    <PerkRow key={p.key} locale={locale} perk={p} />
                  ))}
                </ul>
              ) : (
                <EmptyNote>{l.progressionEmpty}</EmptyNote>
              )}
            </section>

            {/* Ability kit */}
            {data.abilities.length > 0 ? (
              <section aria-label={l.abilities}>
                <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {l.abilities}
                </h3>
                <ul>
                  {data.abilities.map((a) => (
                    <AbilityRow key={a.key} ability={a} />
                  ))}
                </ul>
              </section>
            ) : null}

            {/* tier 1 -> max costs */}
            {data.totalCosts.length > 0 ? (
              <section aria-label={l.totalToMax}>
                <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {l.totalToMax}
                </h3>
                <ul className="flex flex-wrap gap-1.5">
                  {data.totalCosts.map((c) => (
                    <li key={c.resourceKey}>
                      <ResourceCostChip locale={locale} cost={c} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {state !== "loading" ? (
          <QuickViewFooter locale={locale} slug={hero?.slug ?? ""} label={s.viewDetails} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function QuickViewFooter({ locale, slug, label }: { locale: string; slug: string; label: string }) {
  if (!slug) return null;
  return (
    <div className={cn("mt-5 flex justify-end border-t border-panel-border/60 pt-4")}>
      <Link
        to={heroDetailHref(locale, slug)}
        data-testid="hero-preview-cta"
        className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
      </Link>
    </div>
  );
}

/** Unused legacy hook retained for import compatibility. */
export function useHeroPreview() {
  const [preview, setPreview] = React.useState<HeroPreviewSeed | null>(null);
  return { preview, setPreview };
}
