import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// ---------------------------------------------------------------------------
// Phase 9 — WWW → apex redirect
// https://www.hawkbucks.com is a permanent (308) alias of the canonical apex
// host https://hawkbucks.com. Plain-HTTP www requests are TLS-normalized by
// Cloudflare at the edge ("Always Use HTTPS"); the scheme is also forced here
// so the rule can never emit an http:// Location. The apex host falls through
// untouched, so no redirect loop is possible. Other hosts (pages.dev,
// workers.dev previews, localhost) are intentionally unaffected.
// Exported for tests; www-redirect.test.mjs asserts the exact host contract.
export const APEX_HOST = "hawkbucks.com";
export const WWW_HOST = `www.${APEX_HOST}`;

function wwwRedirectResponse(requestUrl: URL): Response {
  const target = new URL(requestUrl.href);
  target.protocol = "https:";
  target.host = APEX_HOST; // pathname + search are preserved verbatim
  return new Response(null, {
    // 308 Permanent Redirect preserves the request method (unlike 301) and is
    // treated as permanent by search engines, consolidating the www host.
    status: 308,
    headers: { Location: target.toString() },
  });
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

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Phase 9: redirect the www host to the canonical apex domain before any
    // SSR or server-function work runs. Most static-asset requests are served
    // from the edge asset store before this handler is invoked; any request
    // that does reach this handler on the www host must never produce
    // canonical HTML.
    const requestUrl = new URL(request.url);
    if (requestUrl.host === WWW_HOST) {
      return wwwRedirectResponse(requestUrl);
    }

    // No binding registration here: the Nitro cloudflare-pages runtime already
    // attached `env` to this request (`request.runtime.cloudflare.env`), and
    // TanStack Start keeps that same request object in its request-scoped
    // AsyncLocalStorage, so the server-only transport resolves the binding
    // from the current request (see src/services/missions.server.ts).
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
