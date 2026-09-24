import { createFileRoute, redirect } from "@tanstack/react-router";
import { VbucksMissionsPage } from "@/components/pages/VbucksMissions";
import { I18nProvider } from "@/i18n/context";
import { resolveLocale } from "@/i18n/config";
import { translate } from "@/i18n/core";
import { missionsQueryOptions, missionsHistoryQueryOptions } from "@/services/missions.loader";
import {
  canonicalUrlFor,
  hreflangAlternates,
  localizePath,
  matchLocaleParamCaseInsensitive,
  ogLocaleFor,
  parseLocaleParam,
} from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";

export const Route = createFileRoute("/$locale/vbucks-missions")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined) {
      throw redirect({
        href: corrected === DEFAULT_LANGUAGE ? "/vbucks-missions" : `/${corrected}/vbucks-missions`,
      });
    }
    throw redirect({ href: "/vbucks-missions" });
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(missionsQueryOptions()),
      context.queryClient.ensureQueryData(missionsHistoryQueryOptions()).catch(() => undefined),
    ]);
  },
  head: (ctx) => {
    const param = (ctx.params as { locale?: unknown } | undefined)?.locale;
    const lang = parseLocaleParam(param) ?? DEFAULT_LANGUAGE;
    const self = canonicalUrlFor(localizePath("/vbucks-missions", lang));
    return {
      meta: [
        { title: translate("seo.missionsTitle", lang) },
        { name: "description", content: translate("seo.missionsDescription", lang) },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: translate("seo.missionsOgTitle", lang) },
        { property: "og:description", content: translate("seo.missionsOgDescription", lang) },
        { property: "og:type", content: "website" },
        { property: "og:url", content: self },
        {
          property: "og:image",
          content: `${canonicalUrlFor("/").replace(/\/$/, "")}/og-image.png`,
        },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: translate("seo.ogImageAlt", lang) },
        { property: "og:locale", content: ogLocaleFor(resolveLocale(lang)) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: translate("seo.missionsOgTitle", lang) },
        { name: "twitter:description", content: translate("seo.missionsOgDescription", lang) },
        {
          name: "twitter:image",
          content: `${canonicalUrlFor("/").replace(/\/$/, "")}/og-image.png`,
        },
        { name: "twitter:image:alt", content: translate("seo.ogImageAlt", lang) },
      ],
      links: [
        { rel: "canonical", href: self },
        ...hreflangAlternates("/vbucks-missions").map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
    };
  },
  component: LocalizedVbucksMissionsPage,
});

function LocalizedVbucksMissionsPage() {
  const { locale } = Route.useParams() as { locale?: unknown };
  const lang = parseLocaleParam(locale) ?? DEFAULT_LANGUAGE;
  return (
    <I18nProvider initialLanguage={lang} fixedLanguage={lang}>
      <VbucksMissionsPage />
    </I18nProvider>
  );
}
