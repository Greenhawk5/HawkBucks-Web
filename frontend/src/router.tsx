import { QueryClient, dehydrate, hydrate, type DehydratedState } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { readCspNonce } from "./lib/csp-nonce";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Phase 23 — CSP nonce propagation.
  //
  // `readCspNonce()` returns the per-request nonce that `src/server.ts`
  // generated and bound to this request's async scope, or `undefined` when
  // there is no active request scope (bare unit tests, a mis-wired entry point).
  //
  // `ssr.nonce` is TanStack Router's OWN supported option — not a workaround.
  // The framework threads it into:
  //   * React's `renderToReadableStream({ nonce })` (Suspense-reveal scripts),
  //   * every streamed router script `<script nonce='…'>` (the `$_TSR`
  //     bootstrap + serialized loader/match data),
  //   * the `$tsr` / `$tsr-stream-barrier` script tag,
  //   * `<Scripts>` (client entry chunks) and `<HeadContent>` (JSON-LD,
  //     stylesheets, and the `<meta property="csp-nonce">` the client re-reads
  //     during hydration so client navigation keeps using the same nonce).
  //
  // That is exactly the set of inline scripts a strict `script-src` without
  // `'unsafe-inline'` must authorize, so hydration, streaming, client
  // navigation and server functions all keep working.
  //
  // The value is passed through `...(nonce ? { ssr: { nonce } } : {})` rather
  // than `{ ssr: { nonce: undefined } }` so an absent nonce reproduces the
  // exact pre-Phase-23 router configuration instead of an explicit undefined.
  const nonce = readCspNonce();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    ...(nonce ? { ssr: { nonce } } : {}),
    // Phase 2: transfer the TanStack Query cache to the browser.
    // Server: dehydrate() runs after route loaders (createStartHandler ->
    // router.serverSsr.dehydrate) and the result is embedded in
    // window.$_TSR.router. Client: options.hydrate is awaited with that
    // payload before React renders (router-core ssr-client.js), so hydrated
    // queries are fresh and do not refetch on mount.
    //
    // The payload is carried as a JSON string: the router's static
    // serializability validation (ValidateSerializable) cannot prove
    // DehydratedState (whose `data` is `unknown`) serializable, while a
    // string always passes. JSON also round-trips losslessly here since the
    // query cache contains plain data.
    dehydrate: () => ({ queryState: JSON.stringify(dehydrate(queryClient)) }),
    hydrate: (dehydrated) => {
      hydrate(queryClient, JSON.parse(dehydrated.queryState) as DehydratedState);
    },
  });

  return router;
};
