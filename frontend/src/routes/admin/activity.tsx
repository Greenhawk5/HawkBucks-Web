import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  getActivitySeries,
  getActivitySummary,
  listActivityEvents,
  listAuthEvents,
  type ActivityEventItem,
  type ActivitySeriesPoint,
  type ActivitySummary,
  type AuthHistoryItem,
} from "@/lib/cms/activity-intel.loader";
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
  CmsStatCard,
  CmsStatusBadge,
  relativeTime,
} from "@/components/cms/cc/CmsPrimitives";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";
import { CmsActivityChart } from "@/components/cms/cc/CmsActivityChart";

type LoaderData = {
  session: Awaited<ReturnType<typeof getAdminSession>>;
  items: ActivityEventItem[];
  summary: ActivitySummary | null;
  series: ActivitySeriesPoint[];
  hasAuthHistory: boolean;
  authItems: AuthHistoryItem[];
  authAvailable: boolean;
  forbidden: boolean;
};

export const Route = createFileRoute("/admin/activity")({
  loader: async (): Promise<LoaderData> => {
    const session = await getAdminSession();
    if (!session.authenticated) {
      return {
        session,
        items: [],
        summary: null,
        series: [],
        hasAuthHistory: false,
        authItems: [],
        authAvailable: false,
        forbidden: false,
      };
    }
    try {
      const [{ items }, summary, seriesResult, authResult] = await Promise.all([
        listActivityEvents({ data: { limit: 100 } }),
        getActivitySummary({ data: { days: 7 } }).catch(() => null),
        getActivitySeries({ data: { days: 14 } }).catch(() => ({
          days: [],
          hasAuthHistory: false,
        })),
        listAuthEvents({ data: { limit: 20 } }).catch(() => ({ items: [], available: false })),
      ]);
      return {
        session,
        items,
        summary,
        series: seriesResult.days,
        hasAuthHistory: seriesResult.hasAuthHistory,
        authItems: authResult.items,
        authAvailable: authResult.available,
        forbidden: false,
      };
    } catch {
      // Non-admin roles cannot read the audit trail (cms.admin required).
      return {
        session,
        items: [],
        summary: null,
        series: [],
        hasAuthHistory: false,
        authItems: [],
        authAvailable: false,
        forbidden: true,
      };
    }
  },
  head: () => ({
    meta: [
      { title: "Activity & Security — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Activity & Security" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Activity & Security" backTo="/admin" error={error} />
  ),
  component: ActivityAdmin,
});

function ActivityAdmin() {
  const data = Route.useLoaderData() as LoaderData;
  if (!data.session.authenticated || !data.session.user)
    return <CmsSignInRequired title="Activity & Security" />;
  return (
    <CmsShell active="activity" sessionUser={data.session.user} expiresAt={data.session.expiresAt}>
      <ActivityBody data={data} />
    </CmsShell>
  );
}

const KIND_LABEL: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  session_expired: "Session expired",
  session_revoked: "Session revoked",
};

function formatGeo(item: AuthHistoryItem): string | null {
  const parts = [item.city, item.region, item.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function ActivityBody({ data }: { data: LoaderData }) {
  const [family, setFamily] = useState("");
  const [outcome, setOutcome] = useState("");
  const [search, setSearch] = useState("");
  const [rangeDays, setRangeDays] = useState("14");
  const [series, setSeries] = useState<ActivitySeriesPoint[]>(data.series);
  const [seriesPending, setSeriesPending] = useState(false);

  if (data.forbidden) {
    return (
      <div className="space-y-5">
        <CmsPageHeader
          eyebrow="Operations · Activity"
          title="Activity & Security"
          description="Operational history, authentication events, content changes, and system activity."
        />
        <CmsNotice kind="warning">
          Reading the audit trail requires the admin role. Your session is valid but lacks cms.admin
          — ask an admin to grant access.
        </CmsNotice>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const visible = data.items.filter(
    (i) =>
      (family === "" || i.action.startsWith(family)) &&
      (outcome === "" ||
        (outcome === "failure"
          ? /failure|fail|revoke|delete|expired/.test(i.action)
          : !/failure|fail|revoke|delete|expired/.test(i.action))) &&
      (q === "" ||
        i.action.toLowerCase().includes(q) ||
        (i.actorUsername ?? "").toLowerCase().includes(q) ||
        i.entityType.toLowerCase().includes(q) ||
        i.entityId.toLowerCase().includes(q)),
  );

  async function changeRange(days: string) {
    setRangeDays(days);
    setSeriesPending(true);
    try {
      const result = await getActivitySeries({ data: { days: Number(days) } });
      setSeries(result.days);
    } catch {
      // Keep the previous series on failure — the loader's snapshot stays.
    } finally {
      setSeriesPending(false);
    }
  }

  const failedCount = data.summary?.failedLogins ?? 0;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Operations · Activity"
        title="Activity & Security"
        description="Operational history, authentication events, content changes, and system activity. Every number below is computed from stored events — no synthetic scores, no fabricated trends."
        action={
          <button
            type="button"
            className="cc-btn cc-btn-ghost cc-btn-sm"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        }
      />

      {/* KPI row — real counts with explicit window, never trends */}
      {data.summary ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <CmsStatCard
            label="Successful logins"
            value={data.summary.successfulLogins}
            hint={`Last ${data.summary.windowDays} days${data.summary.hasAuthHistory ? "" : " · legacy audit"}`}
            tone="accent"
          />
          <CmsStatCard
            label="Failed logins"
            value={data.summary.failedLogins}
            hint={`Last ${data.summary.windowDays} days${data.summary.hasAuthHistory ? "" : " · tracked going forward"}`}
            tone={failedCount > 0 ? "danger" : "default"}
          />
          <CmsStatCard
            label="Content changes"
            value={data.summary.contentChanges}
            hint={`Last ${data.summary.windowDays} days · create/update/publish`}
          />
          <CmsStatCard
            label="Media operations"
            value={data.summary.mediaOperations}
            hint={`Last ${data.summary.windowDays} days · upload/delete`}
          />
        </div>
      ) : (
        <CmsNotice kind="warning">
          Activity summary is unavailable right now. The event stream below loads independently.
        </CmsNotice>
      )}

      {/* Trend chart — real per-day buckets, lazy-loaded Recharts */}
      <CmsCard
        title="Activity volume"
        action={
          <label className="flex items-center gap-2 text-xs" htmlFor="activity-range">
            <span className="opacity-60">Range</span>
            <CmsSelect
              id="activity-range"
              value={rangeDays}
              onChange={changeRange}
              options={[
                { value: "7", label: "7 days" },
                { value: "14", label: "14 days" },
                { value: "30", label: "30 days" },
              ]}
            />
          </label>
        }
      >
        {seriesPending ? (
          <p className="py-8 text-center text-xs opacity-60" role="status">
            Loading {rangeDays}-day buckets…
          </p>
        ) : (
          <CmsActivityChart days={series} />
        )}
        {!data.hasAuthHistory ? (
          <p className="mt-2 border-t pt-2.5 text-[11px] leading-relaxed opacity-60 cc-hairline">
            Login series start with this release — earlier sign-ins predate telemetry and are not
            backfilled. Content and media series cover the full stored audit history.
          </p>
        ) : null}
      </CmsCard>

      {/* Login history — privacy-scrubbed security telemetry */}
      <CmsCard
        title="Login history"
        action={<span className="font-mono text-xs opacity-60">coarse geo · parsed device</span>}
      >
        {!data.authAvailable ? (
          <CmsEmpty
            title="No login history yet"
            description="Per-attempt login telemetry (success/failure, coarse location, parsed device — never raw IPs or user-agents) is recorded going forward from this release. History is never backfilled."
          />
        ) : data.authItems.length === 0 ? (
          <CmsEmpty
            title="No login events in range"
            description="Successful and failed sign-ins appear here once recorded."
          />
        ) : (
          <ul className="divide-y divide-white/5">
            {data.authItems.slice(0, 10).map((a) => {
              const geo = formatGeo(a);
              return (
                <li key={a.id} className="flex items-start gap-3 py-2.5">
                  <span
                    aria-hidden="true"
                    className={
                      a.outcome === "failure"
                        ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--cc-danger)]"
                        : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--cc-accent)]"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {KIND_LABEL[a.kind] ?? a.kind}{" "}
                      <CmsStatusBadge tone={a.outcome === "failure" ? "danger" : "ok"}>
                        {a.outcome}
                      </CmsStatusBadge>
                    </p>
                    <p className="mt-0.5 truncate text-xs opacity-60">
                      {[a.username ?? "unknown", a.deviceLabel, geo].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <time
                    className="shrink-0 text-xs opacity-60"
                    dateTime={a.createdAt}
                    title={a.createdAt}
                  >
                    {relativeTime(a.createdAt)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </CmsCard>

      {/* Event stream with server-capable filters */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="cc-eyebrow">Event stream</h2>
            <p className="mt-1 text-sm opacity-70" role="status">
              Showing {visible.length} of {data.items.length} (newest first, max 100).
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="min-w-52 flex-1 sm:max-w-xs">
            <span className="sr-only">Search activity</span>
            <input
              className="cc-input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, actor, entity…"
            />
          </label>
          <label className="flex items-center gap-2 text-sm" htmlFor="activity-family-filter">
            <span className="text-xs opacity-70">Family</span>
            <CmsSelect
              id="activity-family-filter"
              value={family}
              onChange={setFamily}
              options={[
                { value: "", label: "All" },
                { value: "content.", label: "Content" },
                { value: "translation.", label: "Translation" },
                { value: "media.", label: "Media" },
                { value: "cms.", label: "Authentication" },
                { value: "preview.", label: "Preview" },
                { value: "slug.", label: "Slugs" },
              ]}
            />
          </label>
          <label className="flex items-center gap-2 text-sm" htmlFor="activity-outcome-filter">
            <span className="text-xs opacity-70">Outcome</span>
            <CmsSelect
              id="activity-outcome-filter"
              value={outcome}
              onChange={setOutcome}
              options={[
                { value: "", label: "Any" },
                { value: "success", label: "Success" },
                { value: "failure", label: "Failure" },
              ]}
            />
          </label>
        </div>

        <div className="mt-3">
          {visible.length === 0 ? (
            <CmsEmpty
              title={data.items.length === 0 ? "No audit events yet" : "No matches"}
              description={
                data.items.length === 0
                  ? "Events are recorded for every privileged mutation — sign-in, create, update, publish, media, and preview issuance."
                  : "Try clearing the search or choosing a different filter."
              }
            />
          ) : (
            <div className="cc-panel" style={{ padding: 0 }}>
              <ul className="divide-y divide-white/5">
                {visible.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 px-4 py-3">
                    <ActivityDot action={event.action} />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-medium">
                        {humanizeAction(event.action)}
                        <span className="opacity-60"> · {event.entityType}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs opacity-60" title={event.entityId}>
                        {event.actorUsername ?? "unknown actor"} · {event.entityId}
                      </p>
                    </div>
                    <span className="hidden shrink-0 sm:block">
                      <CmsLifecycleBadge status={lifecycleFor(event.action) ?? "draft"} />
                    </span>
                    <time
                      className="shrink-0 text-xs opacity-60"
                      dateTime={event.createdAt}
                      title={event.createdAt}
                    >
                      {relativeTime(event.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityDot({ action }: { action: string }) {
  const tone = /delete|failure|fail|expired/.test(action)
    ? "bg-[var(--cc-danger)]"
    : /publish|login|create|upload/.test(action)
      ? "bg-[var(--cc-accent)]"
      : /unpublish|archive|revoke/.test(action)
        ? "bg-[var(--cc-amber)]"
        : "bg-white/25";
  return <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone}`} />;
}

function humanizeAction(action: string): string {
  const labels: Record<string, string> = {
    "content.create": "Created",
    "content.update": "Updated",
    "content.publish": "Published",
    "content.unpublish": "Unpublished",
    "content.archive": "Archived",
    "translation.upsert": "Translation saved",
    "slug.reserve": "Slug reserved",
    "media.upload": "Media uploaded",
    "media.delete": "Media deleted",
    "preview.issue": "Preview issued",
    "preview.revoke": "Preview revoked",
    "cms.login": "Login",
    "cms.logout": "Logout",
  };
  return labels[action] ?? action;
}

function lifecycleFor(action: string): string | null {
  if (action === "content.publish") return "published";
  if (action === "content.archive") return "archived";
  if (action === "content.unpublish") return "draft";
  return null;
}
