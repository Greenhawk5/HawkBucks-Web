import { createFileRoute } from "@tanstack/react-router";
import { translate } from "@/i18n/core";
import { canonicalUrlFor, hreflangAlternates, ogLocaleFor } from "@/lib/locale-urls";
import { resolveLocale } from "@/i18n/config";
import { listPublicArticles } from "@/lib/cms/public-articles.loader";

export const Route = createFileRoute("/articles")({
  loader: async () => {
    try {
      return await listPublicArticles({ data: { locale: "en" } });
    } catch {
      return { items: [], total: 0 };
    }
  },
  head: () => {
    const self = canonicalUrlFor("/articles");
    return {
      meta: [
        { title: translate("seo.articlesTitle", "en") },
        { name: "description", content: translate("seo.articlesDescription", "en") },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: translate("seo.articlesTitle", "en") },
        { property: "og:url", content: self },
        { property: "og:locale", content: ogLocaleFor(resolveLocale("en")) },
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
  component: ArticlesListing,
});

function ArticlesListing() {
  const data = Route.useLoaderData() as { items: Array<{ slug: string; title: string }> };
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Articles</h1>
      {data.items.length === 0 ? (
        <p className="mt-4 text-sm">No published articles yet.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm">
          {data.items.map((item) => (
            <li key={item.slug}>
              <a className="underline" href={`/articles/${item.slug}`}>
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
