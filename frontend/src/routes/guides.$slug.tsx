import { createFileRoute, notFound } from "@tanstack/react-router";
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
  hreflangAlternates,
  localizePath,
  ogLocaleFor,
} from "@/lib/locale-urls";
import { entityHreflangFromComplete } from "@/lib/cms/cluster-seo";
import { resolveLocale } from "@/i18n/config";
import { SITE_URL } from "@/lib/site";

type ClusterArticleCard = { slug: string; title: string; excerpt: string };

export const Route = createFileRoute("/guides/$slug")({
  loader: async ({ params }) => {
    const cluster = getEditorialCluster(params.slug);
    if (!cluster) throw notFound();
    try {
      // Fail closed: no topic mapping means an empty listing, never the
      // unfiltered article index.
      const topicFilter = clusterTopicFor(cluster.slug);
      if (!topicFilter) return { cluster, articles: [] as ClusterArticleCard[] };
      const topic = await listArticlesByTopic({ data: { locale: "en", ...topicFilter } });
      return { cluster, articles: topic.items ?? [] };
    } catch {
      return { cluster, articles: [] as ClusterArticleCard[] };
    }
  },
  head: ({ loaderData, params }) => {
    const slug = (params as { slug?: string }).slug ?? "";
    const cluster =
      (loaderData as { cluster?: { title: string; description: string } } | undefined)?.cluster ??
      getEditorialCluster(slug);
    const path = cluster ? clusterLandingPath(slug) : "/guides";
    const seo = resolveCmsSeo({
      status: cluster ? "published" : "draft",
      publicPath: path,
      seoTitle: cluster ? `${cluster.title} guides` : null,
      seoDescription: cluster?.description ?? null,
      fallbackTitle: cluster ? `${cluster.title} | HawkBucks` : "Guides | HawkBucks",
      fallbackDescription: cluster?.description ?? "HawkBucks guides.",
    });
    if (!cluster) {
      return { meta: [{ title: seo.title }, { name: "robots", content: seo.robots }], links: [] };
    }
    const self = seo.canonical ?? canonicalUrlFor(path);
    const alternates = entityHreflangFromComplete(path, hreflangFor, localizePath, canonicalUrlFor);
    const ld = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: toSafeHeadText(cluster.title, 120),
      description: toSafeHeadText(cluster.description, 300),
      url: self,
    };
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.description },
        { name: "robots", content: seo.robots },
        { property: "og:title", content: seo.ogTitle },
        { property: "og:description", content: seo.ogDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: self },
        { property: "og:locale", content: ogLocaleFor(resolveLocale("en")) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: seo.ogTitle },
        { name: "twitter:description", content: seo.ogDescription },
      ],
      links: [
        { rel: "canonical", href: self },
        ...alternates.map(({ hreflang, href }) => ({ rel: "alternate", hrefLang: hreflang, href })),
        ...(hreflangAlternates(path).length ? [] : []),
      ],
      scripts: [jsonLdScript(ld)],
    };
  },
  component: ClusterPage,
});

function ClusterPage() {
  const { cluster, articles } = Route.useLoaderData() as {
    cluster: import("@/lib/cms/editorial-clusters").EditorialCluster;
    articles: Array<{ slug: string; title: string; excerpt: string }>;
  };
  return (
    <I18nProvider initialLanguage="en" fixedLanguage="en">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <a className="underline" href="/guides">
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
            <p className="mt-2 text-sm">No published articles in this cluster yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {articles.map((a) => (
                <li key={a.slug} className="rounded border p-3">
                  <a className="font-semibold underline" href={articleDetailPath(a.slug)}>
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
                <a className="underline" href={localizeClusterHref(l.href, "en")}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
        <p className="mt-8 text-xs text-muted-foreground">
          Canonical: {`${SITE_URL}${clusterLandingPath(cluster.slug)}`}
        </p>
      </main>
    </I18nProvider>
  );
}
