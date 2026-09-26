import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
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
import {
  canonicalUrlFor,
  hreflangFor,
  localizePath,
  matchLocaleParamCaseInsensitive,
  parseLocaleParam,
} from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/$locale/heroes/$slug")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined) {
      const p = params as { slug?: string };
      throw redirect({
        href:
          corrected === DEFAULT_LANGUAGE
            ? `/heroes/${p.slug ?? ""}`
            : `/${corrected}/heroes/${p.slug ?? ""}`,
      });
    }
    throw redirect({ href: "/heroes" });
  },
  loader: async ({ params }) => {
    const lang = parseLocaleParam((params as { locale?: unknown }).locale) ?? DEFAULT_LANGUAGE;
    try {
      const { hero } = await getPublicHero({
        data: { locale: lang, slug: (params as { slug?: string }).slug ?? "" },
      });
      if (!hero) throw notFound();
      return { hero, lang };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData, params }) => {
    const lang =
      parseLocaleParam((params as { locale?: unknown } | undefined)?.locale) ?? DEFAULT_LANGUAGE;
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
              completeLocales?: string[];
              slugsByLocale?: Record<string, string>;
            };
          }
        | undefined
    )?.hero;
    const seo = resolveCmsSeo({
      status: hero ? "published" : "draft",
      publicPath: hero
        ? lang === "en"
          ? heroDetailPath(hero.slug)
          : `/${lang}${heroDetailPath(hero.slug)}`
        : "/heroes",
      seoTitle: hero?.seoTitle ?? null,
      seoDescription: hero?.seoDescription ?? null,
      ogImageUrl: hero?.imageUrl ?? null,
      fallbackTitle: hero ? `${hero.title} | HawkBucks` : "Hero | HawkBucks",
      fallbackDescription: hero ? toSafeHeadText(hero.description, 300) : "HawkBucks hero.",
    });
    // Missing entity (not-found render): never emit a canonical or hreflang
    // alternates. entityHreflangAlternates always emits en + x-default, which
    // would be misleading fallback alternates for a 404 path.
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
    const enPath = heroDetailPath(hero.slug);
    const self = seo.canonical ?? canonicalUrlFor(localizePath(enPath, lang));
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
  component: LocalizedHeroDetailRoute,
});
function LocalizedHeroDetailRoute() {
  const { hero, lang } = Route.useLoaderData() as {
    hero: import("@/lib/cms/public-hero-detail.loader").PublicHeroDetail;
    lang: string;
  };
  return (
    <I18nProvider initialLanguage={lang as never} fixedLanguage={lang as never}>
      <HeroDetail
        hero={hero}
        locale={lang}
        backHref={lang === "en" ? "/heroes" : `/${lang}/heroes`}
      />
    </I18nProvider>
  );
}
