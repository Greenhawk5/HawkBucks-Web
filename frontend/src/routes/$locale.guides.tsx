import { createFileRoute, Outlet, redirect, useChildMatches } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";
import { GuidesHub } from "@/components/cms/GuidesHub";
import { EDITORIAL_CLUSTERS } from "@/lib/cms/editorial-clusters";
import { buildHubHead, hasChildMatch } from "@/lib/cms/entity-meta";
import { matchLocaleParamCaseInsensitive, parseLocaleParam } from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { translate } from "@/i18n/core";
import { listHubGuides } from "@/lib/cms/public-hubs.loader";
import { getPublicFeatureStatus } from "@/lib/cms/feature-availability.loader";
import { SectionUnavailableState } from "@/components/cms/SectionUnavailableState";
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
    const { config } = await getPublicFeatureStatus();
    if (!config.guides.enabled) {
      return {
        available: false as const,
        unavailableMessage: config.guides.message,
        items: [],
        total: 0,
      };
    }

    const lang = parseLocaleParam((params as { locale?: unknown }).locale) ?? DEFAULT_LANGUAGE;
    const category =
      typeof deps.category === "string" && deps.category.trim() !== ""
        ? deps.category.trim()
        : undefined;
    const q = parseSearchParam(deps.q) ?? "";
    const page = parsePageParam(deps.page);
    const hub = await listHubGuides({
      data: {
        locale: lang,
        ...(category === undefined ? {} : { category }),
        ...(q === "" ? {} : { search: q }),
        limit: PUBLIC_PAGE_SIZE,
        offset: (page - 1) * PUBLIC_PAGE_SIZE,
      },
    });

    return {
      available: true as const,
      unavailableMessage: "",
      ...hub,
    };
  },
  head: (ctx) => {
    if (hasChildMatch(ctx)) return { meta: [], links: [] };
    const loaderData = (ctx as { loaderData?: { available?: boolean } }).loaderData;
    if (loaderData?.available === false) {
      return {
        meta: [
          { title: "Guides Temporarily Unavailable — HawkBucks" },
          { name: "description", content: "The Guides section is temporarily unavailable." },
          { name: "robots", content: "noindex, nofollow" },
        ],
        links: [],
      };
    }

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
  const data = Route.useLoaderData();
  // This hub route is the PARENT of its detail route, so a child match
  // must paint through the Outlet; rendering the listing unconditionally
  // made every detail URL show the hub instead of the entity.
  const hasChild = useChildMatches({ select: (m) => m.length > 0 });
  if (hasChild) return <Outlet />;
  if (!data) return null;

  if (data.available === false) {
    return (
      <I18nProvider initialLanguage={lang as never} fixedLanguage={lang as never}>
        <SectionUnavailableState section="guides" message={data.unavailableMessage} />
      </I18nProvider>
    );
  }

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
