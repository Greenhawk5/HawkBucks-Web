import { useCallback, useState } from "react";
import { createFileRoute, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  createAdminPerk,
  createAdminSchematic,
  createAdminTrap,
  createAdminWeapon,
  listAdminPerks,
  listAdminSchematics,
  listAdminTraps,
  listAdminWeapons,
  publishAdminInventoryContent,
  type InventoryAdminItem,
} from "@/lib/cms/schematics-admin.loader";
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

type Kind = "weapon" | "trap" | "perk" | "schematic";

const KIND_LABELS: Record<Kind, { plural: string; singular: string }> = {
  weapon: { plural: "Weapons", singular: "Weapon" },
  trap: { plural: "Traps", singular: "Trap" },
  perk: { plural: "Perks", singular: "Perk" },
  schematic: { plural: "Schematics", singular: "Schematic" },
};

function isKind(value: unknown): value is Kind {
  return value === "weapon" || value === "trap" || value === "perk" || value === "schematic";
}

/**
 * The kind rides in the URL alongside the page and filters.
 *
 * Previously the route loaded ALL FOUR kinds in parallel and filtered in the
 * browser, so every inventory tab paid for every other tab's data. Each kind
 * now loads exactly its own page, with its own honest counts.
 */
interface InventorySearchParams {
  page?: number | undefined;
  pageSize?: number | undefined;
  q?: string | undefined;
  status?: string | undefined;
  kind?: Kind | undefined;
}

function inventorySearch(raw: Record<string, unknown>): InventorySearchParams {
  const base = cmsEntitySearch(raw);
  const kind = raw["kind"];
  return { ...base, kind: isKind(kind) ? kind : undefined };
}

export const Route = createFileRoute("/admin/inventory")({
  validateSearch: inventorySearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const session = await getAdminSession();
    if (!session.authenticated) {
      return {
        session,
        page: null,
        kind: "weapon" as Kind,
        deletable: {} as CmsDeletabilityMap,
      };
    }
    const kind = isKind(deps.kind) ? deps.kind : "weapon";
    const params = { page: deps.page, pageSize: deps.pageSize, q: deps.q, status: deps.status };
    const result =
      kind === "weapon"
        ? await listAdminWeapons({ data: params })
        : kind === "trap"
          ? await listAdminTraps({ data: params })
          : kind === "perk"
            ? await listAdminPerks({ data: params })
            : await listAdminSchematics({ data: params });

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

    return { session, page: result, kind, deletable };
  },
  head: () => ({
    meta: [
      { title: "Inventory — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Inventory" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Inventory" backTo="/admin" error={error} />
  ),
  component: InventoryAdmin,
});

function InventoryAdmin() {
  const { session, page, kind, deletable } = Route.useLoaderData();
  const hasChild = useChildMatches({ select: (m) => m.length > 0 });
  const navigate = useNavigate({ from: "/admin/inventory" });
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const search = Route.useSearch();

  // All hooks stay above the auth early-return so hook order is stable.
  const setParams = useCallback(
    (
      next: {
        page?: number;
        pageSize?: number;
        q?: string;
        status?: string;
        kind?: Kind;
        heroClass?: string;
        loadoutType?: string;
      },
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

  if (!session.authenticated || !session.user) return <CmsSignInRequired title="Inventory" />;
  const canWrite = session.user.role === "editor" || session.user.role === "admin";
  const canPublish = session.user.role === "admin";

  const labels = KIND_LABELS[kind];

  return (
    <CmsShell active="inventory" sessionUser={session.user} expiresAt={session.expiresAt}>
      {hasChild || page === null ? null : (
        <div className="space-y-5">
          <div
            className="flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="Inventory kind"
          >
            {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === kind}
                className={
                  k === kind ? "cc-btn cc-btn-primary cc-btn-sm" : "cc-btn cc-btn-ghost cc-btn-sm"
                }
                onClick={() => setParams({ kind: k })}
              >
                {KIND_LABELS[k].plural}
              </button>
            ))}
          </div>

          <CmsEntityList<InventoryAdminItem>
            entityType={kind}
            noun={labels.plural.toLowerCase()}
            singular={labels.singular}
            page={page}
            deletable={deletable}
            canWrite={canWrite}
            canPublish={canPublish}
            search={search}
            setParams={setParams}
            refresh={refresh}
            rowTo={(row) => `/admin/inventory/${row.contentId}`}
            header={{
              eyebrow: `Content · Inventory · ${labels.plural}`,
              title: labels.plural,
              description:
                kind === "perk"
                  ? "Perk definitions keyed by unique machine ids, with translations and media."
                  : kind === "schematic"
                    ? "Schematics attach to exactly one weapon or trap target."
                    : `${labels.plural}: stats, subtypes, translations, and lifecycle.`,
            }}
            newButtonLabel={`+ New ${labels.singular.toLowerCase()}`}
            onNew={() => setCreateOpen(true)}
            importDialog={
              <CmsImportDialog
                open={importOpen}
                kind={kind}
                canWrite={canWrite}
                onClose={() => setImportOpen(false)}
                onImported={() => void refresh()}
              />
            }
            emptyForNew={`No ${labels.plural.toLowerCase()} yet`}
            searchExtras={() => (
              <button
                type="button"
                className="cc-btn cc-btn-outline cc-btn-sm"
                onClick={() => setImportOpen(true)}
              >
                Import JSON
              </button>
            )}
            columns={[
              {
                key: "title",
                header: labels.singular,
                render: (r) => <span className="font-medium">{r.title ?? r.contentId}</span>,
              },
              {
                key: "subtype",
                header: "Subtype",
                label: "Subtype",
                render: (r) => <span className="font-mono text-xs">{r.subtype ?? "—"}</span>,
              },
            ]}
            onTransition={(contentId, to) =>
              publishAdminInventoryContent({ data: { contentId, to } }).then(() => undefined)
            }
            confirmCopy={{
              published: `Publishing makes this ${labels.singular.toLowerCase()} publicly visible. Continue?`,
              archived: `Archiving retires this ${labels.singular.toLowerCase()} from the public site (never hard-deleted). Continue?`,
              draft: `Moving back to draft hides this ${labels.singular.toLowerCase()} from the public site. Continue?`,
            }}
          />
        </div>
      )}
      <Outlet />

      <CreateInventoryDialog
        open={createOpen}
        initialKind={kind}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          if (input.kind === "weapon") {
            await createAdminWeapon({ data: { title: input.title } });
          } else if (input.kind === "trap") {
            await createAdminTrap({ data: { title: input.title } });
          } else if (input.kind === "perk") {
            await createAdminPerk({ data: { title: input.title, perkKey: input.perkKey } });
          } else {
            await createAdminSchematic({
              data: {
                title: input.title,
                ...(input.targetKind === "weapon"
                  ? { weaponContentId: input.targetId }
                  : { trapContentId: input.targetId }),
              },
            });
          }
          await refresh();
        }}
      />
    </CmsShell>
  );
}

