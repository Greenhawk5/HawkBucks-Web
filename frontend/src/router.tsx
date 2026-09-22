import { QueryClient, dehydrate, hydrate, type DehydratedState } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
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
