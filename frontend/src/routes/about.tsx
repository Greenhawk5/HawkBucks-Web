import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/pages/About";
import { jsonLdScript } from "@/lib/seo";
import { translate } from "@/i18n/core";
import { resolveLocale } from "@/i18n/config";
import { canonicalUrlFor, hreflangAlternates, localizePath, ogLocaleFor } from "@/lib/locale-urls";
import { BRAND_NAME } from "@/lib/site";

export const Route = createFileRoute("/about")({
  // Bare head is intentionally English-deterministic (never cookie-dependent):
  // crawlers and users on the same URL always get the same canonical tags.
  head: () => {
    const lang = "en" as const;
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
        // The page no longer carries a mission FAQ (that content belongs to the
        // V-Bucks Mission Basics page), so the old FAQPage schema is gone. What
        // remains describes the page and points at the site-level WebSite node
        // already emitted by the root route — the site-wide Organization is NOT
        // restated here, and there is no Product schema, no reviews, no ratings
        // and no invented organization properties.
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
  component: AboutPage,
});
