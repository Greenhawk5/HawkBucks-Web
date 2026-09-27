import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";
import { jsonLdScript } from "@/lib/seo";
import {
  getEditorialCluster,
  clusterLandingPath,
  clusterTopicFor,
  localizeClusterHref,
} from "@/lib/cms/editorial-clusters";
import { listArticlesByTopic } from "@/lib/cms/public-articles.loader";
import { articleDetailPath, toSafeHeadText } from "@/lib/cms/public-content";
import { resolveCmsSeo } from "@/lib/cms/seo";
import {
  canonicalUrlFor,
  hreflangFor,
  localizePath,
  matchLocaleParamCaseInsensitive,
  ogLocaleFor,
  parseLocaleParam,
} from "@/lib/locale-urls";
import { entityHreflangFromComplete } from "@/lib/cms/cluster-seo";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { resolveLocale } from "@/i18n/config";
import { articleLocalizePath } from "@/lib/cms/articles";

type LocalizedClusterArticleCard = { slug: string; title: string; excerpt: string };

export const Route = createFileRoute("/$locale/guides/$slug")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    const p = params as { slug?: string };
    if (corrected !== undefined) {
      throw redirect({
        href:
          corrected === DEFAULT_LANGUAGE
            ? `/guides/${p.slug ?? ""}`
            : `/${corrected}/guides/${p.slug ?? ""}`,
      });
    }
    throw redirect({ href: "/guides" });
  },
  loader: async ({ params }) => {
    const lang = parseLocaleParam((params as { locale?: unknown }).locale) ?? DEFAULT_LANGUAGE;
    const slug = (params as { slug?: string }).slug ?? "";
    const cluster = getEditorialCluster(slug);
    if (!cluster) throw notFound();
    try {
      // Fail closed: no topic mapping means an empty listing, never the
      // unfiltered article index.
      const topicFilter = clusterTopicFor(cluster.slug);
      if (!topicFilter) return { cluster, articles: [] as LocalizedClusterArticleCard[], lang };
      const topic = await listArticlesByTopic({ data: { locale: lang, ...topicFilter } });
      return { cluster, articles: topic.items ?? [], lang };
    } catch {
      return {
        cluster,
        articles: [] as LocalizedClusterArticleCard[],
        lang,
      };
    }
  },
  head: ({ loaderData, params }) => {
    const lang =
      parseLocaleParam((params as { locale?: unknown } | undefined)?.locale) ?? DEFAULT_LANGUAGE;
    const slug = (params as { slug?: string }).slug ?? "";
    const cluster =
      (loaderData as { cluster?: { title: string; description: string } } | undefined)?.cluster ??
      getEditorialCluster(slug);
    const enPath = clusterLandingPath(slug);
    const path = lang === "en" ? enPath : `/${lang}${enPath}`;
    const seo = resolveCmsSeo({
      status: cluster ? "published" : "draft",
      publicPath: path,
      seoTitle: cluster ? `${cluster.title} guides` : null,
      seoDescription: cluster?.description ?? null,
      fallbackTitle: cluster ? `${cluster.title} | HawkBucks` : "Guides | HawkBucks",
      fallbackDescription: cluster?.description ?? "HawkBucks guides.",
    });
    if (!cluster)
      return { meta: [{ title: seo.title }, { name: "robots", content: seo.robots }], links: [] };
    const self = seo.canonical ?? canonicalUrlFor(localizePath(enPath, lang));
    const alternates = entityHreflangFromComplete(
      enPath,
      hreflangFor,
      localizePath,
      canonicalUrlFor,
    );
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.description },
        { name: "robots", content: seo.robots },
        { property: "og:title", content: seo.ogTitle },
        { property: "og:description", content: seo.ogDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: self },
        { property: "og:locale", content: ogLocaleFor(resolveLocale(lang)) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: seo.ogTitle },
        { name: "twitter:description", content: seo.ogDescription },
      ],
      links: [
        { rel: "canonical", href: self },
        ...alternates.map(({ hreflang, href }) => ({ rel: "alternate", hrefLang: hreflang, href })),
      ],
      scripts: [
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: toSafeHeadText(cluster.title, 120),
          url: self,
        }),
      ],
    };
  },
  component: LocalizedClusterPage,
});

function LocalizedClusterPage() {
  const { cluster, articles, lang } = Route.useLoaderData() as {
    cluster: import("@/lib/cms/editorial-clusters").EditorialCluster;
    articles: Array<{ slug: string; title: string; excerpt: string }>;
    lang: string;
  };
  return (
    <I18nProvider initialLanguage={lang as never} fixedLanguage={lang as never}>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mt-4 text-3xl font-bold">{cluster.title}</h1>
        <p className="mt-2 text-muted-foreground">{cluster.description}</p>
        <section aria-label="Editorial articles" className="mt-8">
          <h2 className="text-xl font-bold">Editorial articles</h2>
          {articles.length === 0 ? (
            <p className="mt-2 text-sm">No published articles in this cluster yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {articles.map((a) => (
                <li key={a.slug} className="rounded border p-3">
                  <a
                    className="font-semibold underline"
                    href={articleLocalizePath(articleDetailPath(a.slug), lang)}
                  >
                    {a.title}
                  </a>
                  {a.excerpt ? (
                    <p className="mt-1 text-sm text-muted-foreground">{a.excerpt}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-label="Related indexes" className="mt-8">
          <h2 className="text-xl font-bold">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {cluster.links.map((l) => (
              <li key={l.href}>
                <a className="underline" href={localizeClusterHref(l.href, lang)}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </I18nProvider>
  );
}
