import { createFileRoute, Outlet, redirect, useChildMatches } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";
import { GuidesHub } from "@/components/cms/GuidesHub";
import { EDITORIAL_CLUSTERS } from "@/lib/cms/editorial-clusters";
import { buildHubHead, hasChildMatch } from "@/lib/cms/entity-meta";
import { matchLocaleParamCaseInsensitive, parseLocaleParam } from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { translate } from "@/i18n/core";
import { listHubGuides } from "@/lib/cms/public-hubs.loader";
import { parsePageParam, parseSearchParam, PUBLIC_PAGE_SIZE } from "@/lib/cms/public-content";

/** Localized canonical Guides hub (CMS-driven). */
export const Route = createFileRoute("/$locale/guides")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined)
      throw redirect({ href: corrected === DEFAULT_LANGUAGE ? "/guides" : `/${corrected}/guides` });
    throw redirect({ href: "/guides" });
  },
  validateSearch: (s: Record<string, unknown>) => ({
    category: typeof s["category"] === "string" ? s["category"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const lang = parseLocaleParam((params as { locale?: unknown }).locale) ?? DEFAULT_LANGUAGE;
    const category =
      typeof deps.category === "string" && deps.category.trim() !== ""
        ? deps.category.trim()
        : undefined;
    const q = parseSearchParam(deps.q) ?? "";
    const page = parsePageParam(deps.page);
    return listHubGuides({
      data: {
        locale: lang,
        ...(category === undefined ? {} : { category }),
        ...(q === "" ? {} : { search: q }),
        limit: PUBLIC_PAGE_SIZE,
        offset: (page - 1) * PUBLIC_PAGE_SIZE,
      },
    });
  },
  head: (ctx) => {
    if (hasChildMatch(ctx)) return { meta: [], links: [] };
    const param = (ctx.params as { locale?: unknown } | undefined)?.locale;
    const lang = parseLocaleParam(param) ?? DEFAULT_LANGUAGE;
    return buildHubHead({
      basePath: "/guides",
      locale: lang,
      title: translate("seo.guidesTitle", lang),
      description: translate("seo.guidesDescription", lang),
    });
  },
  component: LocalizedGuidesIndex,
});

function LocalizedGuidesIndex() {
  const { locale } = Route.useParams() as { locale?: unknown };
  const lang = parseLocaleParam(locale) ?? DEFAULT_LANGUAGE;
  const search = Route.useSearch() as Record<string, unknown>;
  const data = Route.useLoaderData() as { items: unknown[]; total: number } | undefined;
  // This hub route is the PARENT of its detail route, so a child match
  // must paint through the Outlet; rendering the listing unconditionally
  // made every detail URL show the hub instead of the entity.
  const hasChild = useChildMatches({ select: (m) => m.length > 0 });
  if (hasChild) return <Outlet />;
  return (
    <I18nProvider initialLanguage={lang as never} fixedLanguage={lang as never}>
      <GuidesHub
        locale={lang}
        search={search}
        basePath={lang === "en" ? "/guides" : `/${lang}/guides`}
        topics={EDITORIAL_CLUSTERS}
        initial={data as never}
      />
    </I18nProvider>
  );
}
