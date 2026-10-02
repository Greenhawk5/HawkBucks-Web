import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy route: /articles/:slug permanently redirects to the canonical
 * /guides/:slug detail URL (same slug namespace — CMS articles keep their
 * slugs, only the hub prefix changed).
 */
export const Route = createFileRoute("/articles/$slug")({
  beforeLoad: ({ params }) => {
    const slug = (params as { slug?: string }).slug ?? "";
    throw redirect({ href: `/guides/${slug}`, statusCode: 308 });
  },
});
