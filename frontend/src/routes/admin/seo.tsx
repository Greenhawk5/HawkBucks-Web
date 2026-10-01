import { createFileRoute } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  getSeoIssues,
  getSeoOverview,
  seoProblemLabel,
  type SeoIssue,
  type SeoOverview,
} from "@/lib/cms/seo-diagnostics.loader";
import { INDEXABLE_BASE_PATHS } from "@/lib/locale-urls";
import { SITE_URL } from "@/lib/site";
import { CmsShell } from "@/components/cms/cc/CmsShell";
import {
  CmsRouteErrorStandalone,
  CmsRoutePending,
  CmsSignInRequired,
} from "@/components/cms/cc/CmsAuth";
import {
  CmsCard,
  CmsEmpty,
  CmsLifecycleBadge,
  CmsNotice,
  CmsPageHeader,
  CmsSectionTitle,
  CmsStatCard,
  CmsStatusBadge,
} from "@/components/cms/cc/CmsPrimitives";

type LoaderData = {
  session: Awaited<ReturnType<typeof getAdminSession>>;
  overview: SeoOverview | null;
  issues: SeoIssue[];
};

export const Route = createFileRoute("/admin/seo")({
  loader: async (): Promise<LoaderData> => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, overview: null, issues: [] };
    const [overview, issueResult] = await Promise.all([
      getSeoOverview({ data: {} }).catch(() => null),
      getSeoIssues({ data: {} }).catch(() => ({ issues: [] as SeoIssue[] })),
    ]);
    return { session, overview, issues: issueResult.issues };
  },
  head: () => ({
    meta: [
      { title: "SEO Center — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="SEO Center" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="SEO Center" backTo="/admin" error={error} />
  ),
  component: SeoAdmin,
});

const ENTITY_EDIT_LINK: Record<string, (id: string) => string> = {
  article: (id) => `/admin/articles/${id}`,
  hero: (id) => `/admin/heroes/${id}`,
  loadout: (id) => `/admin/loadouts/${id}`,
  weapon: (id) => `/admin/inventory/${id}`,
  trap: (id) => `/admin/inventory/${id}`,
  perk: (id) => `/admin/inventory/${id}`,
  schematic: (id) => `/admin/inventory/${id}`,
};

function SeoAdmin() {
  const { session, overview, issues } = Route.useLoaderData() as LoaderData;
  if (!session.authenticated || !session.user) return <CmsSignInRequired title="SEO Center" />;
  const maxPublished = Math.max(1, ...(overview?.entities.map((e) => e.published) ?? [1]));
  return (
    <CmsShell active="seo" sessionUser={session.user} expiresAt={session.expiresAt}>
      <div className="space-y-6">
        <CmsPageHeader
          eyebrow="Operations · SEO"
          title="SEO Center"
          description="Factual metadata diagnostics only — no synthetic scores, no crawler claims, no search-performance fabrication. Every number is counted from stored rows."
        />

        {!overview ? (
          <CmsNotice kind="warning">
            SEO diagnostics are unavailable right now (the CMS database did not answer).
          </CmsNotice>
        ) : (
          <>
            {/* KPI row — published-only, real counts */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <CmsStatCard
                label="Published indexable"
                value={overview.publishedTotal}
                hint="Published rows only"
                tone="accent"
              />
              <CmsStatCard
                label="Complete English metadata"
                value={overview.enComplete}
                hint={`${overview.enIncomplete} incomplete`}
                tone={overview.enIncomplete > 0 ? "warning" : "accent"}
              />
              <CmsStatCard
                label="Missing English body"
                value={overview.missingEnglishBody}
                hint="Published, no en body"
                tone={overview.missingEnglishBody > 0 ? "danger" : "default"}
              />
              <CmsStatCard
                label="Missing OG image"
                value={overview.missingOgImage}
                hint="Published, no OG asset"
                tone={overview.missingOgImage > 0 ? "warning" : "default"}
              />
            </div>

            {/* Indexing posture + coverage */}
            <div className="grid gap-4 xl:grid-cols-2">
              <CmsCard title="Indexing posture (verified)">
                <ul className="space-y-2 text-sm leading-relaxed">
                  <li className="flex flex-wrap gap-2">
                    <span className="font-medium">Canonical host:</span>
                    <span className="font-mono text-xs">{SITE_URL}</span>
                  </li>
                  <li className="flex flex-wrap gap-2">
                    <span className="font-medium">Admin routes:</span>
                    <span className="text-xs opacity-80">
                      all emit noindex, nofollow and are absent from navigation, sitemap, robots
                      overrides, and hreflang alternates.
                    </span>
                  </li>
                  <li className="flex flex-wrap gap-2">
                    <span className="font-medium">Preview route:</span>
                    <span className="text-xs opacity-80">
                      noindex, nofollow + private, no-store cache headers; never linked or
                      sitemapped.
                    </span>
                  </li>
                  <li className="flex flex-wrap gap-2">
                    <span className="font-medium">
                      Public indexable bases ({INDEXABLE_BASE_PATHS.length}):
                    </span>
                    <span className="font-mono text-xs">{INDEXABLE_BASE_PATHS.join(", ")}</span>
                  </li>
                  <li className="flex flex-wrap gap-2">
                    <span className="font-medium">Published-only rule:</span>
                    <span className="text-xs opacity-80">
                      only published rows are indexable or carry canonicals — enforced server-side
                      in public readers, never by the UI.
                    </span>
                  </li>
                </ul>
              </CmsCard>

              <CmsCard
                title="Published coverage by entity"
                action={<span className="font-mono text-xs opacity-60">from D1 now</span>}
              >
                {overview.publishedTotal === 0 ? (
                  <CmsEmpty
                    title="Nothing published yet"
                    description="Publish the first row and it appears here with its entity distribution."
                  />
                ) : (
                  <ul className="space-y-2.5">
                    {overview.entities
                      .filter((e) => e.published > 0 || e.draft > 0)
                      .map((e) => (
                        <li key={e.entity}>
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="font-mono text-xs">{e.entity}</span>
                            <span className="tabular-nums text-xs opacity-80">
                              {e.published} published · {e.draft} draft
                            </span>
                          </div>
                          <div
                            className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8"
                            role="img"
                            aria-label={`${e.entity}: ${e.published} published of ${maxPublished} max`}
                          >
                            <div
                              className="h-full rounded-full bg-[var(--cc-accent)]"
                              style={{
                                width: `${Math.round((e.published / maxPublished) * 100)}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </CmsCard>
            </div>

            {/* Metadata health — computed completeness, not a score */}
            <CmsCard title="Metadata health (published English translations)">
              <MetadataBar
                label="Complete title + body + slug"
                done={overview.enComplete}
                total={overview.publishedTotal}
              />
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <HealthCell label="Missing SEO title" n={overview.missingSeoTitle} />
                <HealthCell label="Missing SEO description" n={overview.missingSeoDescription} />
                <HealthCell label="Missing OG image" n={overview.missingOgImage} />
              </div>
              <p className="mt-2.5 border-t pt-2.5 text-[11px] leading-relaxed opacity-60 cc-hairline">
                Completeness is a count of records passing deterministic checks — it is not a
                ranking, traffic, or quality score.
              </p>
            </CmsCard>
          </>
        )}

        {/* Actionable issue center */}
        <div>
          <CmsSectionTitle>Issue center</CmsSectionTitle>
          <p className="mt-1 text-sm opacity-70">
            Published-only. Each issue names the record and links to its editor.
          </p>
          <div className="mt-3 space-y-2">
            {issues.length === 0 ? (
              <CmsNotice kind="success">
                No metadata gaps on published content. Drafts are never flagged — they are not
                indexable.
              </CmsNotice>
            ) : (
              issues.slice(0, 30).map((issue) => (
                <div
                  key={issue.contentId}
                  className="cc-panel flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{issue.title ?? issue.contentId}</p>
                    <p className="mt-0.5 flex flex-wrap gap-1.5">
                      {issue.problems.map((p) => (
                        <CmsStatusBadge
                          key={p}
                          tone={p === "no_body" || p === "no_title" ? "danger" : "warning"}
                        >
                          {seoProblemLabel(p)}
                        </CmsStatusBadge>
                      ))}
                    </p>
                  </div>
                  <span className="flex items-center gap-2">
                    <CmsLifecycleBadge status="published" />
                    <span className="font-mono text-[11px] opacity-60">{issue.entityType}</span>
                    {ENTITY_EDIT_LINK[issue.entityType] !== undefined ? (
                      <a
                        className="cc-link text-xs"
                        href={ENTITY_EDIT_LINK[issue.entityType]?.(issue.contentId)}
                      >
                        Inspect →
                      </a>
                    ) : null}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </CmsShell>
  );
}

function MetadataBar(props: { label: string; done: number; total: number }) {
  const pct = props.total === 0 ? 0 : Math.round((props.done / props.total) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="opacity-80">{props.label}</span>
        <span className="tabular-nums">
          {props.done} / {props.total} · {pct}%
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8"
        role="img"
        aria-label={`${props.label}: ${props.done} of ${props.total} (${pct} percent)`}
      >
        <div className="h-full rounded-full bg-[var(--cc-accent)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HealthCell(props: { label: string; n: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b py-1.5 cc-hairline">
      <span className="text-xs opacity-70">{props.label}</span>
      <span className={`font-semibold tabular-nums ${props.n > 0 ? "text-[var(--cc-amber)]" : ""}`}>
        {props.n}
      </span>
    </div>
  );
}
