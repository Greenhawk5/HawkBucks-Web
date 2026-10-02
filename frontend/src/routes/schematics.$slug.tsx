import { createFileRoute, notFound } from "@tanstack/react-router";
import { SchematicDetail } from "@/components/cms/SchematicDetail";
import { I18nProvider } from "@/i18n/context";
import { getPublicSchematic } from "@/lib/cms/public-schematic-detail.loader";
import {
  buildSchematicJsonLd,
  schematicDetailPath,
  toSafeHeadText,
} from "@/lib/cms/public-content";
import { buildDetailHead } from "@/lib/cms/entity-meta";
import { canonicalUrlFor } from "@/lib/locale-urls";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/schematics/$slug")({
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
              perks?: Array<{ name?: unknown }>;
            };
          }
        | undefined
    )?.schematic;
    if (!schematic) {
      return {
        meta: [
          { title: "Schematic | HawkBucks" },
          { name: "description", content: "HawkBucks schematic." },
          { name: "robots", content: "noindex, nofollow" },
        ],
        links: [],
        scripts: [],
      };
    }
    const path = schematicDetailPath(schematic.slug);
    const self = canonicalUrlFor(path);
    const perkNames = Array.isArray(schematic.perks)
      ? schematic.perks
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
    return buildDetailHead({
      kind: "schematic",
      detailBasePath: path,
      slug: schematic.slug,
      title: schematic.title,
      description: schematic.description,
      imageUrl: schematic.iconUrl,
      seoTitle: null,
      seoDescription: null,
      completeLocales: schematic.completeLocales ?? [],
      ...(schematic.slugsByLocale ? { slugsByLocale: schematic.slugsByLocale } : {}),
      jsonLd: ld,
    });
  },
  component: SchematicDetailRoute,
});

function SchematicDetailRoute() {
  const { schematic } = Route.useLoaderData() as {
    schematic: import("@/lib/cms/public-schematic-detail.loader").PublicSchematicDetail;
  };
  return (
    <I18nProvider initialLanguage="en" fixedLanguage="en">
      <SchematicDetail schematic={schematic} locale="en" backHref="/schematics" />
    </I18nProvider>
  );
}
