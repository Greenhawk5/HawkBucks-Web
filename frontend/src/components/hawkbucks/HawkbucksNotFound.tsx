/**
 * The HawkBucks 404: a full-viewport "lost expedition", not a card.
 *
 * ARCHITECTURE
 * ------------
 * This renders as the root route's `notFoundComponent`, which TanStack places
 * OUTSIDE `RootComponent` (no AppShell, no sidebar, no content max-width). The
 * contract it honours:
 *
 *   * it owns the whole viewport (`min-h-svh`, standalone shell),
 *   * it never inherits the public `max-w-[1100px]` content frame,
 *   * the HTTP status stays 404 — that is decided by the ROUTER (a `notFound()`
 *     throw or an unmatched URL), which this component never touches,
 *   * route `head()` entries still run, so each locale's `noindex` + title
 *     behaviour is preserved.
 *
 * DESIGN
 * ------
 * Dark-green atmospheric field (the existing page gradient + grid + aurora are
 * reused, not reinvented), a scannable `404`, one explanatory line, and two
 * actions: the primary return and a secondary hub. Animation is a single slow
 * drift that disables itself under `prefers-reduced-motion`; the composition is
 * pure CSS/SVG so there is no image asset to 404 on.
 *
 * LOCALIZATION
 * ------------
 * The boundary renders outside the i18n provider tree, so the OLD component
 * hardcoded English. This one resolves the locale from the URL path itself
 * (`splitLocalePath`), which is deterministic on both server and client, and
 * falls back to English — so `/fa-IR/heroes/missing` explains itself in
 * Persian while `/xx/heroes/missing` gets English.
 */

import { Link, useLocation } from "@tanstack/react-router";

import { translate } from "@/i18n/core";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { splitLocalePath } from "@/lib/locale-urls";
import type { LanguageCode } from "@/lib/preferences";
import { cn } from "@/lib/utils";

function notFoundLanguage(pathname: string): LanguageCode {
  try {
    const { locale } = splitLocalePath(pathname);
    return locale ?? DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** The locale-aware home target: `/es/` for Spanish, `/` for English. */
function homeTarget(language: LanguageCode): string {
  return language === DEFAULT_LANGUAGE ? "/" : `/${language}/`;
}

export function HawkbucksNotFound() {
  const { pathname } = useLocation();
  const language = notFoundLanguage(pathname);
  const home = homeTarget(language);

  return (
    <div
      className="relative flex min-h-svh w-full flex-col overflow-x-clip bg-background"
      data-testid="hawkbucks-404"
      data-standalone-shell="true"
    >
      {/* Atmospheric field. Same vocabulary as the rest of the site (page
          gradient, grid, aurora) — a lost corner of the map, not a template. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hb-404-field">
        <svg
          className="absolute bottom-0 left-1/2 h-[46svh] w-[140%] max-w-none -translate-x-1/2 opacity-60"
          viewBox="0 0 1200 320"
          preserveAspectRatio="xMidYMax slice"
          focusable="false"
        >
          <path
            d="M0 240 L120 200 L260 236 L400 168 L540 216 L700 150 L860 210 L1000 170 L1200 224 L1200 320 L0 320 Z"
            className="fill-[#0d2417]"
          />
          <path
            d="M0 268 L160 236 L340 264 L520 214 L720 258 L920 222 L1120 262 L1200 248 L1200 320 L0 320 Z"
            className="fill-[#0a1d12]"
          />
          {/* Waypoint beacons: where the expedition was, and was not. */}
          <g className="fill-[#36d97e]">
            <circle cx="180" cy="216" r="4" opacity="0.9" />
            <circle cx="470" cy="188" r="4" opacity="0.55" />
            <circle cx="760" cy="172" r="4" opacity="0.55" />
          </g>
          <g stroke="#36d97e" strokeWidth="2" strokeDasharray="6 8" fill="none" opacity="0.5">
            <path d="M180 216 L470 188 L760 172" />
            <path d="M760 172 L930 226" opacity="0.6" />
          </g>
          {/* The missing waypoint: a hollow marker, not a broken one. */}
          <g stroke="#e8f3ec" strokeWidth="2.5" fill="none" opacity="0.85">
            <circle cx="930" cy="226" r="9" strokeDasharray="4 4" />
            <path d="M930 217 v18 M921 226 h18" opacity="0.7" />
          </g>
        </svg>
        {/* Compass rose, faint. Orientation is the joke: the page is lost. */}
        <svg
          className="hb-404-compass absolute end-[8%] top-[12%] h-24 w-24 opacity-25 sm:h-32 sm:w-32"
          viewBox="0 0 100 100"
          focusable="false"
        >
          <g stroke="#9fd9b4" fill="none" strokeWidth="1.5">
            <circle cx="50" cy="50" r="38" />
            <circle cx="50" cy="50" r="30" opacity="0.6" />
            <path d="M50 12 L56 50 L50 88 L44 50 Z" opacity="0.9" />
            <path d="M12 50 L50 44 L88 50 L50 56 Z" opacity="0.5" />
            <circle cx="50" cy="50" r="3" fill="#9fd9b4" stroke="none" />
          </g>
        </svg>
      </div>

      {/* Content. `my-auto` centers in the free viewport; `w-full` + `max-w`
          constrain line length without ever becoming the page frame. */}
      <main className="relative z-10 mx-auto my-auto w-full max-w-xl px-5 py-16 text-center sm:px-8">
        <p className="cc-eyebrow" data-testid="hawkbucks-404-eyebrow">
          {translate("errors.notFoundKicker", language)}
        </p>
        <h1
          className="hb-404-code mt-3 font-display text-[clamp(5rem,18vw,10rem)] font-extrabold leading-none tracking-tight text-foreground"
          data-testid="hawkbucks-404-code"
        >
          404
        </h1>
        <h2 className="mt-3 text-xl font-semibold text-foreground sm:text-2xl">
          {translate("errors.notFoundTitle", language)}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {translate("errors.notFoundDesc", language)}
        </p>

        {/* The offending path, so the page names what it could not find. */}
        <p
          className="mx-auto mt-4 max-w-md truncate font-mono text-xs text-muted-foreground/80"
          title={pathname}
          data-testid="hawkbucks-404-path"
        >
          {pathname}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            to={home}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            data-testid="hawkbucks-404-home"
          >
            {translate("errors.backToSafety", language)}
          </Link>
          {/*
            A plain anchor, not a router Link: `/heroes` carries validated
            search params, and this boundary renders outside the router's typed
            context. A full navigation to the hub is exactly right here.
          */}
          <a
            href="/heroes"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-md border border-input bg-background/60 px-5 py-2 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-accent sm:w-auto"
            data-testid="hawkbucks-404-browse"
          >
            {translate("errors.browseHeroes", language)}
          </a>
        </div>
      </main>

      <footer className="relative z-10 pb-6 text-center">
        <p className="text-xs text-muted-foreground/70">
          {translate("errors.notFoundFooter", language)}
        </p>
      </footer>
    </div>
  );
}

/**
 * Layout contract assertion for tests: the 404 owns the viewport and escapes
 * the normal content frame. Kept as exported constants so the test pins the
 * contract rather than re-implementing the selector.
 */
export const NOT_FOUND_CONTRACT = {
  testId: "hawkbucks-404",
  standaloneShell: "true",
  viewportClass: "min-h-svh",
  noContentFrame: true,
} as const;

export function notFoundClassNames(): string {
  return cn("min-h-svh", "w-full", "overflow-x-clip");
}
