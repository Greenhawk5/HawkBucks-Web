import { createFileRoute, redirect } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";
import {
  canonicalUrlFor,
  hreflangAlternates,
  localizePath,
  matchLocaleParamCaseInsensitive,
  ogLocaleFor,
  parseLocaleParam,
} from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { resolveLocale } from "@/i18n/config";
import {
  EDITORIAL_CLUSTERS,
  clusterLandingPath,
  localizeClusterHref,
} from "@/lib/cms/editorial-clusters";

export const Route = createFileRoute("/$locale/guides")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined)
      throw redirect({ href: corrected === DEFAULT_LANGUAGE ? "/guides" : `/${corrected}/guides` });
    throw redirect({ href: "/guides" });
  },
  head: (ctx) => {
    const param = (ctx.params as { locale?: unknown } | undefined)?.locale;
    const lang = parseLocaleParam(param) ?? DEFAULT_LANGUAGE;
    const self = canonicalUrlFor(localizePath("/guides", lang));
    return {
      meta: [
        { title: "Guides | HawkBucks" },
        { name: "description", content: "HawkBucks guides." },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: "Guides | HawkBucks" },
        { property: "og:description", content: "HawkBucks guides." },
        { property: "og:type", content: "website" },
        { property: "og:url", content: self },
        { property: "og:locale", content: ogLocaleFor(resolveLocale(lang)) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Guides | HawkBucks" },
        { name: "twitter:description", content: "HawkBucks guides." },
      ],
      links: [
        { rel: "canonical", href: self },
        ...hreflangAlternates("/guides").map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
    };
  },
  component: LocalizedGuidesIndex,
});

function LocalizedGuidesIndex() {
  const { locale } = Route.useParams() as { locale?: unknown };
  const lang = parseLocaleParam(locale) ?? DEFAULT_LANGUAGE;
  return (
    <I18nProvider initialLanguage={lang as never} fixedLanguage={lang as never}>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold">Guides</h1>
        <ul className="mt-4 space-y-4">
          {EDITORIAL_CLUSTERS.map((c) => (
            <li key={c.slug} className="rounded border p-4">
              <a
                className="text-lg font-semibold underline"
                href={localizeClusterHref(clusterLandingPath(c.slug), lang)}
              >
                {c.title}
              </a>
              <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
            </li>
          ))}
        </ul>
      </main>
    </I18nProvider>
  );
}
