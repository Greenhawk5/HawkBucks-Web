import { createFileRoute, redirect } from "@tanstack/react-router";
import { matchLocaleParamCaseInsensitive, parseLocaleParam } from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";

/**
 * Legacy route: /:locale/inventory/:slug permanently redirects to the
 * canonical /:locale/schematics/:slug detail URL (same slug namespace).
 */
export const Route = createFileRoute("/$locale/inventory/$slug")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    const lang = parseLocaleParam(raw) ?? matchLocaleParamCaseInsensitive(raw);
    const slug = (params as { slug?: string }).slug ?? "";
    if (lang === undefined) throw redirect({ href: `/schematics/${slug}` });
    const base = lang === DEFAULT_LANGUAGE ? `/schematics/${slug}` : `/${lang}/schematics/${slug}`;
    throw redirect({ href: base, statusCode: 308 });
  },
});
