/**
 * Content Platform — canonical guide path helpers (PURE LOGIC).
 *
 * Canonical IA (Master Spec §1.5 + §3.4): /guides + /guides/:slug serve CMS
 * article content. Editorial cluster landings live at /guides/topics/:topic.
 * Legacy /articles/* URLs redirect permanently, never canonical.
 */

export function guideHubPath(): string {
  return "/guides";
}

export function guideDetailPath(slug: string): string {
  return `/guides/${slug}`;
}

export function guideTopicPath(topic: string): string {
  return `/guides/topics/${topic}`;
}

export function guideLocalizePath(basePath: string, locale: string): string {
  return locale === "en" ? basePath : `/${locale}${basePath}`;
}
