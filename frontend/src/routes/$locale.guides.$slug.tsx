import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";
import { ArticleBody } from "@/components/cms/ArticleBody";
import { validateArticleDocument } from "@/lib/cms/articles";
import { getPublicArticle } from "@/lib/cms/public-articles.loader";
import {
  buildArticleJsonLd,
  entityHreflangAlternates,
  toSafeHeadText,
} from "@/lib/cms/public-content";
import { guideDetailPath } from "@/lib/cms/guide-paths";
import { resolveCmsSeo } from "@/lib/cms/seo";
import {
  canonicalUrlFor,
  hreflangFor,
  localizePath,
  matchLocaleParamCaseInsensitive,
  ogLocaleFor,
  parseLocaleParam,
} from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { resolveLocale } from "@/i18n/config";
import { SITE_URL } from "@/lib/site";

/** Localized Guide detail: CMS article content at /:locale/guides/:slug. */
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
    try {
      const { article } = await getPublicArticle({
        data: { locale: lang, slug: (params as { slug?: string }).slug ?? "" },
      });
      if (!article) throw notFound();
      return { article, lang };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData, params }) => {
    const lang =
      parseLocaleParam((params as { locale?: unknown } | undefined)?.locale) ?? DEFAULT_LANGUAGE;
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
              slugsByLocale?: Record<string, string>;
            };
          }
        | undefined
    )?.article;
    const enPath = article ? guideDetailPath(article.slug) : "/guides";
    const path = article ? (lang === "en" ? enPath : `/${lang}${enPath}`) : "/guides";
    const seo = resolveCmsSeo({
      status: article ? "published" : "draft",
      publicPath: path,
      seoTitle: article?.seoTitle ?? null,
      seoDescription: article?.seoDescription ?? null,
      ogImageUrl: article?.imageUrl ?? null,
      fallbackTitle: article ? `${article.title} | HawkBucks` : "Guide | HawkBucks",
      fallbackDescription: article ? toSafeHeadText(article.excerpt, 300) : "HawkBucks guide.",
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
    const self = seo.canonical ?? canonicalUrlFor(localizePath(enPath, lang));
    const alternates = entityHreflangAlternates({
      kind: "article",
      currentSlug: article.slug,
      completeLocales: article.completeLocales ?? ["en"],
      ...(article.slugsByLocale ? { slugsByLocale: article.slugsByLocale } : {}),
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
        { property: "og:locale", content: ogLocaleFor(resolveLocale(lang)) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: seo.ogTitle },
        { name: "twitter:description", content: seo.ogDescription },
        ...(seo.ogImageUrl ? [{ name: "twitter:image", content: seo.ogImageUrl }] : []),
      ],
      links: [
        { rel: "canonical", href: self },
        ...alternates.map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(ld) }],
    };
  },
  component: LocalizedGuideDetailRoute,
});

function LocalizedGuideDetailRoute() {
  const { article, lang } = Route.useLoaderData() as {
    article: import("@/lib/cms/public-articles.loader").PublicArticleDetail;
    lang: string;
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
  const guidesHome = lang === "en" ? "/guides" : `/${lang}/guides`;
  return (
    <I18nProvider initialLanguage={lang as never} fixedLanguage={lang as never}>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <a className="underline" href={guidesHome}>
            Guides
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
              locale={lang}
              resolveImageUrl={resolveImageUrl}
            />
          ) : (
            <p className="text-sm">Guide unavailable.</p>
          )}
        </div>
        {article.related.length > 0 ? (
          <section aria-label="Related guides" className="mt-10 border-t pt-6">
            <h2 className="text-xl font-bold">Related guides</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {article.related.map((r) => (
                <li key={r.contentId}>
                  <a
                    className="underline"
                    href={lang === "en" ? `/guides/${r.slug}` : `/${lang}/guides/${r.slug}`}
                  >
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
