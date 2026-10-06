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
import { heroClassLabel } from "@/lib/cms/public-strings";
import type {
  PublicHeroPerk,
  PublicHeroAbility,
  PublicResourceCost,
} from "@/lib/cms/hero-reference";

/** Rarity accent tokens. Mirrors rarity-tokens.ts; text always accompanies colour. */
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
  const key = rarity.toLowerCase();
  const color =
    key === "mythic"
      ? "oklch(0.65 0.2 20)"
      : key === "legendary"
        ? "oklch(0.72 0.16 90)"
        : key === "epic"
          ? "oklch(0.62 0.18 300)"
          : key === "rare"
            ? "oklch(0.62 0.15 260)"
            : key === "uncommon"
              ? "oklch(0.65 0.12 150)"
              : "oklch(0.55 0.02 250)";
  return (
    <span
      data-testid="hero-rarity-pill"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        className,
      )}
      style={{ borderColor: color, color }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
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
      {cost.iconUrl ? (
        <img
          src={cost.iconUrl}
          alt=""
          aria-hidden="true"
          className="h-3.5 w-3.5 object-contain"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
      )}
      <span className="tabular-nums font-semibold">{formatNumber(locale, cost.amount)}</span>
      <span className="text-muted-foreground">{cost.name}</span>
    </span>
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

/** Icon-only ability chip with a native tooltip; falls back to the short name. */
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
      {ability.iconUrl ? (
        <img
          src={ability.iconUrl}
          alt=""
          aria-hidden="true"
          className={cn(dim, "rounded-sm object-contain")}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            dim,
            "grid place-items-center rounded-sm border border-panel-border/70 text-[9px] font-bold uppercase text-muted-foreground",
          )}
        >
          {ability.name.slice(0, 2)}
        </span>
      )}
      {size === "md" ? <span className="text-sm">{ability.name}</span> : null}
      {size === "md" ? <span className="sr-only">{locale}</span> : null}
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
      {perk.iconUrl ? (
        <img
          src={perk.iconUrl}
          alt=""
          aria-hidden="true"
          className="mt-0.5 h-8 w-8 shrink-0 rounded-sm object-contain"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span
          aria-hidden="true"
          className="mt-0.5 h-8 w-8 shrink-0 rounded-sm border border-panel-border/70 bg-background/40"
        />
      )}
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
      {ability.iconUrl ? (
        <img
          src={ability.iconUrl}
          alt=""
          aria-hidden="true"
          className="mt-0.5 h-7 w-7 shrink-0 rounded-sm object-contain"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span
          aria-hidden="true"
          className="mt-0.5 h-7 w-7 shrink-0 rounded-sm border border-panel-border/70 bg-background/40"
        />
      )}
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

/** Two-column key/value pair used by the detail metadata rail. */
export function MetaPair({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-panel-border/40 py-1.5 last:border-b-0">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-end text-sm font-medium">{value}</dd>
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
