import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy hub: /articles → canonical /guides hub, permanently (308).
 *
 * Parent of /articles/$slug, so any remaining path segments are re-attached to
 * keep legacy detail links resolving to their guide rather than the hub.
 * Query strings are preserved verbatim.
 */
export const Route = createFileRoute("/articles")({
  beforeLoad: ({ location, search }) => {
    const rest = location.pathname.replace(/^\/articles/, "");
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries((search ?? {}) as Record<string, unknown>)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    throw redirect({
      href: `/guides${rest}${qs === "" ? "" : `?${qs}`}`,
      statusCode: 308,
    });
  },
});
