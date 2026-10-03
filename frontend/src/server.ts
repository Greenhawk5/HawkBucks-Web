import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { applySecurityHeaders, applyContentSecurityPolicy } from "./lib/security-headers";
import { generateCspNonce, runWithCspNonce } from "./lib/csp-nonce";
// Installs the request-scoped AsyncLocalStorage that `src/router.tsx` reads the
// nonce from. Called explicitly (not a bare side-effect import) so the bundler
// cannot tree-shake the module away — see installRequestScopedCspNonceStore.
// This must NOT be imported by router.tsx, which is also bundled for browsers.
import { installRequestScopedCspNonceStore } from "./lib/csp-nonce.server";

installRequestScopedCspNonceStore();

// ---------------------------------------------------------------------------
// Phase 9 — WWW → apex redirect
// https://www.hawkbucks.com is a permanent (308) alias of the canonical apex
// host https://hawkbucks.com. Plain-HTTP www requests are TLS-normalized by
// Cloudflare at the edge ("Always Use HTTPS"); the scheme is also forced here
// so the rule can never emit an http:// Location. The apex host falls through
// untouched, so no redirect loop is possible. Other hosts (workers.dev
// previews, localhost) are intentionally unaffected; the legacy pages.dev
// host gets its own Phase 10 redirect below.
// Exported for tests; www-redirect.test.mjs asserts the exact host contract.
export const APEX_HOST = "hawkbucks.com";
export const WWW_HOST = `www.${APEX_HOST}`;

// Phase 10 — legacy Pages hostname → apex redirect. The old
// https://hawkbucks.pages.dev host must 301 to the canonical apex, preserving
// path and query string. Unlike `_redirects` (which Pages applies to EVERY
// host, including the custom domain — that would loop the apex back to
// itself), this host-scoped check only ever fires on the pages.dev host, so
// hawkbucks.com / www / localhost are provably unaffected. No loop is
// possible because hawkbucks.com is never redirected back to pages.dev.
export const PAGES_DEV_HOST = "hawkbucks.pages.dev";

/**
 * Phase 22 — hub list for the D1-less sitemap fallback.
 *
 * Previously a second hand-copied literal that had drifted out of sync with
 * both the real route surface and `sitemap.server.ts` (missing `/about`,
 * `/vbucks-missions`, `/missions-guide`). Kept as a static array because
 * `src/server.ts` is the Worker entrypoint and must stay import-light; the
 * phase22 regression test asserts it equals `INDEXABLE_BASE_PATHS`, so the
 * two can never diverge again.
 *
 * These are the BARE (default-language) hub paths only. The fallback document
 * is intentionally minimal — no alternates, no lastmod — because it only ever
 * renders when D1 is unreachable, and public/sitemap.xml is the document
 * Cloudflare Pages actually serves for /sitemap.xml.
 */
export const SITEMAP_FALLBACK_HUBS: readonly string[] = [
  "/",
  "/about",
  "/vbucks-missions",
  "/missions-guide",
  "/heroes",
  "/loadouts",
  "/schematics",
  "/guides",
];

function redirectResponse(requestUrl: URL, targetHost: string, status: number): Response {
  const target = new URL(requestUrl.href);
  target.protocol = "https:";
  target.host = targetHost; // pathname + search are preserved verbatim
  return new Response(null, {
    // 308 preserves the request method (used for www); 301 is the canonical
    // permanent redirect expected for a one-way domain migration (pages.dev).
    status,
    headers: { Location: target.toString() },
  });
}

function wwwRedirectResponse(requestUrl: URL): Response {
  return redirectResponse(requestUrl, APEX_HOST, 308);
}

