import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, BellRing, FileText, Package, Swords, Upload, Users } from "lucide-react";

import { ASSETS } from "@/lib/assets";
import { BRAND_NAME } from "@/lib/site";
import {
  adminLogin,
  getAdminSession,
  getTurnstileSiteKey,
  sendTestPush,
  type AdminTestPushResult,
} from "@/lib/cms/admin.loader";
import {
  getOverviewCounts,
  listRecentAuditEvents,
  listRecentContent,
} from "@/lib/cms/overview-admin.loader";
import { getActivitySummary } from "@/lib/cms/activity-intel.loader";
import { useReminderNotifications } from "@/hooks/use-reminder-notifications";
import { CmsShell } from "@/components/cms/cc/CmsShell";
import { CmsBarePage } from "@/components/cms/cc/CmsAuth";
import { CmsLoginBackground } from "@/components/cms/cc/CmsLoginBackground";
import { CmsTurnstile } from "@/components/cms/cc/CmsTurnstile";
import {
  CmsCard,
  CmsEmpty,
  CmsLifecycleBadge,
  CmsNotice,
  CmsPageHeader,
  CmsStatCard,
  relativeTime,
} from "@/components/cms/cc/CmsPrimitives";

/**
 * Control Center entry: standalone restricted sign-in when anonymous,
 * real-data dashboard inside the Control Center shell when authenticated.
 *
 * Security (server-side, unchanged): the loader only resolves the session —
 * every count/activity query re-checks requireCapability inside its handler.
 * This route is noindex/nofollow, absent from navigation + sitemap.
 */

