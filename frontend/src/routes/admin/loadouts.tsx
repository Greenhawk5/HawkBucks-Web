import { useCallback, useState } from "react";
import { createFileRoute, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  createAdminLoadout,
  listAdminLoadouts,
  type LoadoutAdminItem,
} from "@/lib/cms/loadouts-admin.loader";
import { publishAdminContent } from "@/lib/cms/heroes-admin.loader";
import { getAdminDraftDeletabilityMany } from "@/lib/cms/bulk-admin.loader";
import { CmsShell } from "@/components/cms/cc/CmsShell";
import {
  CmsRouteErrorStandalone,
  CmsRoutePending,
  CmsSignInRequired,
} from "@/components/cms/cc/CmsAuth";
import { CmsDialog, CmsField } from "@/components/cms/cc/CmsPrimitives";
import {
  CmsEntityList,
  cmsEntitySearch,
  type CmsDeletabilityMap,
} from "@/components/cms/cc/CmsEntityList";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";
import { CmsImportDialog } from "@/components/cms/cc/CmsImportDialog";

/** Loadouts add a type filter on top of the shared search params. */
interface LoadoutsSearchParams {
  page?: number | undefined;
  pageSize?: number | undefined;
  q?: string | undefined;
  status?: string | undefined;
  loadoutType?: string | undefined;
}

function loadoutsSearch(raw: Record<string, unknown>): LoadoutsSearchParams {
  const base = cmsEntitySearch(raw);
  const loadoutType = typeof raw["loadoutType"] === "string" ? raw["loadoutType"] : "";
  return { ...base, loadoutType };
}

export const Route = createFileRoute("/admin/loadouts")({
  validateSearch: loadoutsSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const session = await getAdminSession();
    if (!session.authenticated) {
      return { session, page: null, deletable: {} as CmsDeletabilityMap };
    }
    const result = await listAdminLoadouts({ data: deps });

    // One batched deletability probe for the visible rows: identical verdicts
    // to the single probe, without N round trips. Advisory only — the server
    // re-assesses at execution time.
    let deletable: CmsDeletabilityMap = {};
    try {
      const { eligibilities } = await getAdminDraftDeletabilityMany({
        data: { contentIds: result.items.map((row) => row.contentId) },
      });
      deletable = eligibilities;
    } catch {
      deletable = {};
    }

    return { session, page: result, deletable };
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
  const { session, page, deletable } = Route.useLoaderData();
  const hasChild = useChildMatches({ select: (m) => m.length > 0 });
  const navigate = useNavigate({ from: "/admin/loadouts" });
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const search = Route.useSearch();

  // All hooks stay above the auth early-return so hook order is stable.
  const setParams = useCallback(
    (
      next: { page?: number; pageSize?: number; q?: string; status?: string; heroClass?: string },
      options?: { replace?: boolean },
    ) => {
      void navigate({
        search: (prev) => ({ ...prev, ...next, page: next.page ?? 1 }),
        ...(options?.replace === true ? { replace: true } : {}),
      });
    },
    [navigate],
  );
  const refresh = useCallback(async () => {
    await navigate({ search: (prev) => ({ ...prev }) });
  }, [navigate]);

  if (!session.authenticated || !session.user) return <CmsSignInRequired title="Loadouts" />;
  const canWrite = session.user.role === "editor" || session.user.role === "admin";
  const canPublish = session.user.role === "admin";

  return (
    <CmsShell active="loadouts" sessionUser={session.user} expiresAt={session.expiresAt}>
      {hasChild || page === null ? null : (
        <CmsEntityList<LoadoutAdminItem>
          entityType="loadout"
          noun="loadouts"
          singular="Loadout"
          page={page}
          deletable={deletable}
          canWrite={canWrite}
          canPublish={canPublish}
          search={search}
          setParams={setParams}
          refresh={refresh}
          rowTo={(row) => `/admin/loadouts/${row.contentId}`}
          header={{
            eyebrow: "Content · Loadouts",
            title: "Loadouts",
            description:
              "Hero team loadouts: commander, support slots, and lifecycle. Only published loadouts appear publicly.",
          }}
          newButtonLabel="+ New loadout"
          onNew={() => setCreateOpen(true)}
          importDialog={
            <CmsImportDialog
              open={importOpen}
              kind="loadout"
              canWrite={canWrite}
              onClose={() => setImportOpen(false)}
              onImported={() => void refresh()}
            />
          }
          emptyForNew="No loadouts yet"
          searchExtras={({ search: s, setParams }) => (
            <>
              <label className="flex items-center gap-2 text-sm" htmlFor="loadouts-type-filter">
                <span className="text-xs opacity-70">Type</span>
                <CmsSelect
                  id="loadouts-type-filter"
                  value={s.loadoutType ?? ""}
                  onChange={(value) => setParams({ loadoutType: value })}
                  options={[
                    { value: "", label: "All types" },
                    ...LOADOUT_TYPES.map((t) => ({ value: t, label: t })),
                  ]}
                />
              </label>
              <button
                type="button"
                className="cc-btn cc-btn-outline cc-btn-sm"
                onClick={() => setImportOpen(true)}
              >
                Import JSON
              </button>
            </>
          )}
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
          ]}
          onTransition={(contentId, to) =>
            publishAdminContent({ data: { contentId, to } }).then(() => undefined)
          }
        />
      )}
      <Outlet />

      <CreateLoadoutDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) =>
          createAdminLoadout({ data: input })
            .then(() => undefined)
            .then(() => {
              void refresh();
            })
        }
      />
    </CmsShell>
  );
}

function CreateLoadoutDialog(props: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { loadoutType: string; title: string }) => Promise<void>;
}) {
  const [loadoutType, setLoadoutType] = useState("custom");
  const [title, setTitle] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
            disabled={busy}
            onClick={() => {
              if (title.trim() === "") {
                setLocalError("Title is required.");
                return;
              }
              setLocalError(null);
              setBusy(true);
              void props
                .onCreate({ loadoutType, title: title.trim() })
                .catch((e) => setLocalError(e instanceof Error ? e.message : "Create failed."))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Creating…" : "Create draft"}
          </button>
        </div>
        <p className="text-xs opacity-60">
          Creates a hidden draft — publishing is a separate step.
        </p>
      </div>
    </CmsDialog>
  );
}
