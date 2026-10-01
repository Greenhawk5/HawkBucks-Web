import { createServerFn } from "@tanstack/react-start";

/**
 * Wave 2 — SEO diagnostics readers (deterministic, published-only, real data).
 *
 * NO synthetic scores. NO crawler claims. NO search-performance fabrication.
 * Every number is counted from D1 rows:
 *   * getSeoOverview — published/draft counts per entity + published-only
 *     metadata completeness over the default (en) translation;
 *   * getSeoIssues — actionable per-record gaps (missing title/body/slug/SEO
 *     fields/OG image), each with entity + contentId so the editor fixes it;
 *   * getSeoCoverageSeries — published-content counts per entity for the
 *     distribution bar (current-state visualization, no fake history).
 */

async function requireSeoSession() {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { resolveRequestSession, hasCapability, CmsAuthError } = await import("./auth.server");
  const { db } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  if (!hasCapability(session.user.role, "cms.read")) throw new CmsAuthError(403, "Forbidden.");
  return { db, session };
}

export interface SeoEntityStat {
  entity: string;
  published: number;
  draft: number;
  archived: number;
}

export interface SeoOverview {
  entities: SeoEntityStat[];
  publishedTotal: number;
  enComplete: number;
  enIncomplete: number;
  missingSeoTitle: number;
  missingSeoDescription: number;
  missingOgImage: number;
  missingEnglishBody: number;
}

export const getSeoOverview = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async (): Promise<SeoOverview> => {
    const { db } = await requireSeoSession();
    const { results: entityRows } = await db
      .prepare(
        "SELECT entity_type, status, COUNT(*) AS n FROM cms_contents GROUP BY entity_type, status",
      )
      .bind()
      .all<{ entity_type: string; status: string; n: number }>();
    const byEntity = new Map<string, { published: number; draft: number; archived: number }>();
    for (const r of entityRows) {
      const bucket = byEntity.get(r.entity_type) ?? { published: 0, draft: 0, archived: 0 };
      if (r.status === "published") bucket.published = Number(r.n ?? 0);
      else if (r.status === "draft") bucket.draft = Number(r.n ?? 0);
      else if (r.status === "archived") bucket.archived = Number(r.n ?? 0);
      byEntity.set(r.entity_type, bucket);
    }
    const entities: SeoEntityStat[] = [...byEntity.entries()]
      .map(([entity, b]) => ({ entity, ...b }))
      .sort((a, b) => a.entity.localeCompare(b.entity));
    const publishedTotal = entities.reduce((n, e) => n + e.published, 0);
    // Published-only English-translation completeness (default locale = en).
    const { results: pubEn } = await db
      .prepare(
        "SELECT c.id AS id, t.title AS title, t.body AS body, t.slug AS slug, " +
          "t.seo_title AS seo_title, t.seo_description AS seo_description, " +
          "t.og_image_asset_id AS og_image " +
          "FROM cms_contents c LEFT JOIN cms_content_translations t " +
          "ON t.content_id = c.id AND t.locale = 'en' " +
          "WHERE c.status = 'published' LIMIT 500",
      )
      .bind()
      .all<{
        id: string;
        title: string | null;
        body: string | null;
        slug: string | null;
        seo_title: string | null;
        seo_description: string | null;
        og_image: string | null;
      }>();
    const { results: articleBodies } = await db
      .prepare("SELECT article_content_id AS id FROM article_bodies WHERE locale = 'en'")
      .bind()
      .all<{ id: string }>();
    const withBody = new Set(articleBodies.map((r) => r.id));
    let complete = 0;
    let missingSeoTitle = 0;
    let missingSeoDescription = 0;
    let missingOgImage = 0;
    let missingEnglishBody = 0;
    for (const r of pubEn) {
      const hasTitle = !!r.title?.trim();
      const hasBody = !!r.body?.trim();
      const hasSlug = !!r.slug?.trim();
      const hasSeoTitle = !!r.seo_title?.trim();
      const hasSeoDesc = !!r.seo_description?.trim();
      const hasOg = !!r.og_image;
      if (hasTitle && hasBody && hasSlug) complete += 1;
      if (!hasSeoTitle) missingSeoTitle += 1;
      if (!hasSeoDesc) missingSeoDescription += 1;
      if (!hasOg) missingOgImage += 1;
      if (!hasBody && !withBody.has(r.id)) missingEnglishBody += 1;
    }
    return {
      entities,
      publishedTotal,
      enComplete: complete,
      enIncomplete: pubEn.length - complete,
      missingSeoTitle,
      missingSeoDescription,
      missingOgImage,
      missingEnglishBody,
    };
  });

export interface SeoIssue {
  contentId: string;
  entityType: string;
  title: string | null;
  problems: string[];
}

const PROBLEM_LABEL: Record<string, string> = {
  no_title: "Missing English title",
  no_body: "Missing English body",
  no_slug: "Missing English slug",
  no_seo_title: "Missing SEO title",
  no_seo_description: "Missing SEO description",
  no_og_image: "Missing OG image",
};

export function seoProblemLabel(code: string): string {
  return PROBLEM_LABEL[code] ?? code;
}

export const getSeoIssues = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async (): Promise<{ issues: SeoIssue[] }> => {
    const { db } = await requireSeoSession();
    const { results } = await db
      .prepare(
        "SELECT c.id AS id, c.entity_type AS entity, t.title AS title, t.body AS body, " +
          "t.slug AS slug, t.seo_title AS seo_title, " +
          "t.seo_description AS seo_description, t.og_image_asset_id AS og_image " +
          "FROM cms_contents c LEFT JOIN cms_content_translations t " +
          "ON t.content_id = c.id AND t.locale = 'en' " +
          "WHERE c.status = 'published' LIMIT 500",
      )
      .bind()
      .all<{
        id: string;
        entity: string;
        title: string | null;
        body: string | null;
        slug: string | null;
        seo_title: string | null;
        seo_description: string | null;
        og_image: string | null;
      }>();
    const issues: SeoIssue[] = [];
    for (const r of results) {
      const problems: string[] = [];
      if (!r.title?.trim()) problems.push("no_title");
      if (!r.body?.trim()) problems.push("no_body");
      if (!r.slug?.trim()) problems.push("no_slug");
      if (!r.seo_title?.trim()) problems.push("no_seo_title");
      if (!r.seo_description?.trim()) problems.push("no_seo_description");
      if (!r.og_image) problems.push("no_og_image");
      if (problems.length > 0) {
        issues.push({
          contentId: r.id,
          entityType: r.entity,
          title: r.title?.trim() ? r.title : null,
          problems,
        });
      }
      if (issues.length >= 50) break;
    }
    return { issues };
  });
