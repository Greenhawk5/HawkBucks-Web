/**
 * Shared hero identity resolver (SERVER-ONLY).
 *
 * Single source of truth for "which logical hero does this slug name".
 * Slug rows match in ANY locale namespace (preferring the requested one);
 * translation availability is then gated on requested -> default_locale ->
 * English, so English-only heroes stay reachable from every collection and
 * fr-authored heroes stay reachable for es visitors.
 *
 * Returns null for genuinely missing/unpublished content — never a
 * fabricated hero. Both the full detail loader and the Quick View loader
 * resolve through here so the two surfaces can never disagree.
 */
import type { D1Database } from "./db.server";
import { fallbackLocaleChain } from "./locale-fallback";

export interface HeroIdentity {
  contentId: string;
  defaultLocale: string;
  resolvedLocale: string | null;
  isLocaleFallback: boolean;
  slug: string;
  title: string;
  translationStatus: string;
}

export async function resolveHeroIdentity(
  db: D1Database,
  locale: string,
  slug: string,
): Promise<HeroIdentity | null> {
  // 1. slug -> content id. ANY locale namespace, requested first.
  const { results: slugRows } = await db
    .prepare(
      `SELECT c.id AS content_id, c.default_locale AS default_locale
         FROM cms_slugs s
         JOIN cms_contents c ON c.id = s.content_id
        WHERE s.entity_type = 'hero' AND s.slug = ?
          AND c.status = 'published'
        ORDER BY CASE WHEN s.locale = ? THEN 0 ELSE 1 END
        LIMIT 1`,
    )
    .bind(slug, locale)
    .all<{ content_id: string; default_locale: string }>();
  const contentId = slugRows[0]?.content_id ?? null;
  if (!contentId) return null;
  const defaultLocale = slugRows[0]?.default_locale ?? "en";

  // 2. every translation for this hero; pick per the shared chain.
  const { results: trows } = await db
    .prepare(
      `SELECT locale, title, body, slug, seo_title, seo_description, translation_status
         FROM cms_content_translations WHERE content_id = ? ORDER BY locale ASC`,
    )
    .bind(contentId)
    .all<{
      locale: string;
      title: string;
      body: string;
      slug: string;
      seo_title: string | null;
      seo_description: string | null;
      translation_status: string;
    }>();
  let picked: (typeof trows)[number] | undefined;
  for (const loc of fallbackLocaleChain(locale, defaultLocale)) {
    picked = trows.find((t) => t.locale === loc);
    if (picked) break;
  }
  if (!picked) picked = trows[0];
  if (!picked) return null;

  return {
    contentId,
    defaultLocale,
    resolvedLocale: picked.locale,
    isLocaleFallback: picked.locale !== locale,
    slug: picked.slug,
    title: picked.title,
    translationStatus: picked.translation_status,
  };
}
