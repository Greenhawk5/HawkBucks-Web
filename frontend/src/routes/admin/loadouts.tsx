import { useState } from "react";
import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  createAdminLoadout,
  listAdminLoadouts,
  type LoadoutAdminItem,
} from "@/lib/cms/loadouts-admin.loader";
import { publishAdminContent } from "@/lib/cms/heroes-admin.loader";
import { CmsShell } from "@/components/cms/cc/CmsShell";
import {
  CmsRouteErrorStandalone,
  CmsRoutePending,
  CmsSignInRequired,
} from "@/components/cms/cc/CmsAuth";
import {
  CmsActionMenu,
  CmsConfirmDialog,
  CmsDataTable,
  CmsDialog,
  CmsField,
  CmsLifecycleBadge,
  CmsNotice,
  CmsPageHeader,
  CmsStatusTabs,
  cmsToast,
  relativeTime,
} from "@/components/cms/cc/CmsPrimitives";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";
import { CmsImportDialog } from "@/components/cms/cc/CmsImportDialog";

export const Route = createFileRoute("/admin/loadouts")({
  loader: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, items: [] as LoadoutAdminItem[] };
    const { items } = await listAdminLoadouts({ data: {} });
    return { session, items };
  },
  head: () => ({
    meta: [
      { title: "Loadouts — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Loadouts" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Loadouts" backTo="/admin" error={error} />
  ),
  component: LoadoutsAdmin,
});

const LOADOUT_TYPES = ["beginner", "meta", "farming", "boss", "fun", "custom"] as const;

function LoadoutsAdmin() {
  const { session, items } = Route.useLoaderData();
  // List body hides while the $contentId child editor is active (same
  // pattern as articles) — the editor then owns the shell's content area.
  // Declared before the early return — hook order must stay stable.
  const hasChild = useChildMatches({ select: (m) => m.length > 0 });
  if (!session.authenticated || !session.user) return <CmsSignInRequired title="Loadouts" />;
  return (
    <CmsShell active="loadouts" sessionUser={session.user} expiresAt={session.expiresAt}>
      {hasChild ? null : (
        <LoadoutsBody
          items={items}
          canWrite={session.user.role === "editor" || session.user.role === "admin"}
        />
      )}
      {/* Child editor route renders here - without this Outlet the editor match never paints. */}
      <Outlet />
    </CmsShell>
  );
}

function LoadoutsBody(props: { items: LoadoutAdminItem[]; canWrite: boolean }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<{
    contentId: string;
    title: string;
    to: "published" | "draft" | "archived";
  } | null>(null);

  const q = search.trim().toLowerCase();
  const visible = props.items.filter(
    (i) =>
      (status === "" || i.status === status) &&
      (typeFilter === "" || i.loadoutType === typeFilter) &&
      (q === "" ||
        (i.title ?? "").toLowerCase().includes(q) ||
        i.contentId.toLowerCase().includes(q)),
  );

  async function mutate(action: () => Promise<unknown>, okMessage: string) {
    setPending(true);
    setError(null);
    try {
      await action();
      cmsToast("success", okMessage);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setPending(false);
      setConfirm(null);
    }
  }

  return (
    <div className="space-y-5">
      <CmsPageHeader
        eyebrow="Content · Loadouts"
        title="Loadouts"
        description="Team rosters: one commander plus up to five support heroes. Only published loadouts appear publicly."
        action={
          props.canWrite ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="cc-btn cc-btn-primary cc-btn-sm"
                onClick={() => setCreateOpen(true)}
              >
                + New loadout
              </button>
              <button
                type="button"
                className="cc-btn cc-btn-outline cc-btn-sm"
                onClick={() => setImportOpen(true)}
              >
                Import JSON
              </button>
            </div>
          ) : undefined
        }
      />
      {error ? <CmsNotice kind="error">{error}</CmsNotice> : null}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-52 flex-1 sm:max-w-xs">
            <span className="sr-only">Search loadouts</span>
            <input
              className="cc-input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search loadouts…"
            />
          </label>
          <label className="flex items-center gap-2 text-sm" htmlFor="loadouts-type-filter">
            <span className="text-xs opacity-70">Type</span>
            <CmsSelect
              id="loadouts-type-filter"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "", label: "All types" },
                ...LOADOUT_TYPES.map((t) => ({ value: t, label: t })),
              ]}
            />
          </label>
          <button
            type="button"
            className="cc-btn cc-btn-ghost cc-btn-sm"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
        <CmsStatusTabs
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All", count: props.items.length },
            {
              value: "published",
              label: "Published",
              count: props.items.filter((i) => i.status === "published").length,
            },
            {
              value: "draft",
              label: "Draft",
              count: props.items.filter((i) => i.status === "draft").length,
            },
            {
              value: "archived",
              label: "Archived",
              count: props.items.filter((i) => i.status === "archived").length,
            },
          ]}
        />
        <p className="text-xs opacity-60" role="status">
          Showing {visible.length} of {props.items.length}. Drafts never appear publicly.
        </p>
      </div>

      <CmsDataTable
        columns={[
          {
            key: "title",
            header: "Loadout",
            render: (r) => <span className="font-medium">{r.title ?? r.contentId}</span>,
          },
          {
            key: "type",
            header: "Type",
            label: "Type",
            render: (r) => <span className="font-mono text-xs">{r.loadoutType}</span>,
          },
          {
            key: "heroes",
            header: "Heroes",
            label: "Heroes",
            render: (r) => <span className="tabular-nums">{r.heroCount}</span>,
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
          {
            key: "actions",
            header: "Actions",
            label: "Actions",
            render: (r) => (
              <CmsActionMenu
                items={[
                  {
                    label: "Publish",
                    onSelect: () =>
                      setConfirm({
                        contentId: r.contentId,
                        title: r.title ?? r.contentId,
                        to: "published",
                      }),
                  },
                  {
                    label: "Move to draft",
                    onSelect: () =>
                      setConfirm({
                        contentId: r.contentId,
                        title: r.title ?? r.contentId,
                        to: "draft",
                      }),
                  },
                  {
                    label: "Archive",
                    danger: true,
                    onSelect: () =>
                      setConfirm({
                        contentId: r.contentId,
                        title: r.title ?? r.contentId,
                        to: "archived",
                      }),
                  },
                ]}
              />
            ),
          },
        ]}
        rows={visible}
        rowTo={(r) => `/admin/loadouts/${r.contentId}`}
        emptyTitle={props.items.length === 0 ? "No loadouts yet" : "No matches"}
        emptyDescription={
          props.items.length === 0
            ? "Create the first loadout draft. Assign the commander and supports in the editor."
            : "Try clearing the search or choosing a different filter."
        }
      />

      <CreateLoadoutDialog
        open={createOpen}
        pending={pending}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) =>
          mutate(
            () => createAdminLoadout({ data: input }).then(() => undefined),
            "Loadout draft created.",
          )
        }
      />
      <CmsImportDialog
        open={importOpen}
        kind="loadout"
        canWrite={props.canWrite}
        onClose={() => setImportOpen(false)}
        onImported={() => window.location.reload()}
      />
      <CmsConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          confirm &&
          mutate(
            () => publishAdminContent({ data: { contentId: confirm.contentId, to: confirm.to } }),
            "Loadout status updated.",
          )
        }
        pending={pending}
        title={confirm ? `Confirm: ${confirm.to} “${confirm.title}”` : "Confirm"}
        body={
          confirm?.to === "published"
            ? "Publishing makes this loadout publicly visible. Continue?"
            : confirm?.to === "archived"
              ? "Archiving retires this loadout from the public site (never hard-deleted). Continue?"
              : "Moving back to draft hides this loadout from the public site. Continue?"
        }
        confirmLabel={
          confirm?.to === "published"
            ? "Publish"
            : confirm?.to === "archived"
              ? "Archive"
              : "Move to draft"
        }
      />
    </div>
  );
}

