import { createFileRoute } from "@tanstack/react-router";
import { GuidePage } from "@/components/pages/Guide";
import { jsonLdScript } from "@/lib/seo";
import { buildGuideFaqJsonLd } from "@/lib/guide-faq";
import { translate } from "@/i18n/core";
import { resolveLocale } from "@/i18n/config";
import { canonicalUrlFor, hreflangAlternates, localizePath, ogLocaleFor } from "@/lib/locale-urls";

export const Route = createFileRoute("/missions-guide")({
  head: () => {
    const lang = "en" as const;
    const self = canonicalUrlFor(localizePath("/missions-guide", lang));
    return {
      meta: [
        { title: translate("seo.guideTitle", lang) },
        { name: "description", content: translate("seo.guideDescription", lang) },
        { property: "og:title", content: translate("seo.guideOgTitle", lang) },
        { property: "og:description", content: translate("seo.guideOgDescription", lang) },
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
        { name: "twitter:title", content: translate("seo.guideOgTitle", lang) },
        { name: "twitter:description", content: translate("seo.guideOgDescription", lang) },
        {
          name: "twitter:image",
          content: `${canonicalUrlFor("/").replace(/\/$/, "")}/og-image.png`,
        },
        { name: "twitter:image:alt", content: translate("seo.ogImageAlt", lang) },
      ],
      links: [
        { rel: "canonical", href: self },
        ...hreflangAlternates("/missions-guide").map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
      scripts: [jsonLdScript(buildGuideFaqJsonLd(lang, translate))],
    };
  },
  component: GuidePage,
});