function CreateInventoryDialog(props: {
  open: boolean;
  initialKind: Kind;
  onClose: () => void;
  onCreate: (input: {
    kind: Kind;
    title: string;
    perkKey: string;
    targetKind: "weapon" | "trap";
    targetId: string;
  }) => Promise<void>;
}) {
  const [kind, setKind] = useState<Kind>(props.initialKind);
  const [title, setTitle] = useState("");
  const [perkKey, setPerkKey] = useState("");
  const [targetKind, setTargetKind] = useState<"weapon" | "trap">("weapon");
  const [targetId, setTargetId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <CmsDialog open={props.open} onClose={props.onClose} title="New inventory draft">
      <div className="space-y-4">
        <CmsField
          label="Kind"
          description="Weapons, traps, and perks stand alone; schematics attach to one target."
        >
          <CmsSelect
            id="new-inventory-kind"
            value={kind}
            onChange={(v) => setKind(v as Kind)}
            width="full"
            options={[
              { value: "weapon", label: "Weapon" },
              { value: "trap", label: "Trap" },
              { value: "perk", label: "Perk" },
              { value: "schematic", label: "Schematic" },
            ]}
          />
        </CmsField>
        <CmsField label="Title" description="Working title for the default (English) translation.">
          <input
            className="cc-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Draft title"
          />
        </CmsField>
        {kind === "perk" ? (
          <CmsField label="Perk key" description="Unique machine id for this perk.">
            <input
              className="cc-input"
              value={perkKey}
              onChange={(e) => setPerkKey(e.target.value)}
              placeholder="unique-key"
            />
          </CmsField>
        ) : null}
        {kind === "schematic" ? (
          <>
            <CmsField
              label="Target kind"
              description="A schematic references exactly one weapon XOR one trap."
            >
              <CmsSelect
                id="new-inventory-target-kind"
                value={targetKind}
                onChange={(v) => setTargetKind(v as "weapon" | "trap")}
                width="full"
                options={[
                  { value: "weapon", label: "Weapon" },
                  { value: "trap", label: "Trap" },
                ]}
              />
            </CmsField>
            <CmsField
              label="Target content id"
              description="Content id of the existing weapon or trap."
            >
              <input
                className="cc-input font-mono"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="cms_…"
              />
            </CmsField>
          </>
        ) : null}
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
              if (kind === "perk" && perkKey.trim() === "") {
                setLocalError("Perk key is required (unique machine id).");
                return;
              }
              if (kind === "schematic" && targetId.trim() === "") {
                setLocalError("Schematic needs the target weapon or trap content id.");
                return;
              }
              setLocalError(null);
              setBusy(true);
              void props
                .onCreate({
                  kind,
                  title: title.trim(),
                  perkKey: perkKey.trim(),
                  targetKind,
                  targetId: targetId.trim(),
                })
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