function CreateLoadoutDialog(props: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onCreate: (input: { loadoutType: string; title: string }) => Promise<void>;
}) {
  const [loadoutType, setLoadoutType] = useState("custom");
  const [title, setTitle] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  return (
    <CmsDialog open={props.open} onClose={props.onClose} title="New loadout draft">
      <div className="space-y-4">
        <CmsField label="Title" description="Working title for the default (English) translation.">
          <input
            className="cc-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Loadout name"
          />
        </CmsField>
        <CmsField label="Type" description="Gameplay category for discovery and sorting.">
          <CmsSelect
            id="new-loadout-type"
            value={loadoutType}
            onChange={setLoadoutType}
            width="full"
            options={LOADOUT_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </CmsField>
        {localError ? (
          <p className="text-sm text-[var(--cc-danger)]" role="alert">
            {localError}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={props.onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-primary cc-btn-sm"
            disabled={props.pending}
            onClick={() => {
              if (title.trim() === "") {
                setLocalError("Title is required.");
                return;
              }
              setLocalError(null);
              void props.onCreate({ loadoutType, title: title.trim() });
            }}
          >
            {props.pending ? "Creating…" : "Create draft"}
          </button>
        </div>
        <p className="text-xs opacity-60">
          Creates a hidden draft — publishing is a separate step.
        </p>
      </div>
    </CmsDialog>
  );
}
