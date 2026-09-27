import * as React from "react";
import { listArticlesForEntity } from "@/lib/cms/public-articles.loader";
import { articleDetailPath, articleLocalizePath } from "@/lib/cms/articles";

export function RelatedGuides({
  entityContentId,
  locale,
}: {
  entityContentId: string;
  locale: string;
}) {
  const [items, setItems] = React.useState<
    Array<{ contentId: string; slug: string; title: string }>
  >([]);
  React.useEffect(() => {
    let cancelled = false;
    listArticlesForEntity({ data: { entityContentId, locale, limit: 6 } })
      .then((result) => {
        if (!cancelled) setItems(result.items ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [entityContentId, locale]);
  if (items.length === 0) return null;
  return (
    <section className="mt-8" aria-label="Related guides">
      <h2 className="font-display text-xl font-bold">Related guides</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((a) => (
          <li key={a.contentId}>
            <a className="underline" href={articleLocalizePath(articleDetailPath(a.slug), locale)}>
              {a.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
