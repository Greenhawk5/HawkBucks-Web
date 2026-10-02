import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { SchematicDetail } from "@/components/cms/SchematicDetail";
import { I18nProvider } from "@/i18n/context";
import { getPublicSchematic } from "@/lib/cms/public-schematic-detail.loader";
import {
  buildSchematicJsonLd,
  entityHreflangAlternates,
  schematicDetailPath,
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

export const Route = createFileRoute("/$locale/schematics/$slug")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined) {
      const p = params as { slug?: string };
      throw redirect({
        href:
          corrected === DEFAULT_LANGUAGE
            ? `/schematics/${p.slug ?? ""}`
            : `/${corrected}/schematics/${p.slug ?? ""}`,
      });
    }
    throw redirect({ href: "/schematics" });
  },
  loader: async ({ params }) => {
    const lang = parseLocaleParam((params as { locale?: unknown }).locale) ?? DEFAULT_LANGUAGE;
    try {
      const { schematic } = await getPublicSchematic({
        data: { locale: lang, slug: (params as { slug?: string }).slug ?? "" },
      });
      if (!schematic) throw notFound();
      return { schematic, lang };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData, params }) => {
    const lang =
      parseLocaleParam((params as { locale?: unknown } | undefined)?.locale) ?? DEFAULT_LANGUAGE;
    const schematic = (
      loaderData as
        | {
            schematic?: {
              title: string;
              description: string;
              slug: string;
              iconUrl: string | null;
              kind: string;
              completeLocales?: string[];
              slugsByLocale?: Record<string, string>;
            };
          }
        | undefined
    )?.schematic;
    const seo = resolveCmsSeo({
      status: schematic ? "published" : "draft",
      publicPath: schematic
        ? lang === "en"
          ? schematicDetailPath(schematic.slug)
          : `/${lang}${schematicDetailPath(schematic.slug)}`
        : "/schematics",
      ogImageUrl: schematic?.iconUrl ?? null,
      fallbackTitle: schematic ? `${schematic.title} | HawkBucks` : "Schematic | HawkBucks",
      fallbackDescription: schematic
        ? toSafeHeadText(schematic.description, 300)
        : "HawkBucks schematic.",
    });
    if (!schematic) {
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
    const enPath = schematicDetailPath(schematic.slug);
    const self = seo.canonical ?? canonicalUrlFor(localizePath(enPath, lang));
    const alternates = entityHreflangAlternates({
      kind: "schematic",
      currentSlug: schematic.slug,
      completeLocales: schematic.completeLocales ?? [],
      ...(schematic.slugsByLocale ? { slugsByLocale: schematic.slugsByLocale } : {}),
      hreflangOf: hreflangFor,
      localizePath,
      canonicalUrlFor,
    });
    const perkNames =
      "perks" in schematic && Array.isArray((schematic as { perks?: unknown }).perks)
        ? (schematic as { perks: Array<{ name?: unknown }> }).perks
            .map((p) => (typeof p.name === "string" ? p.name : ""))
            .filter((n) => n !== "")
        : [];
    const ld = buildSchematicJsonLd({
      name: schematic.title,
      description: toSafeHeadText(schematic.description, 300),
      url: self,
      image: schematic.iconUrl,
      kind: schematic.kind,
      perkNames,
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
        ...alternates.map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(ld) }],
    };
  },
  component: LocalizedSchematicDetailRoute,
});

function LocalizedSchematicDetailRoute() {
  const { schematic, lang } = Route.useLoaderData() as {
    schematic: import("@/lib/cms/public-schematic-detail.loader").PublicSchematicDetail;
    lang: string;
  };
  return (
    <I18nProvider initialLanguage={lang as never} fixedLanguage={lang as never}>
      <SchematicDetail
        schematic={schematic}
        locale={lang}
        backHref={lang === "en" ? "/schematics" : `/${lang}/schematics`}
      />
    </I18nProvider>
  );
}
