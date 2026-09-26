import { createFileRoute, notFound } from "@tanstack/react-router";
import { HeroDetail } from "@/components/cms/HeroDetail";
import { I18nProvider } from "@/i18n/context";
import { jsonLdScript } from "@/lib/seo";
import { getPublicHero } from "@/lib/cms/public-hero-detail.loader";
import {
  buildHeroJsonLd,
  entityHreflangAlternates,
  heroDetailPath,
  toSafeHeadText,
} from "@/lib/cms/public-content";
import { resolveCmsSeo } from "@/lib/cms/seo";
import { canonicalUrlFor, hreflangFor, localizePath } from "@/lib/locale-urls";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/heroes/$slug")({
  loader: async ({ params }) => {
    try {
      const { hero } = await getPublicHero({ data: { locale: "en", slug: params.slug } });
      if (!hero) throw notFound();
      return { hero };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const hero = (
      loaderData as
        | {
            hero?: {
              title: string;
              description: string;
              slug: string;
              imageUrl: string | null;
              heroClass: string;
              seoTitle: string | null;
              seoDescription: string | null;
              translationStatus?: string;
              completeLocales?: string[];
              slugsByLocale?: Record<string, string>;
            };
          }
        | undefined
    )?.hero;
    const path = hero ? heroDetailPath(hero.slug) : "/heroes";
    const basePath = hero ? path : "/heroes";
    const seo = resolveCmsSeo({
      status: hero ? "published" : "draft",
      publicPath: path,
      seoTitle: hero?.seoTitle ?? null,
      seoDescription: hero?.seoDescription ?? null,
      ogImageUrl: hero?.imageUrl ?? null,
      fallbackTitle: hero ? `${hero.title} | HawkBucks` : "Hero | HawkBucks",
      fallbackDescription: hero ? toSafeHeadText(hero.description, 300) : "HawkBucks hero.",
    });
    if (!hero) {
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
    const self = seo.canonical ?? canonicalUrlFor(localizePath(basePath, "en"));
    // Per-entity hreflang (Phase 11 contract): only complete translations,
    // each with its own localized slug.
    const alternates = entityHreflangAlternates({
      kind: "hero",
      currentSlug: hero.slug,
      completeLocales: hero.completeLocales ?? [],
      ...(hero.slugsByLocale ? { slugsByLocale: hero.slugsByLocale } : {}),
      hreflangOf: hreflangFor,
      localizePath,
      canonicalUrlFor,
    });
    const ld = buildHeroJsonLd({
      name: hero.title,
      description: toSafeHeadText(hero.description, 300),
      url: self,
      image: hero.imageUrl,
      heroClass: hero.heroClass,
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
  component: HeroDetailRoute,
});
function HeroDetailRoute() {
  const { hero } = Route.useLoaderData() as {
    hero: import("@/lib/cms/public-hero-detail.loader").PublicHeroDetail;
  };
  return (
    <I18nProvider initialLanguage="en" fixedLanguage="en">
      <HeroDetail hero={hero} locale="en" backHref="/heroes" />
    </I18nProvider>
  );
}
