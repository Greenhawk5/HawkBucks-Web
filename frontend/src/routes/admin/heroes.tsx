import { useCallback, useState } from "react";
import { createFileRoute, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  createAdminHero,
  listAdminHeroes,
  publishAdminContent,
  type HeroAdminItem,
} from "@/lib/cms/heroes-admin.loader";
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

export const Route = createFileRoute("/admin/heroes")({
  validateSearch: cmsEntitySearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const session = await getAdminSession();
    if (!session.authenticated) {
      return { session, page: null, deletable: {} as CmsDeletabilityMap };
    }
    const result = await listAdminHeroes({ data: deps });

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
    meta: [{ title: "Heroes — Control Center" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  pendingComponent: () => <CmsRoutePending title="Heroes" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Heroes" backTo="/admin" error={error} />
  ),
  component: HeroesAdmin,
});

const HERO_CLASSES = ["soldier", "constructor", "ninja", "outlander"] as const;

function HeroesAdmin() {
  const { session, page, deletable } = Route.useLoaderData();
  const hasChild = useChildMatches({ select: (m) => m.length > 0 });
  const navigate = useNavigate({ from: "/admin/heroes" });
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const search = Route.useSearch();

  // All hooks stay above the auth early-return so hook order is stable.
  // Route-owned navigation (the shared list body cannot name this route's
  // literal id type, so it does not call `useNavigate` itself).
  const setParams = useCallback(
    (
      next: { page?: number; pageSize?: number; q?: string; status?: string; heroClass?: string },
      options?: { replace?: boolean },
    ) => {
      void navigate({
        search: (prev) => ({
          ...prev,
          ...next,
          // Any filter change must return to page 1, or the editor lands on a
          // page that no longer exists under the new filter.
          page: next.page ?? 1,
        }),
        ...(options?.replace === true ? { replace: true } : {}),
      });
    },
    [navigate],
  );
  const refresh = useCallback(async () => {
    await navigate({ search: (prev) => ({ ...prev }) });
  }, [navigate]);

  if (!session.authenticated || !session.user) return <CmsSignInRequired title="Heroes" />;
  const canWrite = session.user.role === "editor" || session.user.role === "admin";
  const canPublish = session.user.role === "admin";

  return (
    <CmsShell active="heroes" sessionUser={session.user} expiresAt={session.expiresAt}>
      {hasChild || page === null ? null : (
        <CmsEntityList<HeroAdminItem>
          entityType="hero"
          noun="heroes"
          singular="Hero"
          selectedNoun="heroes"
          page={page}
          deletable={deletable}
          canWrite={canWrite}
          canPublish={canPublish}
          search={search}
          setParams={setParams}
          refresh={refresh}
          rowTo={(row) => `/admin/heroes/${row.contentId}`}
          header={{
            eyebrow: "Content · Heroes",
            title: "Heroes",
            description:
              "Playable heroes: class, category, abilities, translations, lifecycle. Only published heroes appear publicly.",
          }}
          newButtonLabel="+ New hero"
          onNew={() => setCreateOpen(true)}
          importDialog={
            <CmsImportDialog
              open={importOpen}
              kind="hero"
              canWrite={canWrite}
              onClose={() => setImportOpen(false)}
              onImported={() => void navigate({ search: (prev) => ({ ...prev }) })}
            />
          }
          emptyForNew="No heroes yet"
          searchExtras={({ search: s, setParams }) => (
            <>
              <label className="flex items-center gap-2 text-sm" htmlFor="heroes-class-filter">
                <span className="text-xs opacity-70">Class</span>
                <CmsSelect
                  id="heroes-class-filter"
                  value={s.heroClass ?? ""}
                  onChange={(value) => setParams({ heroClass: value })}
                  options={[
                    { value: "", label: "All classes" },
                    ...HERO_CLASSES.map((c) => ({ value: c, label: c })),
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
              header: "Hero",
              render: (r) => <span className="font-medium">{r.title ?? r.contentId}</span>,
            },
            {
              key: "class",
              header: "Class",
              label: "Class",
              render: (r) => <span className="font-mono text-xs">{r.heroClass}</span>,
            },
            {
              key: "category",
              header: "Category",
              label: "Category",
              render: (r) => r.category ?? "—",
            },
          ]}
          onTransition={(contentId, to) =>
            publishAdminContent({ data: { contentId, to } }).then(() => undefined)
          }
        />
      )}
      <Outlet />

      <CreateHeroDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) =>
          createAdminHero({ data: input })
            .then(() => undefined)
            .then(() => {
              void navigate({ search: (prev) => ({ ...prev }) });
            })
        }
      />
    </CmsShell>
  );
}

function CreateHeroDialog(props: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { heroClass: string; title: string; body?: string }) => Promise<void>;
}) {
  const [heroClass, setHeroClass] = useState("soldier");
  const [title, setTitle] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <CmsDialog open={props.open} onClose={props.onClose} title="New hero draft">
      <div className="space-y-4">
        <CmsField
          label="Class"
          description="Fixed hero class. Cannot be changed to another game role later."
        >
          <CmsSelect
            id="new-hero-class"
            value={heroClass}
            onChange={setHeroClass}
            width="full"
            options={HERO_CLASSES.map((c) => ({ value: c, label: c }))}
          />
        </CmsField>
        <CmsField label="Title" description="Working title for the default (English) translation.">
          <input
            className="cc-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hero name"
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
                .onCreate({ heroClass, title: title.trim() })
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
