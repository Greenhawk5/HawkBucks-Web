/**
 * TEST HARNESS ONLY — never imported by application code.
 *
 * The production Nitro/Cloudflare Pages runtime wraps every server request in
 * TanStack Start's request-scoped AsyncLocalStorage (requestHandler /
 * runWithStartContext) with the request object that nitro's cloudflare-pages
 * handler already augmented with `runtime.cloudflare.env`. Server functions
 * and SSR loaders therefore reach the binding through `getRequest()`.
 *
 * These helpers reproduce that exact production mechanism in unit tests, so
 * the transport under test is exercised the same way it runs in production
 * (no `globalThis.__env__` singleton, no registered mutable binding state).
 *
 * `requestHandler` converts its handler's return value into an HTTP Response
 * (and rejections into error Responses). To keep the wrapped function's real
 * return/rejection semantics, the result is captured in a side-channel
 * promise started inside the request scope while the handler itself returns
 * a benign 204 response.
 *
 * - `withHawkbucksRequestObject(request, fn)` — production-shaped form: takes
 *   a Request whose `runtime.cloudflare.env` is already attached (exactly what
 *   nitro's augmentReq produces in dist/_worker.js/index.js).
 * - `withHawkbucksRequest(env, fn)` — convenience form that builds the
 *   production-shaped request from a plain env object.
 */
import { requestHandler } from "@tanstack/react-start/server";

export async function withHawkbucksRequestObject<T>(
  request: Request,
  fn: () => Promise<T> | T,
): Promise<T> {
  let captured!: Promise<T>;
  const wrapped = requestHandler(() => {
    // fn() starts inside the request-scoped AsyncLocalStorage, so every
    // continuation (awaits, dynamic imports) keeps the request context —
    // exactly like SSR loaders and /_serverFn handlers in production.
    captured = Promise.resolve(fn());
    return new Response(null, { status: 204 });
  });
  await wrapped(request, undefined);
  return captured;
}

export async function withHawkbucksRequest<T>(
  env: Record<string, unknown>,
  fn: () => Promise<T> | T,
): Promise<T> {
  const request = Object.assign(new Request("https://hawkbucks.com/"), {
    runtime: { cloudflare: { env } },
  });
  return withHawkbucksRequestObject(request, fn);
}
