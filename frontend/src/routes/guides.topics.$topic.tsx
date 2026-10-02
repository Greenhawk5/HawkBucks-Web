import { createFileRoute, notFound } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";
import { jsonLdScript } from "@/lib/seo";
import {
  getEditorialCluster,
  clusterTopicFor,
  localizeClusterHref,
} from "@/lib/cms/editorial-clusters";
import { listArticlesByTopic } from "@/lib/cms/public-articles.loader";
import { toSafeHeadText } from "@/lib/cms/public-content";
import { guideDetailPath, guideLocalizePath, guideTopicPath } from "@/lib/cms/guide-paths";
import { resolveCmsSeo } from "@/lib/cms/seo";
import { canonicalUrlFor, hreflangFor, localizePath, ogLocaleFor } from "@/lib/locale-urls";
import { entityHreflangFromComplete } from "@/lib/cms/cluster-seo";
import { resolveLocale } from "@/i18n/config";

type TopicArticleCard = { slug: string; title: string; excerpt: string };

/**
 * Editorial topic landing (cluster discovery surface). Topic slugs are the
 * fixed EDITORIAL_CLUSTERS set (vbucks-missions/heroes/loadouts/inventory);
 * unknown topics 404. Lists published CMS articles for the topic.
 */
export const Route = createFileRoute("/guides/topics/$topic")({
  loader: async ({ params }) => {
    const cluster = getEditorialCluster(params.topic);
    if (!cluster) throw notFound();
    try {
      const topicFilter = clusterTopicFor(cluster.slug);
      if (!topicFilter) return { cluster, articles: [] as TopicArticleCard[] };
      const topic = await listArticlesByTopic({ data: { locale: "en", ...topicFilter } });
      return { cluster, articles: topic.items ?? [] };
    } catch {
      return { cluster, articles: [] as TopicArticleCard[] };
    }
  },
  head: ({ loaderData, params }) => {
    const slug = (params as { topic?: string }).topic ?? "";
    const cluster =
      (loaderData as { cluster?: { title: string; description: string } } | undefined)?.cluster ??
      getEditorialCluster(slug);
    const enPath = guideTopicPath(slug);
    const path = cluster ? enPath : "/guides";
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
        { property: "og:locale", content: ogLocaleFor(resolveLocale("en")) },
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
  component: TopicPage,
});

function TopicPage() {
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
            <p className="mt-2 text-sm">No published articles in this topic yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {articles.map((a) => (
                <li key={a.slug} className="rounded border p-3">
                  <a
                    className="font-semibold underline"
                    href={guideLocalizePath(guideDetailPath(a.slug), "en")}
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
                <a className="underline" href={localizeClusterHref(l.href, "en")}>
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
