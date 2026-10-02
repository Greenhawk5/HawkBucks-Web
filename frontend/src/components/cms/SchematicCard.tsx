import { Link } from "@tanstack/react-router";
import { Hammer, Swords } from "lucide-react";

import { getPublicStrings } from "@/lib/cms/public-strings";
import type { PublicInventoryItem } from "@/lib/cms/public-inventory.loader";
import { RarityBadge } from "./RarityBadge";
import {
  EntityCard,
  EntityCardBody,
  EntityCardMedia,
  EntityCardTitleLink,
  MetaChip,
} from "@/components/content/EntityCard";

export function schematicDetailHref(locale: string, slug: string): string {
  return locale === "en" ? `/schematics/${slug}` : `/${locale}/schematics/${slug}`;
}

/**
 * Schematic card (weapon or trap). Shows the delivery-URL image only (never
 * provider/private media fields), localized name, kind + editorial subtype,
 * rarity and placement where the taxonomy provides them. Logical CSS
 * properties keep RTL correct; artwork itself is never mirrored.
 */
export function SchematicCard({
  item,
  locale,
}: {
  item: PublicInventoryItem & { rarity?: string | null };
  locale: string;
}) {
  const s = getPublicStrings(locale);
  const rarity = (item as { rarity?: string | null }).rarity;
  const isTrap = item.kind === "trap";
  const typeLabel = isTrap ? s.trapLabel : s.weaponLabel;
  // Traps carry placement (floor/wall/ceiling); weapons carry an editorial
  // subtype. Only one of the two is ever populated for a given record.
  const detail = isTrap ? item.trapPlacement : item.weaponSubtype;
  return (
    <EntityCard rarity={rarity} testId="inventory-card" dataKind={item.kind}>
      <EntityCardMedia
        src={item.imageUrl}
        alt={item.title}
        fallbackIcon={isTrap ? Hammer : Swords}
      />
      <EntityCardBody>
        <div className="flex flex-wrap items-center gap-2">
          <RarityBadge rarity={rarity} />
          <MetaChip>{typeLabel}</MetaChip>
          {detail ? <MetaChip>{detail}</MetaChip> : null}
        </div>
        <div className="mt-2">
          <EntityCardTitleLink href={schematicDetailHref(locale, item.slug)}>
            {item.title}
          </EntityCardTitleLink>
        </div>
        {item.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {item.description.slice(0, 140)}
          </p>
        ) : null}
        <div className="mt-auto pt-4">
          <Link
            to={schematicDetailHref(locale, item.slug)}
            className="relative z-10 inline-flex h-9 items-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {s.viewDetails}
          </Link>
        </div>
      </EntityCardBody>
    </EntityCard>
  );
}
