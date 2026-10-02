import { createFileRoute, redirect } from "@tanstack/react-router";
import { matchLocaleParamCaseInsensitive, parseLocaleParam } from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";

/** Legacy route: /:locale/articles/:slug → canonical /:locale/guides/:slug. */
export const Route = createFileRoute("/$locale/articles/$slug")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    const lang = parseLocaleParam(raw) ?? matchLocaleParamCaseInsensitive(raw);
    const slug = (params as { slug?: string }).slug ?? "";
    if (lang === undefined) throw redirect({ href: `/guides/${slug}` });
    const base = lang === DEFAULT_LANGUAGE ? `/guides/${slug}` : `/${lang}/guides/${slug}`;
    throw redirect({ href: base, statusCode: 308 });
  },
});
