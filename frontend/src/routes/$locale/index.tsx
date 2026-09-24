import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ErrorState } from "@/components/hawkbucks/ErrorState";
import { HomePage } from "@/components/pages/Home";
import { I18nProvider } from "@/i18n/context";
import { resolveLocale } from "@/i18n/config";
import { translate } from "@/i18n/core";
import { missionsQueryOptions, dailyQuoteQueryOptions } from "@/services/missions.loader";
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

function MissionsError() {
  const router = useRouter();
  return (
    <div className="px-4 py-16 sm:px-6">
      <ErrorState onRetry={() => router.invalidate()} />
    </div>
  );
}

export const Route = createFileRoute("/$locale/")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined) {
      throw redirect({ href: corrected === DEFAULT_LANGUAGE ? "/" : `/${corrected}` });
    }
    // Unknown locale prefixes fall back to the bare English route, per the
    // Phase 6 URL strategy (same as /$locale/about, /$locale/vbucks-missions,
    // /$locale/missions-guide).
    throw redirect({ href: "/" });
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(missionsQueryOptions()),
      context.queryClient.ensureQueryData(dailyQuoteQueryOptions()).catch(() => undefined),
    ]);
  },
  head: (ctx) => {
    const param = (ctx.params as { locale?: unknown } | undefined)?.locale;
    const lang = parseLocaleParam(param) ?? DEFAULT_LANGUAGE;
    const self = canonicalUrlFor(localizePath("/", lang));
    return {
      meta: [
        { title: translate("seo.homeTitle", lang) },
        { name: "description", content: translate("seo.homeDescription", lang) },
        { name: "robots", content: "index, follow" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: translate("seo.homeOgTitle", lang) },
        { property: "og:description", content: translate("seo.homeOgDescription", lang) },
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
        { name: "twitter:title", content: translate("seo.homeOgTitle", lang) },
        { name: "twitter:description", content: translate("seo.homeOgDescription", lang) },
        {
          name: "twitter:image",
          content: `${canonicalUrlFor("/").replace(/\/$/, "")}/og-image.png`,
        },
        { name: "twitter:image:alt", content: translate("seo.ogImageAlt", lang) },
      ],
      links: [
        { rel: "canonical", href: self },
        ...hreflangAlternates("/").map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
      scripts: [
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "HawkBucks",
          url: self,
          applicationCategory: "UtilityApplication",
          operatingSystem: "Web",
          browserRequirements: "Requires JavaScript",
          description: translate("seo.webAppDescription", lang),
          inLanguage: resolveLocale(lang),
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      ],
    };
  },
  errorComponent: MissionsError,
  component: LocalizedHomePage,
});

function LocalizedHomePage() {
  const { locale } = Route.useParams() as { locale?: unknown };
  const lang = parseLocaleParam(locale) ?? DEFAULT_LANGUAGE;
  return (
    <I18nProvider initialLanguage={lang} fixedLanguage={lang}>
      <HomePage />
    </I18nProvider>
  );
}
