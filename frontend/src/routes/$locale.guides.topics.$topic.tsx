import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";
import { jsonLdScript } from "@/lib/seo";
import {
  getEditorialCluster,
  clusterTopicFor,
  localizeClusterHref,
} from "@/lib/cms/editorial-clusters";
import { listArticlesByTopic } from "@/lib/cms/public-articles.loader";
import { getPublicFeatureStatus } from "@/lib/cms/feature-availability.loader";
import { SectionUnavailableState } from "@/components/cms/SectionUnavailableState";
import { toSafeHeadText } from "@/lib/cms/public-content";
import { guideDetailPath, guideLocalizePath, guideTopicPath } from "@/lib/cms/guide-paths";
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

export const Route = createFileRoute("/$locale/guides/topics/$topic")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    const p = params as { topic?: string };
    if (corrected !== undefined) {
      throw redirect({
        href:
          corrected === DEFAULT_LANGUAGE
            ? `/guides/topics/${p.topic ?? ""}`
            : `/${corrected}/guides/topics/${p.topic ?? ""}`,
      });
    }
    throw redirect({ href: "/guides" });
  },
  loader: async ({ params }) => {
    const lang = parseLocaleParam((params as { locale?: unknown }).locale) ?? DEFAULT_LANGUAGE;
    const { config } = await getPublicFeatureStatus();
    if (!config.guides.enabled) {
      return {
        available: false as const,
        unavailableMessage: config.guides.message,
        cluster: null,
        articles: [] as Array<{ slug: string; title: string; excerpt: string }>,
        lang,
      };
    }
    const topic = (params as { topic?: string }).topic ?? "";
    const cluster = getEditorialCluster(topic);
    if (!cluster) throw notFound();
    try {
      const topicFilter = clusterTopicFor(cluster.slug);
      if (!topicFilter)
        return {
          available: true as const,
          unavailableMessage: "",
          cluster,
          articles: [] as Array<{ slug: string; title: string; excerpt: string }>,
          lang,
        };
      const result = await listArticlesByTopic({ data: { locale: lang, ...topicFilter } });
      return {
        available: true as const,
        unavailableMessage: "",
        cluster,
        articles: result.items ?? [],
        lang,
      };
    } catch {
      return {
        available: true as const,
        unavailableMessage: "",
        cluster,
        articles: [] as Array<{ slug: string; title: string; excerpt: string }>,
        lang,
      };
    }
  },
  head: ({ loaderData, params }) => {
    const data = loaderData as { available?: boolean } | undefined;
    if (data?.available === false) {
      return {
        meta: [
          { title: "Guides Temporarily Unavailable — HawkBucks" },
          { name: "description", content: "The Guides section is temporarily unavailable." },
          { name: "robots", content: "noindex, nofollow" },
        ],
        links: [],
      };
    }

    const lang =
      parseLocaleParam((params as { locale?: unknown } | undefined)?.locale) ?? DEFAULT_LANGUAGE;
    const slug = (params as { topic?: string }).topic ?? "";
    const cluster =
      (loaderData as { cluster?: { title: string; description: string } } | undefined)?.cluster ??
      getEditorialCluster(slug);
    const enPath = guideTopicPath(slug);
    const path = cluster ? (lang === "en" ? enPath : `/${lang}${enPath}`) : "/guides";
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
          description: toSafeHeadText(cluster.description, 300),
          url: self,
        }),
      ],
    };
  },
  component: LocalizedTopicPage,
});

function LocalizedTopicPage() {
  const data = Route.useLoaderData();
  if (!data.available || !data.cluster) {
    return (
      <I18nProvider initialLanguage={data.lang as never} fixedLanguage={data.lang as never}>
        <SectionUnavailableState section="guides" message={data.unavailableMessage} />
      </I18nProvider>
    );
  }
  const { cluster, articles, lang } = data;
  return (
    <I18nProvider initialLanguage={lang as never} fixedLanguage={lang as never}>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <a className="underline" href={lang === "en" ? "/guides" : `/${lang}/guides`}>
            Guides
          </a>
          <span aria-hidden="true"> / </span>
          <span>{cluster.title}</span>
        </nav>
        <h1 className="mt-4 text-3xl font-bold">{cluster.title}</h1>
        <p className="mt-2 text-muted-foreground">{cluster.description}</p>
        <section aria-label="Editorial articles" className="mt-8">
          <h2 className="text-xl font-bold">Editorial articles</h2>
          {articles.length === 0 ? (
            <p className="mt-2 text-sm">No published articles in this topic yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {articles.map((a) => (
                <li key={a.slug} className="rounded border p-3">
                  <a
                    className="font-semibold underline"
                    href={guideLocalizePath(guideDetailPath(a.slug), lang)}
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
