import { createFileRoute, redirect } from "@tanstack/react-router";
import { GuidePage } from "@/components/pages/Guide";
import { I18nProvider } from "@/i18n/context";
import { resolveLocale } from "@/i18n/config";
import { translate } from "@/i18n/core";
import { jsonLdScript } from "@/lib/seo";
import { buildGuideFaqJsonLd, buildGuideWebPageJsonLd } from "@/lib/guide-faq";
import { STANDARD_VBUCKS_REWARD } from "@/lib/stw-facts";
import {
  canonicalUrlFor,
  hreflangAlternates,
  localizePath,
  matchLocaleParamCaseInsensitive,
  ogLocaleFor,
  parseLocaleParam,
} from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { missionsQueryOptions } from "@/services/missions.loader";

export const Route = createFileRoute("/$locale/missions-guide")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined) {
      throw redirect({
        href: corrected === DEFAULT_LANGUAGE ? "/missions-guide" : `/${corrected}/missions-guide`,
      });
    }
    throw redirect({ href: "/missions-guide" });
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(missionsQueryOptions()).catch(() => undefined);
  },
  head: (ctx) => {
    const param = (ctx.params as { locale?: unknown } | undefined)?.locale;
    const lang = parseLocaleParam(param) ?? DEFAULT_LANGUAGE;
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
  component: LocalizedGuidePage,
});

function LocalizedGuidePage() {
  const { locale } = Route.useParams() as { locale?: unknown };
  const lang = parseLocaleParam(locale) ?? DEFAULT_LANGUAGE;
  return (
    <I18nProvider initialLanguage={lang} fixedLanguage={lang}>
      <GuidePage />
    </I18nProvider>
  );
}
