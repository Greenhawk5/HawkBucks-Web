import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy hub: /inventory → canonical /schematics, permanently (308).
 *
 * This route is the PARENT of /inventory/$slug, so its beforeLoad runs for
 * nested paths too and would otherwise swallow the slug (sending
 * /inventory/siegebreaker to the hub instead of the detail page). Any
 * remaining path segments are re-attached here, and query strings
 * (filters/search/page) are preserved verbatim, so existing links,
 * bookmarks, and inbound search results all keep working.
 */
export const Route = createFileRoute("/inventory")({
  beforeLoad: ({ location, search }) => {
    const rest = location.pathname.replace(/^\/inventory/, "");
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries((search ?? {}) as Record<string, unknown>)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    throw redirect({
      href: `/schematics${rest}${qs === "" ? "" : `?${qs}`}`,
      statusCode: 308,
    });
  },
});
