import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import { listPublishBoard } from "@/lib/cms/overview-admin.loader";
import { CmsShell } from "@/components/cms/cc/CmsShell";
import {
  CmsRouteErrorStandalone,
  CmsRoutePending,
  CmsSignInRequired,
} from "@/components/cms/cc/CmsAuth";
import {
  CmsDataTable,
  CmsLifecycleBadge,
  CmsPageHeader,
  CmsSectionTitle,
  CmsStatusTabs,
  relativeTime,
} from "@/components/cms/cc/CmsPrimitives";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";

type BoardItem = Awaited<ReturnType<typeof listPublishBoard>>["items"][number];

const ENTITY_LINKS: Record<string, (contentId: string) => string> = {
  hero: (id) => `/admin/heroes/${id}`,
  loadout: (id) => `/admin/loadouts/${id}`,
  weapon: (id) => `/admin/inventory/${id}`,
  trap: (id) => `/admin/inventory/${id}`,
  perk: (id) => `/admin/inventory/${id}`,
  schematic: (id) => `/admin/inventory/${id}`,
  article: (id) => `/admin/articles/${id}`,
};

export const Route = createFileRoute("/admin/publishing")({
  loader: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, items: [] as BoardItem[] };
    const { items } = await listPublishBoard({ data: {} });
    return { session, items };
  },
  head: () => ({
    meta: [
      { title: "Publishing — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Publishing" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Publishing" backTo="/admin" error={error} />
  ),
  component: PublishingAdmin,
});

function PublishingAdmin() {
  const { session, items } = Route.useLoaderData();
  if (!session.authenticated || !session.user) return <CmsSignInRequired title="Publishing" />;
  return (
    <CmsShell active="publishing" sessionUser={session.user} expiresAt={session.expiresAt}>
      <PublishingBody items={items} />
    </CmsShell>
  );
}

function PublishingBody(props: { items: BoardItem[] }) {
  const [status, setStatus] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const entities = [...new Set(props.items.map((i) => i.entityType))].sort();
  const visible = props.items.filter(
    (i) =>
      (status === "" || i.status === status) &&
      (entityFilter === "" || i.entityType === entityFilter),
  );
  const drafts = props.items.filter((i) => i.status === "draft").length;
  const published = props.items.filter((i) => i.status === "published").length;
  const archived = props.items.filter((i) => i.status === "archived").length;

  return (
    <div className="space-y-5">
      <CmsPageHeader
        eyebrow="Operations · Publishing"
        title="Publishing"
        description="Every CMS row and its real lifecycle state. Only published content is publicly visible. Publishing is per-row from each editor — this board never fabricates a deployment pipeline."
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

      <div className="grid grid-cols-3 gap-3">
        <div className="cc-panel px-4 py-3">
          <p className="cc-eyebrow">Published (live)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--cc-accent)]">
            {published}
          </p>
        </div>
        <div className="cc-panel px-4 py-3">
          <p className="cc-eyebrow">Drafts (hidden)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--cc-amber)]">
            {drafts}
          </p>
        </div>
        <div className="cc-panel px-4 py-3">
          <p className="cc-eyebrow">Archived (retired)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{archived}</p>
        </div>
      </div>

      <div>
        <CmsSectionTitle>Lifecycle rules</CmsSectionTitle>
        <p className="mt-1 text-sm leading-relaxed opacity-70">
          Draft → published or archived. Published → draft or archived. Archived → draft only — a
          retired row can never jump straight back to the public site without review.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm" htmlFor="publishing-entity-filter">
            <span className="text-xs opacity-70">Entity</span>
            <CmsSelect
              id="publishing-entity-filter"
              value={entityFilter}
              onChange={setEntityFilter}
              options={[
                { value: "", label: "All entities" },
                ...entities.map((e) => ({ value: e, label: e })),
              ]}
            />
          </label>
        </div>
        <CmsStatusTabs
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All", count: props.items.length },
            { value: "draft", label: "Draft", count: drafts },
            { value: "published", label: "Published", count: published },
            { value: "archived", label: "Archived", count: archived },
          ]}
        />
        <p className="text-xs opacity-60" role="status">
          Showing {visible.length} of {props.items.length} (newest first, max 100).
        </p>
      </div>

      <CmsDataTable
        columns={[
          {
            key: "title",
            header: "Content",
            render: (r) => <span className="font-medium">{r.title ?? r.contentId}</span>,
          },
          {
            key: "entity",
            header: "Entity",
            label: "Entity",
            render: (r) => <span className="font-mono text-xs">{r.entityType}</span>,
          },
          {
            key: "status",
            header: "Status",
            label: "Status",
            render: (r) => <CmsLifecycleBadge status={r.status} />,
          },
          {
            key: "updated",
            header: "Updated",
            label: "Updated",
            render: (r) => <span title={r.updatedAt}>{relativeTime(r.updatedAt)}</span>,
          },
        ]}
        rows={visible}
        rowTo={(r) => ENTITY_LINKS[r.entityType]?.(r.contentId) ?? "/admin/publishing"}
        emptyTitle="No content rows"
        emptyDescription="Content appears here as soon as any entity draft is created."
      />
    </div>
  );
}
