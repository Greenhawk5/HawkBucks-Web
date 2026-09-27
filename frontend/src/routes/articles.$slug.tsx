import { createFileRoute, notFound } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";
import { jsonLdScript } from "@/lib/seo";
import { getPublicArticle } from "@/lib/cms/public-articles.loader";
import { ArticleBody, entityHrefFor } from "@/components/cms/ArticleBody";
import { validateArticleDocument } from "@/lib/cms/articles";
import {
  articleDetailPath,
  buildArticleJsonLd,
  entityHreflangAlternates,
  toSafeHeadText,
} from "@/lib/cms/public-content";
import { resolveCmsSeo } from "@/lib/cms/seo";
import {
  canonicalUrlFor,
  hreflangFor,
  hreflangAlternates,
  localizePath,
  ogLocaleFor,
} from "@/lib/locale-urls";
import { resolveLocale } from "@/i18n/config";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/articles/$slug")({
  loader: async ({ params }) => {
    try {
      const { article } = await getPublicArticle({ data: { locale: "en", slug: params.slug } });
      if (!article) throw notFound();
      return { article };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const article = (
      loaderData as
        | {
            article?: {
              slug: string;
              title: string;
              excerpt: string;
              seoTitle: string | null;
              seoDescription: string | null;
              imageUrl: string | null;
              updatedAt: string;
              completeLocales?: string[];
            };
          }
        | undefined
    )?.article;
    const path = article ? articleDetailPath(article.slug) : "/articles";
    const seo = resolveCmsSeo({
      status: article ? "published" : "draft",
      publicPath: path,
      seoTitle: article?.seoTitle ?? null,
      seoDescription: article?.seoDescription ?? null,
      ogImageUrl: article?.imageUrl ?? null,
      fallbackTitle: article ? `${article.title} | HawkBucks` : "Article | HawkBucks",
      fallbackDescription: article ? toSafeHeadText(article.excerpt, 300) : "HawkBucks article.",
    });
    if (!article) {
      return {
        meta: [
          { title: seo.title },
          { name: "description", content: seo.description },
          { name: "robots", content: seo.robots },
        ],
        links: [],
        scripts: [],
      };
    }
    const self = seo.canonical ?? canonicalUrlFor(localizePath(path, "en"));
    const alternates = entityHreflangAlternates({
      kind: "article",
      currentSlug: article.slug,
      completeLocales: article.completeLocales ?? ["en"],
      hreflangOf: hreflangFor,
      localizePath,
      canonicalUrlFor,
    });
    const ld = buildArticleJsonLd({
      headline: toSafeHeadText(article.title, 120),
      description: toSafeHeadText(article.excerpt, 300),
      url: self,
      image: article.imageUrl,
      dateModified: article.updatedAt,
      siteUrl: `${SITE_URL}/`,
    });
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.description },
        { name: "robots", content: seo.robots },
        { property: "og:title", content: seo.ogTitle },
        { property: "og:description", content: seo.ogDescription },
        { property: "og:type", content: "article" },
        { property: "og:url", content: self },
        ...(seo.ogImageUrl ? [{ property: "og:image", content: seo.ogImageUrl }] : []),
        { property: "og:locale", content: ogLocaleFor(resolveLocale("en")) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: seo.ogTitle },
        { name: "twitter:description", content: seo.ogDescription },
        ...(seo.ogImageUrl ? [{ name: "twitter:image", content: seo.ogImageUrl }] : []),
      ],
      links: [
        { rel: "canonical", href: self },
        ...alternates.map(({ hreflang, href }) => ({ rel: "alternate", hrefLang: hreflang, href })),
        ...(hreflangAlternates("/articles").length ? [] : []),
      ],
      scripts: [jsonLdScript(ld)],
    };
  },
  component: ArticleDetailRoute,
});

function ArticleDetailRoute() {
  const { article } = Route.useLoaderData() as {
    article: import("@/lib/cms/public-articles.loader").PublicArticleDetail;
  };
  let doc = null as null | ReturnType<typeof validateArticleDocument>;
  try {
    doc = validateArticleDocument(article.bodyJson);
  } catch {
    doc = null;
  }
  const entityLinks = new Map(
    (article.entityRefs ?? []).map((r) => [
      r.contentId,
      { entityType: r.entityType, contentId: r.contentId, slug: r.slug, title: r.title },
    ]),
  );
  const bodyImageUrls = (article.bodyImageUrls ?? {}) as Record<string, string>;
  const resolveImageUrl = (assetId: string): string | null => bodyImageUrls[assetId] ?? null;
  return (
    <I18nProvider initialLanguage="en" fixedLanguage="en">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <a className="underline" href="/articles">
            Articles
          </a>
          <span aria-hidden="true"> / </span>
          <span>{article.title}</span>
        </nav>
        <h1 className="mt-4 text-3xl font-bold">{article.title}</h1>
        {article.excerpt ? <p className="mt-2 text-muted-foreground">{article.excerpt}</p> : null}
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="mt-6 w-full rounded border"
          />
        ) : null}
        <div className="mt-6">
          {doc ? (
            <ArticleBody
              doc={doc}
              entityLinks={entityLinks}
              locale="en"
              resolveImageUrl={resolveImageUrl}
            />
          ) : (
            <p className="text-sm">Article unavailable.</p>
          )}
        </div>
        {article.related.length > 0 ? (
          <section aria-label="Related articles" className="mt-10 border-t pt-6">
            <h2 className="text-xl font-bold">Related articles</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {article.related.map((r) => (
                <li key={r.contentId}>
                  <a className="underline" href={articleDetailPath(r.slug)}>
                    {r.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </I18nProvider>
  );
}
