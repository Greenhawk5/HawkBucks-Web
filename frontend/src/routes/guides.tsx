import { createFileRoute } from "@tanstack/react-router";
import { translate } from "@/i18n/core";
import { canonicalUrlFor, hreflangAlternates, ogLocaleFor } from "@/lib/locale-urls";
import { resolveLocale } from "@/i18n/config";
import { EDITORIAL_CLUSTERS, clusterLandingPath } from "@/lib/cms/editorial-clusters";

export const Route = createFileRoute("/guides")({
  head: () => {
    const self = canonicalUrlFor("/guides");
    return {
      meta: [
        { title: translate("seo.guidesTitle", "en") ?? "Guides | HawkBucks" },
        {
          name: "description",
          content: translate("seo.guidesDescription", "en") ?? "HawkBucks guides.",
        },
        { name: "robots", content: "index, follow" },
        {
          property: "og:title",
          content: translate("seo.guidesTitle", "en") ?? "Guides | HawkBucks",
        },
        { property: "og:url", content: self },
        { property: "og:locale", content: ogLocaleFor(resolveLocale("en")) },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "canonical", href: self },
        ...hreflangAlternates("/guides").map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
    };
  },
  component: GuidesIndex,
});

function GuidesIndex() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Guides</h1>
      <ul className="mt-4 space-y-4">
        {EDITORIAL_CLUSTERS.map((c) => (
          <li key={c.slug} className="rounded border p-4">
            <a className="text-lg font-semibold underline" href={clusterLandingPath(c.slug)}>
              {c.title}
            </a>
            <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
