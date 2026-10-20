import { createFileRoute, notFound } from "@tanstack/react-router";
import { LoadoutDetail } from "@/components/cms/LoadoutDetail";
import { I18nProvider } from "@/i18n/context";
import { jsonLdScript } from "@/lib/seo";
import { getPublicLoadout } from "@/lib/cms/public-loadout-detail.loader";
import { getPublicFeatureStatus } from "@/lib/cms/feature-availability.loader";
import { SectionUnavailableState } from "@/components/cms/SectionUnavailableState";
import {
  buildLoadoutJsonLd,
  entityHreflangAlternates,
  loadoutDetailPath,
  toSafeHeadText,
} from "@/lib/cms/public-content";
import { resolveCmsSeo } from "@/lib/cms/seo";
import { canonicalUrlFor, hreflangFor, localizePath } from "@/lib/locale-urls";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/loadouts/$slug")({
  loader: async ({ params }) => {
    const { config } = await getPublicFeatureStatus();
    if (!config.loadouts.enabled) {
      return {
        available: false as const,
        unavailableMessage: config.loadouts.message,
        loadout: null,
      };
    }
    try {
      const { loadout } = await getPublicLoadout({ data: { locale: "en", slug: params.slug } });
      if (!loadout) throw notFound();
      return { available: true as const, unavailableMessage: "", loadout };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const data = loaderData as
      | {
          available?: boolean;
          unavailableMessage?: string;
          loadout?: {
            title: string;
            description: string;
            slug: string;
            imageUrl: string | null;
            completeLocales?: string[];
            slugsByLocale?: Record<string, string>;
          } | null;
        }
      | undefined;

    if (data?.available === false) {
      return {
        meta: [
          { title: "Loadout Temporarily Unavailable — HawkBucks" },
          { name: "description", content: "The Loadouts section is temporarily unavailable." },
          { name: "robots", content: "noindex, nofollow" },
        ],
        links: [],
        scripts: [],
      };
    }

    const loadout = data?.loadout;
    const path = loadout ? loadoutDetailPath(loadout.slug) : "/loadouts";
    const seo = resolveCmsSeo({
      status: loadout ? "published" : "draft",
      publicPath: path,
      ogImageUrl: loadout?.imageUrl ?? null,
      fallbackTitle: loadout ? `${loadout.title} | HawkBucks` : "Loadout | HawkBucks",
      fallbackDescription: loadout
        ? toSafeHeadText(loadout.description, 300)
        : "HawkBucks loadout.",
    });
    if (!loadout) {
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
    const self = seo.canonical ?? canonicalUrlFor(localizePath(path, "en"));
    const alternates = entityHreflangAlternates({
      kind: "loadout",
      currentSlug: loadout.slug,
      completeLocales: loadout.completeLocales ?? [],
      ...(loadout.slugsByLocale ? { slugsByLocale: loadout.slugsByLocale } : {}),
      hreflangOf: hreflangFor,
      localizePath,
      canonicalUrlFor,
    });
    const heroNames =
      "commander" in loadout || "support" in loadout
        ? [
            ...((loadout as { commander?: { title?: unknown } }).commander?.title
              ? [String((loadout as { commander?: { title?: unknown } }).commander?.title)]
              : []),
            ...((loadout as { support?: Array<{ title?: unknown } | null> }).support ?? [])
              .filter((h): h is { title?: unknown } => !!h && typeof h.title === "string")
              .map((h) => String(h.title)),
          ]
        : [];
    const ld = buildLoadoutJsonLd({
      name: loadout.title,
      description: toSafeHeadText(loadout.description, 300),
      url: self,
      image: loadout.imageUrl,
      heroNames,
      breadcrumbBase: `${SITE_URL}/`,
    });
    const meta: Array<Record<string, string>> = [
      { title: seo.title },
      { name: "description", content: seo.description },
      { name: "robots", content: seo.robots },
      { property: "og:title", content: seo.ogTitle },
      { property: "og:description", content: seo.ogDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: self },
      ...(seo.ogImageUrl ? [{ property: "og:image", content: seo.ogImageUrl }] : []),
      { name: "twitter:card", content: "summary_large_image" },
    ];
    const links =
      alternates.length > 0
        ? [
            { rel: "canonical", href: self },
            ...alternates.map(({ hreflang, href }) => ({
              rel: "alternate",
              hrefLang: hreflang,
              href,
            })),
          ]
        : [{ rel: "canonical", href: self }];
    return {
      meta,
      links,
      scripts: [jsonLdScript(ld)],
    };
  },
  component: LoadoutDetailRoute,
});
function LoadoutDetailRoute() {
  const data = Route.useLoaderData();
  if (!data.available || !data.loadout) {
    return <SectionUnavailableState section="loadouts" message={data.unavailableMessage} />;
  }
  return (
    <I18nProvider initialLanguage="en" fixedLanguage="en">
      <LoadoutDetail loadout={data.loadout as never} locale="en" backHref="/loadouts" />
    </I18nProvider>
  );
}