export const Route = createFileRoute("/admin/")({
  loader: async () => {
    const session = await getAdminSession();
    // Public site key (null = Turnstile unconfigured → widget skipped). The
    // SECRET never leaves the server — this is safe to expose to anonymous
    // callers, exactly like any public signup/login CAPTCHA key.
    const { siteKey } = await getTurnstileSiteKey().catch(() => ({ siteKey: null }));
    if (!session.authenticated)
      return { session, siteKey, counts: null, recent: [], activity: [], security: null };
    const [{ counts }, { items: recent }] = await Promise.all([
      getOverviewCounts({ data: {} }).catch(() => ({ counts: null })),
      listRecentContent({ data: { limit: 8 } }).catch(() => ({ items: [] })),
    ]);
    // Activity needs cms.admin; viewers/editors simply see no activity card.
    const { items: activity } = await listRecentAuditEvents({ data: { limit: 6 } }).catch(() => ({
      items: [],
    }));
    // Wave 2 — compact security snapshot (same cms.admin bar; null when the
    // role lacks it, so the dashboard shows the card honestly gated).
    const security = await getActivitySummary({ data: { days: 7 } }).catch(() => null);
    return {
      session,
      siteKey,
      counts,
      recent: recent as Array<{
        contentId: string;
        entityType: string;
        status: string;
        title: string | null;
        updatedAt: string;
      }>,
      activity: activity as Array<{
        id: string;
        actorUsername: string | null;
        action: string;
        entityType: string;
        entityId: string;
        createdAt: string;
      }>,
      security,
    };
  },
  head: () => ({
    meta: [
      { title: "Control Center — HawkBucks" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => (
    <CmsBarePage>
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm opacity-70">Loading Control Center…</p>
      </div>
    </CmsBarePage>
  ),
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsBarePage>
      <div className="mx-auto max-w-md px-4 py-16">
        <CmsNotice kind="error">
          {error instanceof Error ? error.message : "Something went wrong."}
        </CmsNotice>
        <p className="mt-4 text-sm">
          <Link to="/admin" className="cc-link">
            Back to sign-in
          </Link>
        </p>
      </div>
    </CmsBarePage>
  ),
  component: AdminEntry,
});

function AdminEntry() {
  const data = Route.useLoaderData();
  if (!data.session.authenticated || !data.session.user) return <SignInScreen />;
  return (
    <CmsShell active="dashboard" sessionUser={data.session.user} expiresAt={data.session.expiresAt}>
      <Dashboard
        user={data.session.user}
        counts={data.counts}
        recent={data.recent}
        activity={data.activity}
        security={data.security}
      />
    </CmsShell>
  );
}

function SignInScreen() {
  const router = useRouter();
  const loaderData = Route.useLoaderData();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      // The plaintext password travels ONLY in this server-function call
      // (normal form submission → PBKDF2 verification server-side). It is
      // never stored, logged, audited, or returned — see auth.server.ts.
      await adminLogin({
        data: {
          username,
          password,
          ...(turnstileToken ? { turnstileToken } : {}),
        },
      });
      setPassword("");
      setTurnstileToken(null);
      await router.invalidate();
    } catch {
      // Generic on purpose: never reveal whether the username, password, or
      // bot check caused the failure.
      setError("Invalid credentials.");
    } finally {
      setPending(false);
    }
  }

  return (
    <CmsBarePage>
      {/* Decorative animated field: pointer-events-none, aria-hidden — the
          form stays fully interactive above it at all times. */}
      <CmsLoginBackground />
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
        <div className="mb-5 w-full max-w-md">
          <Link
            to="/"
            className="group inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs opacity-80 outline-none transition-colors cc-hairline hover:border-[var(--cc-accent)] hover:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
            style={{ background: "color-mix(in oklch, var(--cc-panel) 70%, transparent)" }}
            aria-label="Back to HawkBucks website"
          >
            <span
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none"
            >
              ←
            </span>
            Back to website
          </Link>
        </div>
        <div className="w-full max-w-md">
          <div className="cc-panel-elevated px-6 py-8 sm:px-8" style={{ borderRadius: "1rem" }}>
            <div className="flex flex-col items-center text-center">
              <img
                src={ASSETS.logo}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="h-14 w-14 rounded-2xl"
              />
              <p className="cc-eyebrow mt-4">Restricted · {BRAND_NAME} Control Center</p>
              <h1 className="mt-2 font-display text-2xl font-bold">Admin sign-in</h1>
            </div>
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label htmlFor="cc-username" className="block text-sm font-medium">
                  Username
                </label>
                <input
                  id="cc-username"
                  className="cc-input mt-1.5"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                />
              </div>
              <div>
                <label htmlFor="cc-password" className="block text-sm font-medium">
                  Password
                </label>
                <input
                  id="cc-password"
                  className="cc-input mt-1.5"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <CmsTurnstile siteKey={loaderData.siteKey ?? null} onToken={setTurnstileToken} />
              {error ? (
                <p className="text-sm text-[var(--cc-danger)]" role="alert">
                  {error}
                </p>
              ) : null}
              <button type="submit" disabled={pending} className="cc-btn cc-btn-primary w-full">
                {pending ? "Signing in…" : "Sign in to Control Center"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </CmsBarePage>
  );
}

function Dashboard(props: {
  user: { displayName: string; username: string; role: string };
  counts: {
    heroes: { total: number; published: number; draft: number; archived: number };
    loadouts: { total: number; published: number; draft: number; archived: number };
    weapons: { total: number; published: number; draft: number; archived: number };
    traps: { total: number; published: number; draft: number; archived: number };
    perks: { total: number; published: number; draft: number; archived: number };
    schematics: { total: number; published: number; draft: number; archived: number };
    articles: { total: number; published: number; draft: number; archived: number };
    media: { total: number };
  } | null;
  recent: Array<{
    contentId: string;
    entityType: string;
    status: string;
    title: string | null;
    updatedAt: string;
  }>;
  activity: Array<{
    id: string;
    actorUsername: string | null;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
  }>;
  security: {
    windowDays: number;
    successfulLogins: number;
    failedLogins: number;
    contentChanges: number;
    mediaOperations: number;
    hasAuthHistory: boolean;
  } | null;
}) {
  const c = props.counts;
  const draftTotal =
    (c?.heroes.draft ?? 0) +
    (c?.loadouts.draft ?? 0) +
    (c?.weapons.draft ?? 0) +
    (c?.traps.draft ?? 0) +
    (c?.perks.draft ?? 0) +
    (c?.schematics.draft ?? 0) +
    (c?.articles.draft ?? 0);
  const publishedTotal =
    (c?.heroes.published ?? 0) +
    (c?.loadouts.published ?? 0) +
    (c?.weapons.published ?? 0) +
    (c?.traps.published ?? 0) +
    (c?.perks.published ?? 0) +
    (c?.schematics.published ?? 0) +
    (c?.articles.published ?? 0);
  const drafts = props.recent.filter((r) => r.status === "draft").slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Wave 1: single logout lives in the shell topbar ("Log out").
          No content-level duplicate here. */}
      <CmsPageHeader
        eyebrow="Overview"
        title={`Welcome, ${props.user.displayName}`}
        description="The live state of HawkBucks content — every number below is real D1 data. Only published content is publicly visible."
      />

      {!c ? (
        <CmsNotice kind="warning">
          Content counts are unavailable right now (the CMS database did not answer). Recent content
          and activity below still load independently.
        </CmsNotice>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <CmsStatCard
          label="Heroes"
          value={c?.heroes.total ?? "—"}
          hint={c ? `${c.heroes.published} published · ${c.heroes.draft} draft` : undefined}
          to="/admin/heroes"
        />
        <CmsStatCard
          label="Loadouts"
          value={c?.loadouts.total ?? "—"}
          hint={c ? `${c.loadouts.published} published · ${c.loadouts.draft} draft` : undefined}
          to="/admin/loadouts"
        />
        <CmsStatCard
          label="Inventory"
          value={
            (c?.weapons.total ?? 0) +
            (c?.traps.total ?? 0) +
            (c?.perks.total ?? 0) +
            (c?.schematics.total ?? 0)
          }
          hint="Weapons · traps · perks · schematics"
          to="/admin/inventory"
        />
        <CmsStatCard
          label="Articles"
          value={c?.articles.total ?? "—"}
          hint={c ? `${c.articles.published} published · ${c.articles.draft} draft` : undefined}
          to="/admin/articles"
        />
        <CmsStatCard
          label="Published"
          value={publishedTotal}
          hint="Live on the public site"
          tone="accent"
          to="/admin/publishing"
        />
        <CmsStatCard
          label="Drafts"
          value={draftTotal}
          hint="Hidden until published"
          tone={draftTotal > 0 ? "warning" : "default"}
          to="/admin/publishing"
        />
        <CmsStatCard
          label="Media assets"
          value={c?.media.total ?? "—"}
          hint="R2-backed library"
          to="/admin/media"
        />
        <CmsStatCard label="Signed in as" value={props.user.role} hint={props.user.username} />
      </div>

      {/* Wave 2 — security snapshot: real 7-day counts, honestly gated. */}
      {props.security ? (
        <CmsCard
          title="Security · last 7 days"
          action={
            <Link to="/admin/activity" className="cc-link text-xs">
              Open Activity & Security
            </Link>
          }
        >
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="flex items-baseline justify-between gap-2 border-b py-1.5 cc-hairline">
              <dt className="opacity-70">Successful logins</dt>
              <dd className="font-semibold tabular-nums text-[var(--cc-accent)]">
                {props.security.successfulLogins}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-2 border-b py-1.5 cc-hairline">
              <dt className="opacity-70">Failed logins</dt>
              <dd
                className={`font-semibold tabular-nums ${props.security.failedLogins > 0 ? "text-[var(--cc-danger)]" : ""}`}
              >
                {props.security.failedLogins}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-2 border-b py-1.5 cc-hairline">
              <dt className="opacity-70">Content changes</dt>
              <dd className="font-semibold tabular-nums">{props.security.contentChanges}</dd>
            </div>
          </dl>
          {!props.security.hasAuthHistory ? (
            <p className="mt-2 text-[11px] leading-relaxed opacity-60">
              Per-attempt login telemetry starts with this release — earlier sign-ins predate it and
              are not backfilled.
            </p>
          ) : null}
        </CmsCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <CmsCard
          title="Needs attention"
          action={
            <Link to="/admin/publishing" className="cc-link text-xs">
              Open publishing
            </Link>
          }
        >
          {drafts.length === 0 ? (
            <CmsEmpty
              title="Nothing waiting"
              description="No draft content in the most recent rows. Drafts appear here as soon as they are created."
            />
          ) : (
            <ul className="divide-y divide-white/5">
              {drafts.map((r) => (
                <li key={r.contentId} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.title ?? r.contentId}</p>
                    <p className="mt-0.5 font-mono text-[11px] opacity-60">
                      {r.entityType} · updated {relativeTime(r.updatedAt)}
                    </p>
                  </div>
                  <CmsLifecycleBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </CmsCard>

        <CmsCard
          title="Recent content"
          action={
            <Link to="/admin/publishing" className="cc-link text-xs">
              View all
            </Link>
          }
        >
          {props.recent.length === 0 ? (
            <CmsEmpty
              title="No content yet"
              description="Create the first hero, loadout, inventory item, or article to see it here."
            />
          ) : (
            <ul className="divide-y divide-white/5">
              {props.recent.slice(0, 6).map((r) => (
                <li key={r.contentId} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.title ?? r.contentId}</p>
                    <p className="mt-0.5 font-mono text-[11px] opacity-60">
                      {r.entityType} · {relativeTime(r.updatedAt)}
                    </p>
                  </div>
                  <CmsLifecycleBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </CmsCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CmsCard
          title="Recent activity"
          action={
            <Link to="/admin/activity" className="cc-link text-xs">
              Full audit trail
            </Link>
          }
        >
          {props.activity.length === 0 ? (
            <CmsEmpty
              title="No recent audit events"
              description="Activity appears here once privileged operations are recorded. Requires the admin role to view."
            />
          ) : (
            <ul className="divide-y divide-white/5">
              {props.activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">
                      {a.action} <span className="opacity-60">· {a.entityType}</span>
                    </p>
                    <p className="mt-0.5 text-xs opacity-60">
                      {a.actorUsername ?? "unknown actor"} · {relativeTime(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CmsCard>

        <CmsCard title="Quick actions">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Link to="/admin/heroes" className="cc-btn cc-btn-outline cc-btn-sm cc-quick-action">
              <span aria-hidden="true" className="cc-quick-action-icon">
                <Users className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-start">New hero</span>
              <span aria-hidden="true" className="cc-quick-action-icon opacity-70">
                <ArrowRight className="h-3.5 w-3.5 rtl:scale-x-[-1]" />
              </span>
            </Link>
            <Link to="/admin/loadouts" className="cc-btn cc-btn-outline cc-btn-sm cc-quick-action">
              <span aria-hidden="true" className="cc-quick-action-icon">
                <Swords className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-start">New loadout</span>
              <span aria-hidden="true" className="cc-quick-action-icon opacity-70">
                <ArrowRight className="h-3.5 w-3.5 rtl:scale-x-[-1]" />
              </span>
            </Link>
            <Link to="/admin/inventory" className="cc-btn cc-btn-outline cc-btn-sm cc-quick-action">
              <span aria-hidden="true" className="cc-quick-action-icon">
                <Package className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-start">New inventory item</span>
              <span aria-hidden="true" className="cc-quick-action-icon opacity-70">
                <ArrowRight className="h-3.5 w-3.5 rtl:scale-x-[-1]" />
              </span>
            </Link>
            <Link to="/admin/articles" className="cc-btn cc-btn-outline cc-btn-sm cc-quick-action">
              <span aria-hidden="true" className="cc-quick-action-icon">
                <FileText className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-start">New article</span>
              <span aria-hidden="true" className="cc-quick-action-icon opacity-70">
                <ArrowRight className="h-3.5 w-3.5 rtl:scale-x-[-1]" />
              </span>
            </Link>
            <Link to="/admin/media" className="cc-btn cc-btn-outline cc-btn-sm cc-quick-action">
              <span aria-hidden="true" className="cc-quick-action-icon">
                <Upload className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-start">Upload media</span>
              <span aria-hidden="true" className="cc-quick-action-icon opacity-70">
                <ArrowRight className="h-3.5 w-3.5 rtl:scale-x-[-1]" />
              </span>
            </Link>
            <Link
              to="/admin/publishing"
              className="cc-btn cc-btn-outline cc-btn-sm cc-quick-action"
            >
              <span aria-hidden="true" className="cc-quick-action-icon">
                <ArrowRight className="h-4 w-4 rtl:scale-x-[-1]" />
              </span>
              <span className="min-w-0 flex-1 truncate text-start">Review publishing</span>
            </Link>
          </div>
          <p className="mt-4 text-xs leading-relaxed opacity-60">
            Creation happens on each section page; publishing review shows every draft, published,
            and archived row across all entity types.
          </p>
        </CmsCard>

        {/* Notification hotfix — diagnostic test push. Card is admin-only
            by convention (like Activity); the server function re-checks
            cms.admin server-side regardless. */}
        {props.user.role === "admin" ? <NotificationTestCard /> : null}
      </div>
    </div>
  );
}

/**
 * Diagnostic test push (notification hotfix). Sends the fixed
 * generic test payload to THIS device's registered push
 * subscription through the real VAPID + RFC 8291 path — the
 * exact delivery path the scheduled WebBox notification uses —
 * without claiming or modifying the once-per-UTC-day slot.
 * Purpose: distinguish a push-infrastructure problem (test push
 * fails) from a scheduler/mission-detection problem (test push
 * succeeds but the daily WebBox notification does not arrive).
 */
function NotificationTestCard() {
  const reminders = useReminderNotifications();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AdminTestPushResult | null>(null);
  const subscribed = reminders.state === "on" && reminders.endpoint !== null;

  async function handleTestPush() {
    if (pending || !reminders.endpoint) return;
    setPending(true);
    setResult(null);
    try {
      const outcome = await sendTestPush({ data: { endpoint: reminders.endpoint } });
      setResult(outcome);
    } catch (error) {
      // Server-function rejections (401/403 from the CMS admin gate,
      // transport failures) surface as thrown errors. Messages are
      // generic and secret-free by design.
      setResult({
        success: false,
        delivered: false,
        status: 0,
        message: error instanceof Error ? error.message : "Test push failed.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <CmsCard title="Notification delivery test">
      <p className="mb-3 text-sm leading-relaxed opacity-80">
        Sends a fixed test notification to this device&apos;s registered push subscription through
        the same VAPID delivery path as the daily WebBox notification. It never counts toward or
        modifies the once-per-day notification.
      </p>
      <div className="mb-3 flex items-center justify-between gap-2 border-b py-1.5 cc-hairline">
        <dt className="text-sm opacity-70">This device&apos;s subscription</dt>
        <dd className="text-sm font-semibold tabular-nums">
          {reminders.state === "loading"
            ? "Checking…"
            : subscribed
              ? "Registered"
              : "Not registered"}
        </dd>
      </div>
      {!subscribed && reminders.state !== "loading" ? (
        <p className="mb-3 text-xs leading-relaxed opacity-70">
          Enable notifications on this device first (sidebar bell icon), then send the test push.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          void handleTestPush();
        }}
        disabled={pending || !subscribed}
        className="cc-btn cc-btn-primary cc-btn-sm"
      >
        <BellRing aria-hidden="true" className="h-4 w-4" />
        {pending ? "Sending…" : "Send test push"}
      </button>
      {result ? (
        result.delivered ? (
          <CmsNotice kind="success">
            Test push delivered (HTTP {result.status}). The device should show a notification titled
            &quot;HawkBucks&quot;.
          </CmsNotice>
        ) : (
          <CmsNotice kind="error">
            Test push failed (HTTP {result.status}).
            {result.message ? ` ${result.message}` : ""} If this device&apos;s subscription is
            registered but delivery fails, the cause is push configuration (VAPID) or the browser
            push service — not the WebBox scheduler.
          </CmsNotice>
        )
      ) : null}
    </CmsCard>
  );
}
