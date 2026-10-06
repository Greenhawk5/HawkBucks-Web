import { createFileRoute, notFound } from "@tanstack/react-router";
import { HeroDetail } from "@/components/cms/HeroDetail";
import { I18nProvider } from "@/i18n/context";
import { jsonLdScript } from "@/lib/seo";
import { getPublicHero, type PublicHeroDetail } from "@/lib/cms/public-hero-detail.loader";
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
    // Use the real DTO type rather than a hand-written structural copy. The copy
    // had silently drifted from the loader and blocked every new field (perks,
    // progression, banner) from being reachable here.
    const hero = (loaderData as { hero?: PublicHeroDetail } | undefined)?.hero;
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
    // Reference properties are included only when the reference model actually
    // populated them, so the entity describes what the page renders.
    const stdPerk = hero.perks.find((p) => p.slot === "standard") ?? null;
    const cmdPerk = hero.perks.find((p) => p.slot === "commander") ?? null;
    const ld = buildHeroJsonLd({
      name: hero.title,
      description: toSafeHeadText(hero.summary || hero.description, 300),
      url: self,
      image: hero.bannerUrl || hero.imageUrl,
      heroClass: hero.heroClass,
      breadcrumbBase: `${SITE_URL}/`,
      rarity: hero.rarity,
      category: hero.category,
      standardPerk: stdPerk?.name ?? null,
      commanderPerk: cmdPerk?.name ?? null,
      abilities: hero.abilities.map((a) => a.name),
      maxPower: hero.progression?.maxPower ?? null,
      tierCount: hero.progression?.tierCount ?? null,
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
      { name: "twitter:title", content: seo.ogTitle },
      { name: "twitter:description", content: seo.ogDescription },
      ...(seo.ogImageUrl ? [{ name: "twitter:image", content: seo.ogImageUrl }] : []),
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
