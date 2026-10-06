// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig, type LovableViteTanstackOptions } from "@lovable.dev/vite-tanstack-config";

/**
 * `LovableViteTanstackOptions["nitro"]` widened with Nitro's real
 * `cloudflare.pages` option, which the wrapper's hand-written type omits
 * (it only declares `nodeCompat` / `deployConfig`). Nitro reads
 * `cloudflare.pages.routes.exclude` when it writes dist/_routes.json, so this
 * is the genuine upstream API surface, declared here rather than cast.
 */
type NitroPagesOption = Exclude<LovableViteTanstackOptions["nitro"], boolean> & {
  cloudflare?: {
    nodeCompat?: boolean;
    deployConfig?: boolean;
    pages?: {
      routes?: {
        version?: number;
        include?: string[];
        exclude?: string[];
      };
    };
  };
};

/**
 * Cloudflare Pages routing — emitted as dist/_routes.json by the
 * cloudflare-pages preset (`NITRO_PRESET=cloudflare-pages vite build`).
 *
 * By default Nitro enumerates every built file as an individual `exclude`
 * entry and then TRUNCATES that list to fit Cloudflare's hard limit of 100
 * routes (`routes.exclude.splice(100 - routes.include.length)` in
 * nitro/dist/_presets.mjs). Assets sort by name, so as soon as a build has more
 * than ~99 of them the alphabetically-last entries are silently dropped.
 * `styles-<hash>.css` sorts late, so it was NOT excluded: every
 * /assets/styles-*.css request was routed to the SSR Worker instead of the
 * static asset store.
 *
 * That is harmless while the asset exists — the Worker serves it correctly —
 * but when an HTML document references a stylesheet hash that is not in the
 * deployed asset store (a stale/cached document, or a partially visible deploy)
 * the request still reaches the Worker, which has no such file and falls back to
 * rendering the entire SSR HTML document, returned as `text/html` with a 404
 * status. Under `X-Content-Type-Options: nosniff` the browser rejects that body
 * for a stylesheet request (NS_ERROR_CORRUPTED_CONTENT) and the page renders as
 * completely unstyled HTML.
 *
 * Declaring `/assets/*` as ONE wildcard route fixes both halves: assets are
 * served from the static asset store (correct MIME, edge-cached, and a real
 * static 404 instead of an HTML body), and the 99-entry budget is freed so
 * Nitro's truncation can no longer drop any other path. Root-level static files
 * (sw.js, robots.txt, sitemap.xml, icons) are still enumerated by Nitro and are
 * unaffected.
 */
const nitroOptions: NitroPagesOption = {
  cloudflare: {
    pages: {
      routes: {
        exclude: ["/assets/*"],
      },
    },
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: nitroOptions,
});
