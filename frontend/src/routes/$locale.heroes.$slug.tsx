import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { HeroDetail } from "@/components/cms/HeroDetail";
import { I18nProvider } from "@/i18n/context";
import { jsonLdScript } from "@/lib/seo";
import { getPublicHero, type PublicHeroDetail } from "@/lib/cms/public-hero-detail.loader";
import { getPublicFeatureStatus } from "@/lib/cms/feature-availability.loader";
import { SectionUnavailableState } from "@/components/cms/SectionUnavailableState";
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
    const { config } = await getPublicFeatureStatus();
    if (!config.heroes.enabled) {
      return {
        available: false as const,
        unavailableMessage: config.heroes.message,
        hero: null,
        lang,
      };
    }
    try {
      const { hero } = await getPublicHero({
        data: { locale: lang, slug: (params as { slug?: string }).slug ?? "" },
      });
      if (!hero) throw notFound();
      return { available: true as const, unavailableMessage: "", hero, lang };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData, params }) => {
    const data = loaderData as
      | {
          available?: boolean;
          unavailableMessage?: string;
          hero?: PublicHeroDetail | null;
          lang?: string;
        }
      | undefined;

    if (data?.available === false) {
      return {
        meta: [
          { title: "Heroes Temporarily Unavailable — HawkBucks" },
          { name: "description", content: "The Heroes section is temporarily unavailable." },
          { name: "robots", content: "noindex, nofollow" },
        ],
        links: [],
        scripts: [],
      };
    }

    const lang =
      parseLocaleParam((params as { locale?: unknown } | undefined)?.locale) ?? DEFAULT_LANGUAGE;
    const hero = data?.hero;
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
        { name: "twitter:title", content: seo.ogTitle },
        { name: "twitter:description", content: seo.ogDescription },
        ...(seo.ogImageUrl ? [{ name: "twitter:image", content: seo.ogImageUrl }] : []),
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
  const data = Route.useLoaderData();
  if (!data.available || !data.hero) {
    return <SectionUnavailableState section="heroes" message={data.unavailableMessage} />;
  }
  return (
    <I18nProvider initialLanguage={data.lang as never} fixedLanguage={data.lang as never}>
      <HeroDetail
        hero={data.hero}
        locale={data.lang}
        backHref={data.lang === "en" ? "/heroes" : `/${data.lang}/heroes`}
      />
    </I18nProvider>
  );
}
