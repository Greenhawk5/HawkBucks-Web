import { createFileRoute } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import { getSettingsStatus, type SettingsStatus } from "@/lib/cms/settings-status.loader";
import { CmsShell } from "@/components/cms/cc/CmsShell";
import {
  CmsRouteErrorStandalone,
  CmsRoutePending,
  CmsSignInRequired,
} from "@/components/cms/cc/CmsAuth";
import {
  CmsCard,
  CmsNotice,
  CmsPageHeader,
  CmsSectionTitle,
  CmsStatusBadge,
} from "@/components/cms/cc/CmsPrimitives";

/** Roles are a fixed, client-safe contract (capabilities live server-side). */
const CMS_ROLES = ["viewer", "editor", "admin"] as const;

type LoaderData = {
  session: Awaited<ReturnType<typeof getAdminSession>>;
  status: SettingsStatus | null;
};

export const Route = createFileRoute("/admin/settings")({
  loader: async (): Promise<LoaderData> => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, status: null };
    const status = await getSettingsStatus({ data: {} }).catch(() => null);
    return { session, status };
  },
  head: () => ({
    meta: [
      { title: "Settings — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Settings" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Settings" backTo="/admin" error={error} />
  ),
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const { session, status } = Route.useLoaderData() as LoaderData;
  if (!session.authenticated || !session.user) return <CmsSignInRequired title="Settings" />;
  return (
    <CmsShell active="settings" sessionUser={session.user} expiresAt={session.expiresAt}>
      <div className="space-y-6">
        <CmsPageHeader
          eyebrow="Operations · Settings"
          title="Settings"
          description="Read-only posture facts about this Control Center — identity, capabilities, environment, and security status. Nothing editable lives here by design, so no production secret can ever enter a client bundle."
        />

        {/* General — who is signed in */}
        <section aria-label="General">
          <CmsSectionTitle>General</CmsSectionTitle>
          <p className="mt-1 text-sm opacity-70">CMS identity and current session.</p>
          <div className="mt-3">
            <CmsCard title="Session">
              <dl className="space-y-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2 border-b py-1.5 cc-hairline">
                  <dt className="opacity-70">User</dt>
                  <dd className="font-mono">
                    {session.user.displayName} ({session.user.username})
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2 border-b py-1.5 cc-hairline">
                  <dt className="opacity-70">Role</dt>
                  <dd className="font-mono">{session.user.role}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2 py-1.5">
                  <dt className="opacity-70">Valid until</dt>
                  <dd className="font-mono">{session.expiresAt ?? "—"}</dd>
                </div>
              </dl>
            </CmsCard>
          </div>
        </section>

        {/* Account & security */}
        <section aria-label="Account and security">
          <CmsSectionTitle>Account & security</CmsSectionTitle>
          <p className="mt-1 text-sm opacity-70">Authentication posture and capability contract.</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <CmsCard title="Bot protection (Turnstile)">
              <StatusRow
                label="Mode"
                value={
                  status == null ? (
                    "—"
                  ) : status.turnstile === "enforced" ? (
                    <CmsStatusBadge tone="ok">Enforced</CmsStatusBadge>
                  ) : status.turnstile === "half-configured" ? (
                    <CmsStatusBadge tone="warning">Half-configured · fails closed</CmsStatusBadge>
                  ) : (
                    <CmsStatusBadge tone="neutral">Off · local dev</CmsStatusBadge>
                  )
                }
              />
              <p className="mt-2 text-xs leading-relaxed opacity-60">
                Challenge runs before password verification; every rejection surfaces the generic
                invalid-credentials message. Keys are server-held and never displayed.
              </p>
            </CmsCard>
            <CmsCard title="Sessions">
              <StatusRow
                label="Absolute lifetime"
                value={`${status?.sessionAbsoluteHours ?? "—"} hours from login`}
              />
              <StatusRow
                label="Idle timeout"
                value={`${status?.sessionIdleMinutes ?? "—"} minutes without activity`}
              />
              <StatusRow
                label="Login telemetry"
                value={
                  status == null ? (
                    "—"
                  ) : status.telemetryAvailable ? (
                    <CmsStatusBadge tone="ok">Recording</CmsStatusBadge>
                  ) : (
                    <CmsStatusBadge tone="warning">Pending migration 0011</CmsStatusBadge>
                  )
                }
              />
              <p className="mt-2 text-xs leading-relaxed opacity-60">
                256-bit opaque tokens (SHA-256 hash in D1), HttpOnly SameSite=Lax Secure cookie,
                revocation-checked per request.
              </p>
            </CmsCard>
          </div>
          <div className="mt-4">
            <CmsSectionTitle>Capabilities by role</CmsSectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {CMS_ROLES.map((role) => (
                <div key={role} className="cc-panel px-4 py-3">
                  <p className="font-mono text-xs font-semibold uppercase tracking-wider">{role}</p>
                  <ul className="mt-2 space-y-1 font-mono text-xs opacity-75">
                    {(role === "admin"
                      ? ["cms.read", "cms.write", "cms.publish", "cms.admin"]
                      : role === "editor"
                        ? ["cms.read", "cms.write"]
                        : ["cms.read"]
                    ).map((cap) => (
                      <li key={cap}>· {cap}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content & media */}
        <section aria-label="Content and media">
          <CmsSectionTitle>Content & media</CmsSectionTitle>
          <p className="mt-1 text-sm opacity-70">Publishing defaults and storage status.</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <CmsCard title="Media storage (R2)">
              <StatusRow
                label="Bucket binding"
                value={
                  status == null ? (
                    "—"
                  ) : status.r2BucketBound ? (
                    <CmsStatusBadge tone="ok">Bound</CmsStatusBadge>
                  ) : (
                    <CmsStatusBadge tone="danger">Not bound · uploads fail closed</CmsStatusBadge>
                  )
                }
              />
              <StatusRow label="Public base URL" value={status?.r2BaseUrl ?? "—"} mono />
              <StatusRow label="Assets in library" value={String(status?.mediaTotal ?? "—")} />
              <p className="mt-2 text-xs leading-relaxed opacity-60">
                Browsers never write to R2 directly — uploads go through the Worker. Legacy ImageKit
                rows remain readable, never writable.
              </p>
            </CmsCard>
            <CmsCard title="Publishing rules">
              <ul className="space-y-2 text-sm leading-relaxed opacity-85">
                <li>Draft → published or archived. Published → draft or archived.</li>
                <li>Archived → draft only — retired rows never jump straight back to public.</li>
                <li>Only published rows are indexable or carry canonicals (server-enforced).</li>
                <li>Save stores edits; Publish controls visibility — separate operations.</li>
              </ul>
            </CmsCard>
          </div>
        </section>

        {/* System */}
        <section aria-label="System">
          <CmsSectionTitle>System</CmsSectionTitle>
          <p className="mt-1 text-sm opacity-70">Environment and deployment facts.</p>
          <div className="mt-3">
            <CmsCard title="Environment (verified, read-only)">
              <StatusRow label="CMS users" value={String(status?.userTotal ?? "—")} />
              <StatusRow
                label="Secrets in this UI"
                value={<CmsStatusBadge tone="ok">None — by design</CmsStatusBadge>}
              />
              <ul className="mt-2 space-y-2 text-sm leading-relaxed opacity-85">
                <li>Sessions are 256-bit opaque tokens; D1 stores only the SHA-256 hash.</li>
                <li>
                  Every mutation enforces role capabilities + same-origin checks server-side — UI
                  hiding enforces nothing.
                </li>
                <li>
                  Audit metadata is secret-redacted at write time; preview tokens are hash-only,
                  one-hour grants.
                </li>
                <li>
                  Upload validation (type, size, magic bytes) and media reference guards run on the
                  server.
                </li>
              </ul>
            </CmsCard>
          </div>
        </section>

        <CmsNotice kind="info">
          There are no editable settings: sessions, roles, and environment bindings are managed
          through server configuration and deployment, not through this browser UI — by design, so
          no production secret can ever enter a client bundle.
        </CmsNotice>
      </div>
    </CmsShell>
  );
}

function StatusRow(props: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b py-1.5 text-sm cc-hairline last:border-0">
      <dt className="opacity-70">{props.label}</dt>
      <dd className={props.mono ? "max-w-full break-all font-mono text-xs" : "text-sm"}>
        {props.value}
      </dd>
    </div>
  );
}
