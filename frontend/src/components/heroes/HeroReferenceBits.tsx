/**
 * Shared presentational primitives for the Heroes reference experience.
 *
 * Used by the card, the quick view and the detail page so a perk, an ability
 * and a resource cost look and behave identically everywhere.
 *
 * RTL: every directional property here is a LOGICAL property (ps-/pe-/ms-/me-/
 * start-/end-/text-start/text-end) so ar-SA and fa-IR mirror automatically from
 * the document `dir`. No `ml-`, `pr-`, `left-`, or `text-right` appears in this
 * file, and the parity test asserts that.
 *
 * Numbers: every numeric cell is wrapped in `tabular-nums` and rendered through
 * the locale formatter, so power values and cost amounts align in columns.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { heroLabels, rarityLabel, categoryLabel, formatNumber } from "@/lib/cms/hero-labels";
import { rarityToken } from "@/lib/cms/rarity-tokens";
import { heroClassLabel } from "@/lib/cms/public-strings";
import type {
  PublicHeroPerk,
  PublicHeroAbility,
  PublicResourceCost,
} from "@/lib/cms/hero-reference";

/**
 * Rarity pill.
 *
 * Reads the CANONICAL rarity palette (`rarity-tokens.ts`) — the same tokens the
 * EntityCard accent and RarityBadge use — so the listing card, the reference
 * row, the Quick View and the Hero Codex can never drift apart. The label text
 * is always present: rarity is never colour-only.
 *
 * The visual weight is deliberate: a rarity-tinted surface, the accent border,
 * and the token's contrast-checked badge text. Unknown/out-of-vocabulary
 * values still render with the neutral token rather than disappearing.
 */
export function RarityPill({
  locale,
  rarity,
  className,
}: {
  locale: string;
  rarity: string | null | undefined;
  className?: string;
}) {
  if (!rarity) return null;
  const token = rarityToken(rarity.toLowerCase());
  const accent = token?.accent ?? "oklch(0.55 0.02 250)";
  const surface = token?.badgeBg ?? "oklch(0.25 0.02 250)";
  const text = token?.badgeText ?? "oklch(0.85 0.02 250)";
  return (
    <span
      data-testid="hero-rarity-pill"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        className,
      )}
      style={{ borderColor: accent, backgroundColor: surface, color: text }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: accent }}
      />
      {rarityLabel(locale, rarity)}
    </span>
  );
}

/** Uppercase micro-label chip. Text-only; never a colour-coded status pill. */
export function MetaChip2({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-md border border-panel-border/80 bg-background/60 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Localized classification line: class and (when present) category. */
export function HeroClassification({
  locale,
  heroClass,
  category,
  className,
}: {
  locale: string;
  heroClass: string;
  category: string | null;
  className?: string;
}) {
  const cat = categoryLabel(locale, category);
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <MetaChip2>{heroClassLabel(locale, heroClass)}</MetaChip2>
      {cat ? <MetaChip2 title={cat}>{cat}</MetaChip2> : null}
    </div>
  );
}

/** Resource cost: icon when available, always the localized name + amount. */
export function ResourceCostChip({
  locale,
  cost,
  className,
}: {
  locale: string;
  cost: PublicResourceCost;
  className?: string;
}) {
  return (
    <span
      data-testid="hero-resource-cost"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-panel-border/70 bg-background/50 px-1.5 py-0.5 text-[11px]",
        className,
      )}
      title={`${cost.name}: ${formatNumber(locale, cost.amount)}`}
    >
      <MediaIcon url={cost.iconUrl} sizeClass="h-3.5 w-3.5" />
      <span className="tabular-nums font-semibold">{formatNumber(locale, cost.amount)}</span>
      <span className="text-muted-foreground">{cost.name}</span>
    </span>
  );
}

/**
 * Evolution cost summary grid for Quick View (total-to-max only).
 *
 * A structured codex table rather than inline chips: each cell carries the
 * real icon, the exact locale-formatted quantity (prominent) and the display
 * name (secondary, wraps naturally). The caller passes the loader's
 * `totalCosts` array untouched — no recalculation, no filtering, canonical
 * order preserved.
 */
