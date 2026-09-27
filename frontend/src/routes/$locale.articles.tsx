import { createFileRoute, redirect } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";
import { translate } from "@/i18n/core";
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
import { listPublicArticles } from "@/lib/cms/public-articles.loader";
import { articleDetailPath } from "@/lib/cms/articles";

export const Route = createFileRoute("/$locale/articles")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined)
      throw redirect({
        href: corrected === DEFAULT_LANGUAGE ? "/articles" : `/${corrected}/articles`,
      });
    throw redirect({ href: "/articles" });
  },
  loader: async ({ params }) => {
    const lang = parseLocaleParam((params as { locale?: unknown }).locale) ?? DEFAULT_LANGUAGE;
    try {
      const result = await listPublicArticles({ data: { locale: lang } });
      return { ...result, lang };
    } catch {
      return { items: [], total: 0, lang };
    }
  },
  head: (ctx) => {
    const param = (ctx.params as { locale?: unknown } | undefined)?.locale;
    const lang = parseLocaleParam(param) ?? DEFAULT_LANGUAGE;
    const self = canonicalUrlFor(localizePath("/articles", lang));
    return {
      meta: [
        { title: translate("seo.articlesTitle", lang) },
        { name: "description", content: translate("seo.articlesDescription", lang) },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: translate("seo.articlesTitle", lang) },
        { property: "og:url", content: self },
        { property: "og:locale", content: ogLocaleFor(resolveLocale(lang)) },
      ],
      links: [
        { rel: "canonical", href: self },
        ...hreflangAlternates("/articles").map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
    };
  },
  component: LocalizedArticlesListing,
});

function LocalizedArticlesListing() {
  const data = Route.useLoaderData() as {
    items: Array<{ slug: string; title: string }>;
    lang: string;
  };
  const prefix = data.lang === "en" ? "" : `/${data.lang}`;
  return (
    <I18nProvider initialLanguage={data.lang as never} fixedLanguage={data.lang as never}>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold">Articles</h1>
        {data.items.length === 0 ? (
          <p className="mt-4 text-sm">No published articles yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {data.items.map((item) => (
              <li key={item.slug}>
                <a className="underline" href={`${prefix}${articleDetailPath(item.slug)}`}>
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </I18nProvider>
  );
}
