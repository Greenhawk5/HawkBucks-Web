import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy preview route → canonical /guides/preview (params preserved). */
export const Route = createFileRoute("/articles/preview")({
  beforeLoad: ({ search }) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries((search ?? {}) as Record<string, unknown>)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    throw redirect({ href: qs === "" ? "/guides/preview" : `/guides/preview?${qs}` });
  },
});
