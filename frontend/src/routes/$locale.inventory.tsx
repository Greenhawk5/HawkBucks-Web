import { createFileRoute, redirect } from "@tanstack/react-router";
import { matchLocaleParamCaseInsensitive, parseLocaleParam } from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";

/**
 * Legacy route: /:locale/inventory → /:locale/schematics, permanently (308).
 *
 * Parent of /:locale/inventory/$slug, so it must re-attach any remaining path
 * segments — otherwise a localized detail URL would land on the hub and lose
 * its slug. Query strings are preserved; unknown miscased locales fall back to
 * the bare canonical, matching the locale-route convention.
 */
export const Route = createFileRoute("/$locale/inventory")({
  beforeLoad: ({ location, params, search }) => {
    const raw = (params as { locale?: unknown }).locale;
    const lang = parseLocaleParam(raw) ?? matchLocaleParamCaseInsensitive(raw);
    const marker = `/${String(raw ?? "")}/inventory`;
    const rest = location.pathname.startsWith(marker) ? location.pathname.slice(marker.length) : "";
    const paramsQ = new URLSearchParams();
    for (const [k, v] of Object.entries((search ?? {}) as Record<string, unknown>)) {
      if (v === undefined || v === null || v === "") continue;
      paramsQ.set(k, String(v));
    }
    const qs = paramsQ.toString() === "" ? "" : `?${paramsQ.toString()}`;
    if (lang === undefined) throw redirect({ href: `/schematics${rest}${qs}`, statusCode: 308 });
    const base = lang === DEFAULT_LANGUAGE ? "/schematics" : `/${lang}/schematics`;
    throw redirect({ href: `${base}${rest}${qs}`, statusCode: 308 });
  },
});
