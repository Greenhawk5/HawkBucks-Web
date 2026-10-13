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
import { rarityToken } from "@/lib/cms/rarity-tokens";
import { getHeroQuickView, type PublicHeroQuickView } from "@/lib/cms/public-hero-quickview.loader";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  RarityPill,
  PerkRow,
  ResourceCostGrid,
  MediaIcon,
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
  /** Registered class glyph resolved by the listing loader; null = text fallback. */
  classIconUrl?: string | null;
  imageUrl?: string | null;
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
  const token = rarityToken(rarity);
  const classIconUrl = data?.classIconUrl ?? hero?.classIconUrl ?? null;
  const portraitUrl = data?.imageUrl ?? hero?.imageUrl ?? null;
  const catText = categoryLabel(locale, category);

  return (
    <Dialog
      open={hero !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 pb-[env(safe-area-inset-bottom)] sm:w-full",
        )}
        data-testid="hero-preview-dialog"
        aria-describedby="hero-preview-summary"
      >
        <div
          className="shrink-0 border-b border-panel-border/60 px-4 pt-4 pb-4 pe-12 sm:px-6 sm:pt-5"
          style={token ? { borderTop: `3px solid ${token.accent}` } : undefined}
        >
          <DialogTitle className="font-display text-xl font-extrabold tracking-tight text-balance sm:text-2xl">
            {title}
          </DialogTitle>
          <DialogDescription
            id="hero-preview-summary"
            className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
              {classIconUrl ? (
                <img
                  src={classIconUrl}
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
              <span className="font-medium text-foreground/90">
                {heroClassLabel(locale, heroClass)}
              </span>
            </span>
            {catText ? (
              <span aria-hidden="true" className="opacity-50">
                ·
              </span>
            ) : null}
            {catText ? <span>{catText}</span> : null}
            {rarity ? <RarityPill locale={locale} rarity={rarity} className="ms-1" /> : null}
          </DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
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
            <div>
              <EmptyNote>{l.loadError}</EmptyNote>
            </div>
          ) : null}

          {state === "ready" && data ? (
            <div className="space-y-6">
              <div className="flex gap-3.5 sm:gap-4">
                {portraitUrl ? (
                  <img
                    src={portraitUrl}
                    alt={data.title}
                    className="h-24 w-24 shrink-0 rounded-xl border border-panel-border/60 bg-background/40 object-cover object-top sm:h-28 sm:w-28"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="grid h-24 w-24 shrink-0 place-items-center rounded-xl border border-panel-border/60 bg-muted/30 text-muted-foreground/40 sm:h-28 sm:w-28"
                  >
                    <Shield className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {data.summary ? (
                    <p className="text-sm leading-relaxed text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] overflow-hidden">
                      {data.summary}
                    </p>
                  ) : null}
                  {data.tierCount || data.maxPower ? (
                    <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">
                      {tierCountLabel(locale, data.tierCount) ?? ""}
                      {data.maxPower !== null
                        ? ` · ${powerRangeLabelText(locale, data.maxPower, data.maxPower) ?? ""}`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </div>

              <section aria-label={l.perks}>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {l.perks}
                </h3>
                {data.perks.length > 0 ? (
                  <ul className="rounded-xl border border-panel-border/60 bg-background/40 px-3 py-1">
                    {data.perks.map((p) => (
                      <PerkRow key={p.key} locale={locale} perk={p} />
                    ))}
                  </ul>
                ) : (
                  <EmptyNote>{l.progressionEmpty}</EmptyNote>
                )}
              </section>

              {data.abilities.length > 0 ? (
                <section aria-label={l.abilities}>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {l.abilities}
                  </h3>
                  <ul className="flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-xl border border-panel-border/60 bg-background/40 px-3.5 py-3">
                    {data.abilities.map((a) => (
                      <li
                        key={a.key}
                        data-testid="hero-ability-row"
                        title={a.description ?? a.name}
                        className="flex min-w-0 flex-1 items-center gap-2 [flex-basis:11rem]"
                      >
                        <MediaIcon url={a.iconUrl} sizeClass="h-7 w-7" />
                        <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug">
                          {a.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {data.totalCosts.length > 0 ? (
                <section
                  aria-label={l.totalToMax}
                  className="border-t-2 border-panel-border/70 pt-5"
                >
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {l.totalToMax}
                  </h3>
                  <p className="mb-2.5 text-xs text-muted-foreground">{l.evolveToMax}</p>
                  <ResourceCostGrid locale={locale} costs={data.totalCosts} />
                </section>
              ) : null}
            </div>
          ) : null}
        </div>

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
    <div
      className={cn(
        "shrink-0 border-t border-panel-border/60 bg-background px-4 py-3 sm:px-6 sm:py-4",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      <Link
        to={heroDetailHref(locale, slug)}
        data-testid="hero-preview-cta"
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:min-w-36"
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
