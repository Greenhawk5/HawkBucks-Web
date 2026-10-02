import { createFileRoute, Outlet, redirect, useChildMatches } from "@tanstack/react-router";
import { SchematicsPage } from "@/components/cms/SchematicsPage";
import { I18nProvider } from "@/i18n/context";
import { translate } from "@/i18n/core";
import { buildHubHead, hasChildMatch } from "@/lib/cms/entity-meta";
import { matchLocaleParamCaseInsensitive, parseLocaleParam } from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { listHubSchematics } from "@/lib/cms/public-hubs.loader";
import { parsePageParam, parseSearchParam, PUBLIC_PAGE_SIZE } from "@/lib/cms/public-content";
import { isWeaponSubtype } from "@/lib/cms/schematics";
import { parsePublicRarityParam, parseTrapPlacementParam } from "@/lib/cms/taxonomy";

export const Route = createFileRoute("/$locale/schematics")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined)
      throw redirect({
        href: corrected === DEFAULT_LANGUAGE ? "/schematics" : `/${corrected}/schematics`,
      });
    throw redirect({ href: "/schematics" });
  },
  validateSearch: (s: Record<string, unknown>) => ({
    type: typeof s["type"] === "string" ? s["type"] : undefined,
    subtype: typeof s["subtype"] === "string" ? s["subtype"] : undefined,
    placement: typeof s["placement"] === "string" ? s["placement"] : undefined,
    rarity: typeof s["rarity"] === "string" ? s["rarity"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const lang = parseLocaleParam((params as { locale?: unknown }).locale) ?? DEFAULT_LANGUAGE;
    const kind = deps.type === "weapon" || deps.type === "trap" ? deps.type : undefined;
    const weaponSubtype =
      typeof deps.subtype === "string" && isWeaponSubtype(deps.subtype) ? deps.subtype : undefined;
    const trapPlacement = parseTrapPlacementParam(deps.placement);
    const rarity = parsePublicRarityParam(deps.rarity);
    const q = parseSearchParam(deps.q) ?? "";
    const sort = deps.sort === "name" || deps.sort === "recent" ? deps.sort : "editorial";
    const page = parsePageParam(deps.page);
    return listHubSchematics({
      data: {
        locale: lang,
        ...(kind === undefined ? {} : { kind }),
        ...(weaponSubtype === undefined ? {} : { weaponSubtype }),
        ...(trapPlacement === null ? {} : { trapPlacement }),
        ...(rarity === null ? {} : { rarity }),
        ...(q === "" ? {} : { search: q }),
        sort,
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
      basePath: "/schematics",
      locale: lang,
      title: translate("seo.schematicsTitle", lang),
      description: translate("seo.schematicsDescription", lang),
      ogTitle: translate("seo.schematicsOgTitle", lang),
      ogDescription: translate("seo.schematicsOgDescription", lang),
    });
  },
  component: LocalizedSchematicsListing,
});

function LocalizedSchematicsListing() {
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
    <I18nProvider initialLanguage={lang} fixedLanguage={lang}>
      <SchematicsPage
        locale={lang}
        search={search}
        basePath={lang === "en" ? "/schematics" : `/${lang}/schematics`}
        initial={data as never}
      />
    </I18nProvider>
  );
}
