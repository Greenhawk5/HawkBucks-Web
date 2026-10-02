import { createFileRoute, redirect } from "@tanstack/react-router";
import { AboutPage } from "@/components/pages/About";
import { I18nProvider } from "@/i18n/context";
import { resolveLocale } from "@/i18n/config";
import { translate } from "@/i18n/core";
import { jsonLdScript } from "@/lib/seo";
import {
  canonicalUrlFor,
  hreflangAlternates,
  localizePath,
  matchLocaleParamCaseInsensitive,
  ogLocaleFor,
  parseLocaleParam,
} from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { BRAND_NAME } from "@/lib/site";

export const Route = createFileRoute("/$locale/about")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined) {
      throw redirect({
        href: corrected === DEFAULT_LANGUAGE ? "/about" : `/${corrected}/about`,
      });
    }
    throw redirect({ href: "/about" });
  },
  head: (ctx) => {
    const param = (ctx.params as { locale?: unknown } | undefined)?.locale;
    const lang = parseLocaleParam(param) ?? DEFAULT_LANGUAGE;
    const self = canonicalUrlFor(localizePath("/about", lang));
    return {
      meta: [
        { title: translate("seo.aboutTitle", lang) },
        { name: "description", content: translate("seo.aboutDescription", lang) },
        { property: "og:title", content: translate("seo.aboutOgTitle", lang) },
        { property: "og:description", content: translate("seo.aboutOgDescription", lang) },
        { property: "og:url", content: self },
        {
          property: "og:image",
          content: `${canonicalUrlFor("/").replace(/\/$/, "")}/og-image.png`,
        },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: translate("seo.ogImageAlt", lang) },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: ogLocaleFor(resolveLocale(lang)) },
        { name: "robots", content: "index, follow" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: translate("seo.aboutOgTitle", lang) },
        { name: "twitter:description", content: translate("seo.aboutOgDescription", lang) },
        {
          name: "twitter:image",
          content: `${canonicalUrlFor("/").replace(/\/$/, "")}/og-image.png`,
        },
        { name: "twitter:image:alt", content: translate("seo.ogImageAlt", lang) },
      ],
      links: [
        { rel: "canonical", href: self },
        ...hreflangAlternates("/about").map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
      scripts: [
        // Mirrors the bare route: the mission FAQ moved to V-Bucks Mission
        // Basics, so this page describes the project instead of a FAQPage, and
        // references the site-level WebSite node the root route already emits.
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: translate("seo.aboutTitle", lang),
          description: translate("seo.aboutDescription", lang),
          url: self,
          inLanguage: lang,
          isPartOf: {
            "@type": "WebSite",
            name: BRAND_NAME,
            url: canonicalUrlFor("/"),
          },
        }),
      ],
    };
  },
  component: LocalizedAboutPage,
});

function LocalizedAboutPage() {
  const { locale } = Route.useParams() as { locale?: unknown };
  const lang = parseLocaleParam(locale) ?? DEFAULT_LANGUAGE;
  return (
    <I18nProvider initialLanguage={lang} fixedLanguage={lang}>
      <AboutPage />
    </I18nProvider>
  );
}