function pagesDevRedirectResponse(requestUrl: URL): Response {
  return redirectResponse(requestUrl, APEX_HOST, 301);
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/**
 * Dynamic sitemap (Content Platform): static hubs + every published entity
 * detail URL from D1. Drafts/previews/admin/filters excluded by
 * construction. Falls back to a hubs-only document when D1 is unavailable
 * (local dev without bindings) so the route never 500s. Static
 * public/sitemap.xml remains as the deploy-time fallback underneath.
 */
async function serveDynamicSitemap(request: Request, env: unknown): Promise<Response> {
  const fallback = (hubs: readonly string[]): Response => {
    const urls = hubs.map((h) => `  <url><loc>https://hawkbucks.com${h}</loc></url>`).join("\n");
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
      { status: 200, headers: { "content-type": "application/xml; charset=utf-8" } },
    );
  };
  try {
    const runtime = (
      request as unknown as {
        runtime?: { cloudflare?: { env?: { DB?: unknown; CMS_DB?: unknown } } };
      }
    ).runtime?.cloudflare?.env;
    const rawEnv = (env ?? runtime) as
      | {
          DB?: {
            prepare(q: string): {
              bind(...v: unknown[]): {
                all<T>(): Promise<{ results: T[] }>;
              };
            };
          };
          CMS_DB?: unknown;
        }
      | undefined;
    const db = (rawEnv?.DB ?? (rawEnv as { CMS_DB?: unknown } | undefined)?.CMS_DB) as
      | {
          prepare(q: string): {
            bind(...v: unknown[]): {
              all<T>(): Promise<{ results: T[] }>;
            };
          };
        }
      | undefined;
    if (!db || typeof db.prepare !== "function") {
      return fallback(SITEMAP_FALLBACK_HUBS);
    }
    const { buildSitemapXml } = await import("./lib/cms/sitemap.server");
    const xml = await buildSitemapXml(db as unknown as import("./lib/cms/db.server").D1Database);
    return new Response(xml, {
      status: 200,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return fallback(SITEMAP_FALLBACK_HUBS);
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Phase 23 — one cryptographically random CSP nonce per HTTP response,
    // generated up front so EVERY exit path below (redirects, sitemap, SSR,
    // server functions and the 500 page) carries a policy that matches the
    // markup. `runWithCspNonce` scopes it to this request's async context so
    // `src/router.tsx`'s `getRouter()` — which TanStack calls lazily while
    // rendering — reads exactly this value and stamps it onto every inline
    // script React and the router emit. Concurrent requests on the same isolate
    // never observe each other's nonce.
    const cspNonce = generateCspNonce();
    // `harden` is the single funnel every response passes through. CSP is
    // applied AFTER the security headers so it is always present, and it is
    // applied to the FINAL response object so streamed SSR (whose headers are
    // committed before the body finishes) still carries it.
    const harden = (response: Response) =>
      applyContentSecurityPolicy(applySecurityHeaders(response), cspNonce);

    // Phase 9: redirect the www host to the canonical apex domain before any
    // SSR or server-function work runs. Most static-asset requests are served
    // from the edge asset store before this handler is invoked; any request
    // that does reach this handler on the www host must never produce
    // canonical HTML.
    const requestUrl = new URL(request.url);
    if (requestUrl.host === WWW_HOST) {
      return harden(wwwRedirectResponse(requestUrl));
    }

    // Phase 10: the legacy Pages hostname 301s to the canonical apex before
    // any SSR runs, so pages.dev can never serve canonical HTML either.
    if (requestUrl.host === PAGES_DEV_HOST) {
      return harden(pagesDevRedirectResponse(requestUrl));
    }

    // No binding registration here: the Nitro cloudflare-pages runtime already
    // attached `env` to this request (`request.runtime.cloudflare.env`), and
    // TanStack Start keeps that same request object in its request-scoped
    // AsyncLocalStorage, so the server-only transport resolves the binding
    // from the current request (see src/services/missions.server.ts).
    if (requestUrl.pathname === "/sitemap.xml") {
      return harden(await serveDynamicSitemap(request, env));
    }
    try {
      const handler = await getServerEntry();
      // The router entry is invoked INSIDE the nonce scope so `getRouter()` can
      // read it. Server-function RPC responses are non-HTML and carry no inline
      // scripts, but they still receive the same policy — harmless and simpler
      // than special-casing the content type.
      const response = await runWithCspNonce(cspNonce, () => handler.fetch(request, env, ctx));
      return harden(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return harden(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