export function ResourceCostGrid({
  locale,
  costs,
  className,
}: {
  locale: string;
  costs: readonly PublicResourceCost[];
  className?: string;
}) {
  return (
    <ul
      className={cn("grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 sm:grid-cols-3", className)}
    >
      {costs.map((c) => (
        <li
          key={c.resourceKey}
          data-testid="hero-resource-cost"
          title={`${c.name}: ${formatNumber(locale, c.amount)}`}
          className="flex min-w-0 items-center gap-2.5 rounded-lg border border-panel-border/60 bg-background/50 px-2.5 py-2"
        >
          <MediaIcon url={c.iconUrl} sizeClass="h-8 w-8" />
          <span className="min-w-0">
            <span className="block text-sm font-bold tabular-nums leading-tight">
              {formatNumber(locale, c.amount)}
            </span>
            <span className="block min-w-0 break-words text-xs leading-snug text-muted-foreground">
              {c.name}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ResourceCostList({
  locale,
  costs,
  emptyLabel,
  className,
}: {
  locale: string;
  costs: readonly PublicResourceCost[];
  emptyLabel?: string;
  className?: string;
}) {
  if (costs.length === 0) {
    return emptyLabel ? <span className="text-xs text-muted-foreground">{emptyLabel}</span> : null;
  }
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {costs.map((c) => (
        <li key={`${c.resourceKey}-${c.amount}`}>
          <ResourceCostChip locale={locale} cost={c} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Icon-only ability chip with a native tooltip; falls back to the short name. */
export function AbilityChip({
  locale,
  ability,
  size = "sm",
}: {
  locale: string;
  ability: PublicHeroAbility;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  return (
    <span
      data-testid="hero-ability-chip"
      title={ability.description ? `${ability.name} — ${ability.description}` : ability.name}
      className="inline-flex items-center gap-1.5"
    >
      <MediaIcon
        url={ability.iconUrl}
        sizeClass={dim}
        fallbackText={ability.name.slice(0, 2)}
        labelled={false}
      />
      {size === "md" ? <span className="text-sm">{ability.name}</span> : null}
      {size === "md" ? <span className="sr-only">{locale}</span> : null}
    </span>
  );
}

/**
 * One icon slot for the reference UI: the managed image when there is one, a
 * bordered placeholder otherwise.
 *
 * Why the fallback is stateful: an icon only appears when a CMS asset is
 * referenced AND that asset is `status = 'ready'`, so a missing `url` means
 * "no media was ever associated". A url that still fails to load is a different
 * fact - the asset row is live but its bytes are gone (`registered_missing`),
 * which happens when an object is removed from the bucket outside the CMS.
 * Rendering the browser's broken-image glyph for that would look like a bug in
 * the page, so the ERROR path swaps to the same placeholder and hides the
 * failed request instead.
 *
 * The slot keeps fixed dimensions either way, so swapping never shifts layout.
 * The image is decorative: the adjacent text already names the entity, so the
 * icon is hidden from assistive technology.
 */
export function MediaIcon(props: {
  url: string | null | undefined;
  sizeClass: string;
  /** Optional text shown in the placeholder when there is no usable image. */
  fallbackText?: string;
  labelled?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  // A different url is a different image: forget the previous failure.
  React.useEffect(() => {
    setFailed(false);
  }, [props.url]);
  const showImage = typeof props.url === "string" && props.url !== "" && !failed;
  if (showImage) {
    return (
      <img
        src={props.url as string}
        alt=""
        aria-hidden={props.labelled === true ? undefined : "true"}
        className={cn(props.sizeClass, "shrink-0 rounded-sm object-contain")}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      data-placeholder="true"
      className={cn(
        props.sizeClass,
        "grid shrink-0 place-items-center rounded-sm border border-panel-border/70 bg-background/40",
        props.fallbackText !== undefined && props.fallbackText !== ""
          ? "text-[9px] font-bold uppercase text-muted-foreground"
          : "",
      )}
    >
      {props.fallbackText ?? ""}
    </span>
  );
}

/** Perk row: icon, localized slot label, name and full description. */
export function PerkRow({
  locale,
  perk,
  compact = false,
}: {
  locale: string;
  perk: PublicHeroPerk;
  compact?: boolean;
}) {
  const l = heroLabels(locale);
  const slotLabel = perk.slot === "commander" ? l.commanderPerk : l.standardPerk;
  return (
    <li
      data-testid="hero-perk-row"
      data-slot={perk.slot}
      className="flex gap-2.5 border-t border-panel-border/50 py-2.5 first:border-t-0 first:pt-0 last:pb-0"
    >
      <MediaIcon url={perk.iconUrl} sizeClass="mt-0.5 h-8 w-8" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {slotLabel}
          </span>
          <span className="font-display text-sm font-bold">{perk.name}</span>
        </div>
        {perk.description ? (
          <p
            className={cn(
              "mt-1 text-muted-foreground",
              compact ? "line-clamp-2 text-xs" : "text-sm leading-relaxed",
            )}
          >
            {perk.description}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** Ability row: icon, name, description. */
export function AbilityRow({
  ability,
  className,
}: {
  ability: PublicHeroAbility;
  className?: string;
}) {
  return (
    <li
      data-testid="hero-ability-row"
      className={cn(
        "flex gap-2.5 border-t border-panel-border/50 py-2.5 first:border-t-0 first:pt-0 last:pb-0",
        className,
      )}
    >
      <MediaIcon url={ability.iconUrl} sizeClass="mt-0.5 h-7 w-7" />
      <div className="min-w-0">
        <p className="font-display text-sm font-bold">{ability.name}</p>
        {ability.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {ability.description}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** Two-column key/value pair used by the detail metadata rail. Same wrapping
 * contract as the facts panel: long labels wrap instead of forcing overflow,
 * values wrap instead of truncating. */
export function MetaPair({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] items-baseline gap-x-3 gap-y-0.5 border-b border-panel-border/40 py-1.5 last:border-b-0 max-[420px]:grid-cols-1">
      <dt className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground break-words">
        {label}
      </dt>
      <dd className="min-w-0 text-start text-sm font-medium leading-snug break-words [overflow-wrap:anywhere] sm:text-end">
        {value}
      </dd>
    </div>
  );
}

/** Empty-data notice. Never renders a broken control, only explanatory text. */
export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-panel-border/60 px-3 py-2 text-xs text-muted-foreground">
      {children}
    </p>
  );
}
