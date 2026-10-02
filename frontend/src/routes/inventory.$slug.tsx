import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy route: /inventory/:slug permanently redirects to the canonical
 * /schematics/:slug detail URL (same slug namespace — schematics keep their
 * slugs, only the hub prefix changed).
 *
 * The parent `/inventory` route already handles this path (see inventory.tsx);
 * this route exists so the nested URL shape stays registered and reachable if
 * the parent redirect is ever narrowed.
 */
export const Route = createFileRoute("/inventory/$slug")({
  beforeLoad: ({ params }) => {
    const slug = (params as { slug?: string }).slug ?? "";
    throw redirect({ href: `/schematics/${slug}`, statusCode: 308 });
  },
});
