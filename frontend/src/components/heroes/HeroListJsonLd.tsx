/**
 * Structured data for the Heroes listing.
 *
 * Page-scoped by design: it lists ONLY the heroes rendered on the current page,
 * with positions relative to that page. Emitting all 242 heroes from page 1
 * would describe content that is not on the page, which is exactly the
 * "structured data does not represent the visible page" failure mode.
 *
 * The canonical list URL is always the BARE hub path, matching the existing
 * canonical policy: a filtered listing is not a separate document.
 */

import * as React from "react";
import { canonicalUrlFor, localizePath } from "@/lib/locale-urls";
import { rarityLabel } from "@/lib/cms/hero-labels";
import type { HubHeroRow } from "@/lib/cms/public-hubs.loader";

export function heroListItemListJsonLd(
  items: ReadonlyArray<Pick<HubHeroRow, "slug" | "title" | "delivery_url" | "rarity">>,
  basePath: string,
  locale: string,
): Record<string, unknown> | null {
  if (!Array.isArray(items) || items.length === 0) return null;

  const listUrl = canonicalUrlFor(localizePath(basePath, locale));

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Fortnite: Save the World Heroes",
    description: "Save the World Heroes by class, rarity, role, standard perk, ability and power.",
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: items.map((it, i) => {
      const url = canonicalUrlFor(localizePath(`${basePath}/${it.slug}`, locale));
      const entry: Record<string, unknown> = {
        "@type": "ListItem",
        position: i + 1,
        name: it.title,
        url,
      };
      // Images and extra properties are only added when actually present, so
      // the output never contains empty fields that a validator would flag.
      if (it.delivery_url) entry["image"] = it.delivery_url;
      const props: Array<{ name: string; value: string }> = [];
      const rarity = rarityLabel(locale, it.rarity);
      if (rarity) props.push({ name: "Rarity", value: rarity });
      if (props.length > 0) entry["additionalProperty"] = props;
      return entry;
    }),
    mainEntityOfPage: { "@type": "WebPage", "@id": listUrl },
  };
}

export function HeroListItemListJsonLd(props: {
  items: ReadonlyArray<Pick<HubHeroRow, "slug" | "title" | "delivery_url" | "rarity">>;
  basePath: string;
  locale: string;
}) {
  const data = heroListItemListJsonLd(props.items, props.basePath, props.locale);
  if (!data) return null;
  // Rendered as a text child rather than dangerouslySetInnerHTML: React escapes
  // the content, so a hero title containing markup can never break out of the
  // script element.
  return (
    <script type="application/ld+json" data-testid="hero-itemlist-jsonld">
      {JSON.stringify(data)}
    </script>
  );
}
