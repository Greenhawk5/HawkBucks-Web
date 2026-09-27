import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArticleBody } from "@/components/cms/ArticleBody";
import { validateArticleDocument } from "@/lib/cms/articles";
import { getPreviewArticle } from "@/lib/cms/public-articles.loader";
import type { PublicArticleDetail } from "@/lib/cms/public-articles.loader";

export const Route = createFileRoute("/articles/preview")({
  // Draft previews must never be cached by browsers or intermediaries.
  // Published article routes are unaffected — this header applies only to
  // the preview document; preview data carries the same no-store contract
  // inside the getPreviewArticle server function.
  headers: () => ({ "Cache-Control": "private, no-store" }),
  validateSearch: (s: Record<string, unknown>) => ({
    contentId: typeof s["contentId"] === "string" ? s["contentId"] : "",
    preview: typeof s["preview"] === "string" ? s["preview"] : "",
    locale: typeof s["locale"] === "string" ? s["locale"] : "en",
  }),
  head: () => ({
    meta: [
      { title: "Article preview — HawkBucks" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [],
  }),
  component: ArticlePreview,
});

function ArticlePreview() {
  const search = Route.useSearch();
  const [state, setState] = React.useState<{
    article: PublicArticleDetail | null;
    reason?: string;
  } | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    getPreviewArticle({
      data: { contentId: search.contentId, token: search.preview, locale: search.locale },
    })
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch(() => {
        if (!cancelled) setState({ article: null, reason: "invalid" });
      });
    return () => {
      cancelled = true;
    };
  }, [search.contentId, search.preview, search.locale]);
  if (!state) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold">Loading preview…</h1>
      </main>
    );
  }
  const { article, reason } = state;
  if (!article) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold">Preview unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {reason === "missing"
            ? "Missing preview parameters."
            : "This preview link is invalid or expired."}
        </p>
      </main>
    );
  }
  let doc = null as null | ReturnType<typeof validateArticleDocument>;
  try {
    doc = validateArticleDocument(article.bodyJson);
  } catch {
    doc = null;
  }
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="rounded border border-dashed px-3 py-2 text-sm text-muted-foreground">
        Draft preview — not indexed, not publicly linked.
      </p>
      <h1 className="mt-4 text-3xl font-bold">{article.title}</h1>
      <div className="mt-6">
        {doc ? (
          <ArticleBody
            doc={doc}
            locale={article.locale}
            resolveImageUrl={(assetId) => article.bodyImageUrls?.[assetId] ?? null}
          />
        ) : (
          <p className="text-sm">Preview unavailable.</p>
        )}
      </div>
    </main>
  );
}
