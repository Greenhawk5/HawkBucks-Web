/**
 * Content Platform — dynamic sitemap builder (SERVER-ONLY).
 *
 * Emits the static hub set (bare + 9 locale prefixes) PLUS every published
 * entity detail URL with a complete translation set driving localized
 * alternates. Excludes drafts, previews, admin, search/filter combinations,
 * and unpublished content by construction (all queries require
 * c.status = 'published').
 *
 * lastmod comes from cms_contents.updated_at (real CMS state, never faked).
 */

import { SITE_URL } from "@/lib/site";
import { INDEXABLE_BASE_PATHS } from "@/lib/locale-urls";
import { SUPPORTED_LANGUAGES } from "@/lib/preferences";
import type { D1Database } from "./db.server";

/**
 * PHASE 22 — sourced from INDEXABLE_BASE_PATHS instead of a hand-copied list.
 *
 * The previous local `HUBS` const had drifted: it omitted `/about`,
 * `/vbucks-missions` and `/missions-guide`, so all 27 of their localized
 * variants were missing from the generated sitemap. INDEXABLE_BASE_PATHS is
 * the documented single source of truth for the indexable surface, so the
 * sitemap now derives from it and cannot silently fall behind the routes
 * again.
 *
 * Redirect sources (`/inventory`, `/articles`) are intentionally NOT listed
 * here: they are 308s, not documents. CMS entity detail URLs are appended
 * below from published rows only.
 */
const HUBS: readonly string[] = INDEXABLE_BASE_PATHS;

function localize(base: string, locale: string): string {
  return locale === "en" ? base : base === "/" ? `/${locale}` : `/${locale}${base}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface EntityUrlRow {
  entity_type: string;
  slug: string;
  locale: string;
  updated_at: string;
}

function baseForEntity(entityType: string): string | null {
  if (entityType === "hero") return "/heroes";
  if (entityType === "loadout") return "/loadouts";
  if (entityType === "schematic") return "/schematics";
  if (entityType === "article") return "/guides";
  return null;
}

export async function buildSitemapXml(db: D1Database): Promise<string> {
  const parts: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  for (const hub of HUBS) {
    const alternates = SUPPORTED_LANGUAGES.map(
      (code) =>
        `    <xhtml:link rel="alternate" hreflang="${code}" href="${esc(SITE_URL + escPath(localize(hub, code)))}"/>`,
    ).join("\n");
    parts.push(
      `  <url>\n    <loc>${esc(SITE_URL + escPath(hub))}</loc>\n${alternates}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(SITE_URL + escPath(hub))}"/>\n  </url>`,
    );
  }
  const { results } = await db
    .prepare(
      `SELECT c.entity_type AS entity_type, t.slug AS slug, t.locale AS locale,
              c.updated_at AS updated_at
       FROM cms_contents c
       JOIN cms_content_translations t ON t.content_id = c.id
       WHERE c.status = 'published'
         AND c.entity_type IN ('hero','loadout','schematic','article')
         AND t.translation_status = 'complete'
       ORDER BY c.entity_type ASC, c.updated_at DESC
       LIMIT 20000`,
    )
    .all<EntityUrlRow>();
  const byContent = new Map<string, EntityUrlRow[]>();
  for (const r of results) {
    const base = baseForEntity(r.entity_type);
    if (!base || !r.slug) continue;
    const key = `${r.entity_type}::${r.slug}::${r.updated_at}`;
    void key;
    const list = byContent.get(`${r.entity_type}::${r.slug}`) ?? [];
    list.push(r);
    byContent.set(`${r.entity_type}::${r.slug}`, list);
  }
  for (const [key, rows] of byContent) {
    const [entityType] = key.split("::");
    const base = baseForEntity(entityType ?? "");
    if (!base) continue;
    const en = rows.find((r) => r.locale === "en") ?? rows[0];
    if (!en) continue;
    const loc = `${SITE_URL}${base}/${en.slug}`;
    const lastmod = en.updated_at.slice(0, 10);
    const alternates = rows
      .map(
        (r) =>
          `    <xhtml:link rel="alternate" hreflang="${r.locale}" href="${esc(`${SITE_URL}${localize(`${base}/${r.slug}`, r.locale)}`)}"/>`,
      )
      .join("\n");
    parts.push(
      `  <url>\n    <loc>${esc(loc)}</loc>\n    <lastmod>${esc(lastmod)}</lastmod>\n${alternates}\n  </url>`,
    );
  }
  parts.push("</urlset>");
  return parts.join("\n");
}

function escPath(p: string): string {
  return p;
}
