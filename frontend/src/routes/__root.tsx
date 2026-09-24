import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";

import { reportLovableError } from "../lib/lovable-error-reporting";
import { jsonLdScript } from "../lib/seo";
import { BRAND_NAME, SITE_URL } from "../lib/site";
import { BackToTop } from "../components/hawkbucks/BackToTop";
import { AppShell } from "../components/hawkbucks/AppShell";
import { I18nProvider } from "../i18n/context";
import { getLanguageConfig, resolveDirection } from "../i18n/config";
import { translate } from "../i18n/core";
import { DEFAULT_LANGUAGE, parseLanguage } from "../lib/preferences";
import { serverPreferencesQueryOptions } from "../lib/preferences.loader";
import { FALLBACK_SERVER_PREFERENCES } from "../hooks/use-preferences";

// Boundary components render outside the provider tree, so they translate
// directly against the safe default (English). Rare edge cases where showing
// English is acceptable; Phase 6 owns localized routing/SEO.
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {translate("errors.notFoundTitle", DEFAULT_LANGUAGE)}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {translate("errors.notFoundDesc", DEFAULT_LANGUAGE)}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex min-h-[48px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {translate("errors.goHome", DEFAULT_LANGUAGE)}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {translate("errors.loadFailTitle", DEFAULT_LANGUAGE)}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {translate("errors.loadFailDesc", DEFAULT_LANGUAGE)}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-[48px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {translate("errors.tryAgain", DEFAULT_LANGUAGE)}
          </button>
          <a
            href="/"
            className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {translate("errors.goHome", DEFAULT_LANGUAGE)}
          </a>
        </div>
      </div>
    </div>
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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Route titles/descriptions override these root-level defaults.
      {
        title: "Fortnite Save The World V-Bucks Mission Tracker | HawkBucks",
      },
      {
        name: "description",
        content:
          "Check in seconds whether today's Fortnite Save The World missions reward V-Bucks. HawkBucks is updated every 30 minutes.",
      },
      { name: "application-name", content: BRAND_NAME },
      { name: "apple-mobile-web-app-title", content: BRAND_NAME },
      { name: "theme-color", content: "#36d97e" },
      { name: "author", content: "HawkBucks Project" },
      { name: "msvalidate.01", content: "7D5813487EBA298DFAA0DE929B16293E" },
      { property: "og:site_name", content: BRAND_NAME },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
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
        description:
          "A community web application that tracks Fortnite Save The World missions rewarding V-Bucks.",
        inLanguage: "en",
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
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // SSR renders lang/dir from the language cookie via the route loader; the
  // client effect in RootComponent keeps them in sync after a language
  // switch. Effect-based updates never risk a hydration mismatch.
  let lang = DEFAULT_LANGUAGE;
  let dir = "ltr";
  try {
    const data = Route.useLoaderData() as {
      initialPreferences?: { language?: unknown };
    };
    const config = getLanguageConfig(parseLanguage(data?.initialPreferences?.language));
    lang = config.code;
    dir = config.direction;
  } catch {
    // Loader data unavailable (error boundaries) — safe English defaults.
  }
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

  // Belt-and-suspenders: keep document lang/dir in sync when the user
  // switches language client-side (SSR already rendered the cookie value).
  useEffect(() => {
    try {
      const language = initialPreferences?.language ?? DEFAULT_LANGUAGE;
      document.documentElement.lang = language;
      document.documentElement.dir = resolveDirection(language);
    } catch {
      // Non-DOM environment — nothing to sync.
    }
  }, [initialPreferences?.language]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Shared Phase 2 app shell: sidebar + top navbar + footer wrap every
          route. Routes render only their own content via <Outlet />. Sidebar
          persistence is preference-owned (Phase 3); behavior is unchanged. */}
      <I18nProvider initialLanguage={initialPreferences?.language ?? DEFAULT_LANGUAGE}>
        <AppShell initialPreferences={initialPreferences} initialSidebarOpen={sidebarOpen}>
          <Outlet />
        </AppShell>
        <BackToTop />
      </I18nProvider>
    </QueryClientProvider>
  );
}
