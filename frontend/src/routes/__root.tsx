import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useLocation,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import cmsCss from "../cms.css?url";

import { reportLovableError } from "../lib/lovable-error-reporting";
import { jsonLdScript } from "../lib/seo";
import { BRAND_NAME, SITE_URL } from "../lib/site";
import { BackToTop } from "../components/hawkbucks/BackToTop";
import { HawkbucksNotFound } from "../components/hawkbucks/HawkbucksNotFound";
import { HawkbucksErrorState } from "../components/hawkbucks/HawkbucksErrorState";
import { AppShell } from "../components/hawkbucks/AppShell";
import { Toaster } from "../components/ui/sonner";
import { I18nProvider } from "../i18n/context";
import { getLanguageConfig, resolveDirection, resolveLocale } from "../i18n/config";
import { translate } from "../i18n/core";
import { DEFAULT_LANGUAGE, parseLanguage } from "../lib/preferences";
import { resolveHeadLanguage } from "../lib/localized-seo";
import { ogLocaleFor, splitLocalePath } from "../lib/locale-urls";
import { serverPreferencesQueryOptions } from "../lib/preferences.loader";
import { FALLBACK_SERVER_PREFERENCES } from "../hooks/use-preferences";

// Boundary components render outside the provider tree.
// `HawkbucksNotFound` is a standalone full-viewport shell (no AppShell, no
// content frame), and it resolves its own locale from the URL path so the
// copy is localized even though no i18n provider is mounted above it.
// The HTTP status is untouched: the ROUTER sets 404 for unmatched URLs and
// `notFound()` throws, and this component never interferes with that.
function NotFoundComponent() {
  return <HawkbucksNotFound />;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  // A genuine load/server failure is NOT a 404: distinct branded state with
  // the same viewport contract, a retry that revalidates + resets, and a
  // locale-aware home link. The boundary replaces RootComponent, so no
  // AppShell is mounted above this by construction.
  return (
    <HawkbucksErrorState
      onRetry={() => {
        void router.invalidate();
        reset();
      }}
    />
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Seed server-readable preferences (language + sidebar) during SSR so
  // server HTML and the first client render agree (first visit defaults to
  // expanded sidebar / English).
  loader: async ({ context }) => {
    const initialPreferences = await context.queryClient
      .ensureQueryData(serverPreferencesQueryOptions())
      .catch(() => FALLBACK_SERVER_PREFERENCES);
    return {
      initialPreferences,
      sidebarOpen: initialPreferences.sidebar.state === "expanded",
    };
  },
  head: (ctx) => {
    const lang = resolveHeadLanguage(ctx);
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        // Route titles/descriptions override these root-level defaults.
        {
          title: translate("seo.homeTitle", lang),
        },
        {
          name: "description",
          content: translate("seo.siteDescription", lang),
        },
        { name: "application-name", content: BRAND_NAME },
        { name: "apple-mobile-web-app-title", content: BRAND_NAME },
        { name: "theme-color", content: "#36d97e" },
        { name: "author", content: "HawkBucks Project" },
        { name: "msvalidate.01", content: "7D5813487EBA298DFAA0DE929B16293E" },
        { property: "og:site_name", content: BRAND_NAME },
        { property: "og:locale", content: ogLocaleFor(resolveLocale(lang)) },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        // Control Center stylesheet: every rule is scoped under `.cc-root`,
        // so it cannot alter public pages (and public tokens never style it).
        // Loaded globally to keep SSR/first-paint consistent; scope does the
        // isolation, not load timing.
        {
          rel: "stylesheet",
          href: cmsCss,
        },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap",
        },
        { rel: "icon", href: "/favicon.png", type: "image/png" },
        {
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
        { rel: "manifest", href: "/site.webmanifest" },
      ],
      // Site-level structured data emitted on every route so search engines see
      // consistent first-party "HawkBucks" site-name signals: WebSite identifies
      // the site, Organization identifies the publisher. Route-level scripts
      // (e.g. WebApplication on the homepage, FAQPage on /about) add page-specific
      // schema alongside this.
      scripts: [
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: BRAND_NAME,
          url: `${SITE_URL}/`,
          description: translate("seo.siteDescription", lang),
          inLanguage: resolveLocale(lang),
        }),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: BRAND_NAME,
          url: `${SITE_URL}/`,
          logo: `${SITE_URL}/assets/logo.png`,
          sameAs: ["https://github.com/Greenhawk5/HawkBucks-Web", "https://t.me/HawkBucks_bot"],
        }),
      ],
    };
  },

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // URL locale wins (so `/$locale/...` pages carry the right document
  // language for crawlers and AT); cookie language from the route loader is
  // the fallback. All hooks run unconditionally on every render, so the
  // rules-of-hooks check stays green even in error boundaries — resolution
  // failure (missing loader data) simply keeps the English defaults.
  const { pathname } = useLocation();
  const loaderData = Route.useLoaderData() as {
    initialPreferences?: { language?: unknown };
  };
  const resolved = (() => {
    try {
      const { locale } = splitLocalePath(pathname);
      return getLanguageConfig(locale ?? parseLanguage(loaderData?.initialPreferences?.language));
    } catch {
      return getLanguageConfig(DEFAULT_LANGUAGE);
    }
  })();
  const lang = resolved.code;
  const dir = resolved.direction;
  return (
    <html lang={lang} dir={dir}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { initialPreferences, sidebarOpen } = Route.useLoaderData() as {
    initialPreferences: Parameters<typeof AppShell>[0]["initialPreferences"];
    sidebarOpen: boolean;
  };
  // Phase 6: URL locale wins for the shared shell too (logo alt, nav labels),
  // so `/$locale/...` SSR renders the shell in the URL language. Bare URLs
  // keep cookie-driven behavior (no fixed language).
  const { pathname } = useLocation();
  const urlLocale = splitLocalePath(pathname).locale;

  // Control Center isolation: /admin/* and the standalone /articles/preview
  // surface render OUTSIDE the public AppShell. They keep the shared runtime
  // providers (QueryClient, I18n) but never inherit the public sidebar,
  // footer, welcome dialog, or page container — the CMS is its own dark
  // application with its own shell (components/cms/cc/CmsShell.tsx) and its
  // own stylesheet (src/cms.css, `.cc-root` scoped).
  const isStandaloneSurface =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/articles/preview" ||
    pathname.startsWith("/articles/preview/");

  // Belt-and-suspenders: keep document lang/dir in sync when the user
  // switches language client-side (SSR already rendered the cookie value).
  useEffect(() => {
    try {
      const language = urlLocale ?? initialPreferences?.language ?? DEFAULT_LANGUAGE;
      document.documentElement.lang = isStandaloneSurface ? DEFAULT_LANGUAGE : language;
      document.documentElement.dir = resolveDirection(
        isStandaloneSurface ? DEFAULT_LANGUAGE : language,
      );
    } catch {
      // Non-DOM environment — nothing to sync.
    }
  }, [initialPreferences?.language, urlLocale, isStandaloneSurface]);

  // Standalone surfaces (Control Center + draft preview) keep the shared
  // runtime providers but skip the public AppShell entirely — no public
  // sidebar, footer, welcome dialog, BackToTop, or page container.
  //
  // Not-found matches take the SAME branch, and this is the actual fix for
  // the "404 trapped in the content column" defect: TanStack renders the
  // root `notFoundComponent` through this component's `<Outlet/>`, so as long
  // as the Outlet sits inside AppShell, no CSS on the 404 can escape the
  // sidebar/header/`max-w-[1100px]` ancestors. The predicate mirrors the
  // router's own `hasNotFoundMatch` — a loader-level `notFound()` throw
  // (`status === "notFound"`) or an unmatched URL (`globalNotFound`) — so
  // unknown slugs and unknown paths share one full-viewport boundary.
  // Genuine errors (`status === "error"`) never take this path: they render
  // through `errorComponent`, which replaces this component outright.
  const isNotFoundMatch = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.status === "notFound" || match.globalNotFound === true),
  });
  if (isStandaloneSurface || isNotFoundMatch) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nProvider initialLanguage={DEFAULT_LANGUAGE} fixedLanguage={DEFAULT_LANGUAGE}>
          <Outlet />
        </I18nProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* Shared Phase 2 app shell: sidebar + top navbar + footer wrap every
          public route. Routes render only their own content via <Outlet />.
          Sidebar persistence is preference-owned (Phase 3); behavior is
          unchanged. /admin/* never reaches this branch (see above). */}
      <I18nProvider
        initialLanguage={initialPreferences?.language ?? DEFAULT_LANGUAGE}
        fixedLanguage={urlLocale}
      >
        <AppShell initialPreferences={initialPreferences} initialSidebarOpen={sidebarOpen}>
          <Outlet />
        </AppShell>
        <BackToTop />
        <Toaster richColors closeButton position="top-right" dir="auto" />
      </I18nProvider>
    </QueryClientProvider>
  );
}
