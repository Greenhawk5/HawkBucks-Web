/**
 * Content Platform — shared entity metadata builder (PURE LOGIC, client-safe).
 *
 * One canonical implementation for hub + detail <head> construction, so every
 * indexable page gets identical treatment: title, description, canonical,
 * hreflang alternates, OG/Twitter, JSON-LD scripts. Consumes resolveCmsSeo
 * (published-only gate) and the existing locale-urls helpers.
 *
 * Faceted-navigation policy (Master Spec §9): filter/search query strings
 * NEVER produce canonical URLs — listings canonicalize to the bare hub path.
 */

import { resolveCmsSeo, toSafeSeoText } from "./seo";
import { entityHreflangAlternates } from "./public-content-slots";
import { canonicalUrlFor, hreflangAlternates, hreflangFor, localizePath } from "@/lib/locale-urls";
import { jsonLdScript } from "@/lib/seo";

export interface HubMetaInput {
  basePath: string;
  locale: string;
  title: string;
  description: string;
  ogTitle?: string | undefined;
  ogDescription?: string | undefined;
}

/**
 * True when a route BELOW the calling route is active (e.g. a hub's detail
 * page or topic landing).
 *
 * The four public hubs are the PARENTS of their /$slug and /topics/$topic
 * routes, and TanStack merges head metadata from every matched route. Without
 * this check a detail page inherits the hub's canonical on top of its own,
 * emitting two <link rel="canonical"> tags — the hub URL would then compete
 * with the entity URL for the same content. Returning empty head metadata from
 * the parent leaves the detail route's canonical as the only one.
 *
 * `ctx.matches` is the full match chain and `ctx.match` is this route's own
 * match, so anything AFTER this route in the chain is a descendant. Both
 * fields are optional in the public types; when the identity is unavailable we
 * report `false` so a hub always keeps its own head rather than silently
 * dropping its title, description and canonical.
 */
export function hasChildMatch(ctx: {
  matches?: ReadonlyArray<{ id?: string }> | undefined;
  match?: { id?: string } | undefined;
}): boolean {
  const matches = ctx.matches ?? [];
  const selfId = ctx.match?.id;
  if (selfId === undefined) return false;
  const selfIndex = matches.findIndex((m) => m.id === selfId);
  return selfIndex !== -1 && selfIndex < matches.length - 1;
}

export function buildHubHead(input: HubMetaInput): {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string | undefined>>;
} {
  const self = canonicalUrlFor(localizePath(input.basePath, input.locale));
  const ogImage = `${canonicalUrlFor("/").replace(/\/$/, "")}/og-image.png`;
  const ogTitle = input.ogTitle ?? input.title;
  const ogDescription = input.ogDescription ?? input.description;
  return {
    meta: [
      { title: input.title },
      { name: "description", content: input.description },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: ogTitle },
      { property: "og:description", content: ogDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: self },
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: ogTitle },
      { name: "twitter:description", content: ogDescription },
      { name: "twitter:image", content: ogImage },
    ],
    links: [
      { rel: "canonical", href: self },
      ...hreflangAlternates(input.basePath).map(({ hreflang, href }) => ({
        rel: "alternate",
        hrefLang: hreflang,
        href,
      })),
    ],
  };
}

export interface DetailMetaInput {
  kind: "hero" | "loadout" | "schematic" | "article";
  detailBasePath: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string | null;
  ogType?: string | undefined;
  seoTitle: string | null;
  seoDescription: string | null;
  completeLocales: readonly string[];
  slugsByLocale?: Readonly<Record<string, string>> | undefined;
  jsonLd: unknown;
}

/** Detail 404 head: safe title, no canonical, no hreflang, robots noindex. */
export function buildNotFoundHead(input: { title: string; description: string }): {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: Array<unknown>;
} {
  const seo = resolveCmsSeo({
    status: "draft",
    publicPath: "/",
    fallbackTitle: input.title,
    fallbackDescription: input.description,
  });
  return {
    meta: [
      { title: seo.title },
      { name: "description", content: seo.description },
      { name: "robots", content: seo.robots },
    ],
    links: [],
    scripts: [],
  };
}

export function buildDetailHead(input: DetailMetaInput): {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string | undefined>>;
  scripts: Array<Record<string, string>>;
} {
  const seo = resolveCmsSeo({
    status: "published",
    publicPath: input.detailBasePath,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    ogImageUrl: input.imageUrl,
    fallbackTitle: `${input.title} | HawkBucks`,
    fallbackDescription: toSafeSeoText(input.description, 300) || "HawkBucks.",
  });
  const self = seo.canonical ?? canonicalUrlFor(input.detailBasePath);
  const alternates = entityHreflangAlternates({
    kind: input.kind,
    currentSlug: input.slug,
    completeLocales: input.completeLocales,
    ...(input.slugsByLocale ? { slugsByLocale: input.slugsByLocale } : {}),
    hreflangOf: hreflangFor,
    localizePath,
    canonicalUrlFor,
  });
  const meta: Array<Record<string, string>> = [
    { title: seo.title },
    { name: "description", content: seo.description },
    { name: "robots", content: seo.robots },
    { property: "og:title", content: seo.ogTitle },
    { property: "og:description", content: seo.ogDescription },
    { property: "og:type", content: input.ogType ?? "website" },
    { property: "og:url", content: self },
    ...(seo.ogImageUrl ? [{ property: "og:image", content: seo.ogImageUrl }] : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: seo.ogTitle },
    { name: "twitter:description", content: seo.ogDescription },
    ...(seo.ogImageUrl ? [{ name: "twitter:image", content: seo.ogImageUrl }] : []),
  ];
  return {
    meta,
    links: [
      { rel: "canonical", href: self },
      ...alternates.map(({ hreflang, href }) => ({
        rel: "alternate",
        hrefLang: hreflang,
        href,
      })),
    ],
    scripts: [jsonLdScript(input.jsonLd)],
  };
}
