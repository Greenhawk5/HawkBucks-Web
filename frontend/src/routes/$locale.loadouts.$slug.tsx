import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { LoadoutDetail } from "@/components/cms/LoadoutDetail";
import { I18nProvider } from "@/i18n/context";
import { jsonLdScript } from "@/lib/seo";
import { getPublicLoadout } from "@/lib/cms/public-loadout-detail.loader";
import {
  buildLoadoutJsonLd,
  entityHreflangAlternates,
  loadoutDetailPath,
  toSafeHeadText,
} from "@/lib/cms/public-content";
import { resolveCmsSeo } from "@/lib/cms/seo";
import {
  canonicalUrlFor,
  hreflangFor,
  localizePath,
  matchLocaleParamCaseInsensitive,
  parseLocaleParam,
} from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/$locale/loadouts/$slug")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined) {
      const p = params as { slug?: string };
      throw redirect({
        href:
          corrected === DEFAULT_LANGUAGE
            ? `/loadouts/${p.slug ?? ""}`
            : `/${corrected}/loadouts/${p.slug ?? ""}`,
      });
    }
    throw redirect({ href: "/loadouts" });
  },
  loader: async ({ params }) => {
    const lang = parseLocaleParam((params as { locale?: unknown }).locale) ?? DEFAULT_LANGUAGE;
    try {
      const { loadout } = await getPublicLoadout({
        data: { locale: lang, slug: (params as { slug?: string }).slug ?? "" },
      });
      if (!loadout) throw notFound();
      return { loadout, lang };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData, params }) => {
    const lang =
      parseLocaleParam((params as { locale?: unknown } | undefined)?.locale) ?? DEFAULT_LANGUAGE;
    const loadout = (
      loaderData as
        | {
            loadout?: {
              title: string;
              description: string;
              slug: string;
              imageUrl: string | null;
              completeLocales?: string[];
              slugsByLocale?: Record<string, string>;
            };
          }
        | undefined
    )?.loadout;
    const seo = resolveCmsSeo({
      status: loadout ? "published" : "draft",
      publicPath: loadout
        ? lang === "en"
          ? loadoutDetailPath(loadout.slug)
          : `/${lang}${loadoutDetailPath(loadout.slug)}`
        : "/loadouts",
      ogImageUrl: loadout?.imageUrl ?? null,
      fallbackTitle: loadout ? `${loadout.title} | HawkBucks` : "Loadout | HawkBucks",
      fallbackDescription: loadout
        ? toSafeHeadText(loadout.description, 300)
        : "HawkBucks loadout.",
    });
    // Missing entity (not-found render): never emit a canonical or hreflang
    // alternates. entityHreflangAlternates always emits en + x-default, which
    // would be misleading fallback alternates for a 404 path.
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
    const enPath = loadoutDetailPath(loadout.slug);
    const self = seo.canonical ?? canonicalUrlFor(localizePath(enPath, lang));
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
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.description },
        { name: "robots", content: seo.robots },
        { property: "og:title", content: seo.ogTitle },
        { property: "og:description", content: seo.ogDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: self },
        ...(seo.ogImageUrl ? [{ property: "og:image", content: seo.ogImageUrl }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "canonical", href: self },
        ...alternates.map(({ hreflang, href }) => ({ rel: "alternate", hrefLang: hreflang, href })),
      ],
      scripts: [jsonLdScript(ld)],
    };
  },
  component: LocalizedLoadoutDetailRoute,
});
function LocalizedLoadoutDetailRoute() {
  const { loadout, lang } = Route.useLoaderData() as {
    loadout: import("@/lib/cms/public-loadout-detail.loader").PublicLoadoutDetail;
    lang: string;
  };
  return (
    <I18nProvider initialLanguage={lang as never} fixedLanguage={lang as never}>
      <LoadoutDetail
        loadout={loadout}
        locale={lang}
        backHref={lang === "en" ? "/loadouts" : `/${lang}/loadouts`}
      />
    </I18nProvider>
  );
}
