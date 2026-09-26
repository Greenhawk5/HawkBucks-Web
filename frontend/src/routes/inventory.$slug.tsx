import { createFileRoute, notFound } from "@tanstack/react-router";
import { SchematicDetail } from "@/components/cms/SchematicDetail";
import { I18nProvider } from "@/i18n/context";
import { jsonLdScript } from "@/lib/seo";
import { getPublicSchematic } from "@/lib/cms/public-schematic-detail.loader";
import {
  buildSchematicJsonLd,
  entityHreflangAlternates,
  schematicDetailPath,
  toSafeHeadText,
} from "@/lib/cms/public-content";
import { resolveCmsSeo } from "@/lib/cms/seo";
import { canonicalUrlFor, hreflangFor, localizePath } from "@/lib/locale-urls";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/inventory/$slug")({
  loader: async ({ params }) => {
    try {
      const { schematic } = await getPublicSchematic({
        data: { locale: "en", slug: params.slug },
      });
      if (!schematic) throw notFound();
      return { schematic };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
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
    const path = schematic ? schematicDetailPath(schematic.slug) : "/inventory";
    const seo = resolveCmsSeo({
      status: schematic ? "published" : "draft",
      publicPath: path,
      ogImageUrl: schematic?.iconUrl ?? null,
      fallbackTitle: schematic ? `${schematic.title} | HawkBucks` : "Schematic | HawkBucks",
      fallbackDescription: schematic
        ? toSafeHeadText(schematic.description, 300)
        : "HawkBucks schematic.",
    });
    const self = seo.canonical ?? canonicalUrlFor(localizePath(path, "en"));
    const alternates = entityHreflangAlternates({
      kind: "schematic",
      currentSlug: schematic?.slug ?? "",
      completeLocales: schematic?.completeLocales ?? [],
      ...(schematic?.slugsByLocale ? { slugsByLocale: schematic.slugsByLocale } : {}),
      hreflangOf: hreflangFor,
      localizePath,
      canonicalUrlFor,
    });
    const perkNames =
      schematic && "perks" in schematic && Array.isArray((schematic as { perks?: unknown }).perks)
        ? (schematic as { perks: Array<{ name?: unknown }> }).perks
            .map((p) => (typeof p.name === "string" ? p.name : ""))
            .filter((n) => n !== "")
        : [];
    const ld = schematic
      ? buildSchematicJsonLd({
          name: schematic.title,
          description: toSafeHeadText(schematic.description, 300),
          url: self,
          image: schematic.iconUrl,
          kind: schematic.kind,
          perkNames,
          breadcrumbBase: `${SITE_URL}/`,
        })
      : null;
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
      scripts: ld ? [jsonLdScript(ld)] : [],
    };
  },
  component: SchematicDetailRoute,
});

function SchematicDetailRoute() {
  const { schematic } = Route.useLoaderData() as {
    schematic: import("@/lib/cms/public-schematic-detail.loader").PublicSchematicDetail;
  };
  return (
    <I18nProvider initialLanguage="en" fixedLanguage="en">
      <SchematicDetail schematic={schematic} locale="en" backHref="/inventory" />
    </I18nProvider>
  );
}
