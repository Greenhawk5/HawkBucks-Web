import { createFileRoute } from "@tanstack/react-router";
import { GuidePage } from "@/components/pages/Guide";
import { jsonLdScript } from "@/lib/seo";
import { buildGuideFaqJsonLd, buildGuideWebPageJsonLd } from "@/lib/guide-faq";
import { STANDARD_VBUCKS_REWARD } from "@/lib/stw-facts";
import { translate } from "@/i18n/core";
import { resolveLocale } from "@/i18n/config";
import { canonicalUrlFor, hreflangAlternates, localizePath, ogLocaleFor } from "@/lib/locale-urls";
import { missionsQueryOptions } from "@/services/missions.loader";

export const Route = createFileRoute("/missions-guide")({
  loader: async ({ context }) => {
    // Prime the same missions cache the tracker uses so the Guide's rotation
    // card renders real counts in the SSR payload (no client fetch on load).
    // Failure is non-fatal: the Guide's teaching content must still render,
    // and the card has its own degraded state.
    await context.queryClient.ensureQueryData(missionsQueryOptions()).catch(() => undefined);
  },
  head: () => {
    const lang = "en" as const;
    const self = canonicalUrlFor(localizePath("/missions-guide", lang));
    const faqParams = { reward: STANDARD_VBUCKS_REWARD };
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
      scripts: [
        jsonLdScript(
          buildGuideWebPageJsonLd({
            pageUrl: self,
            name: translate("guide.title", lang),
            description: translate("seo.guideDescription", lang),
            inLanguage: lang,
          }),
        ),
        jsonLdScript(buildGuideFaqJsonLd(lang, translate, faqParams)),
      ],
    };
  },
  component: GuidePage,
});
