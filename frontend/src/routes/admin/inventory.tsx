import { useState } from "react";
import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";

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
  CmsSectionTitle,
  CmsStatusTabs,
  cmsToast,
} from "@/components/cms/cc/CmsPrimitives";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";
import { CmsImportDialog } from "@/components/cms/cc/CmsImportDialog";

type Kind = "weapon" | "trap" | "perk" | "schematic";

export const Route = createFileRoute("/admin/inventory")({
  loader: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, groups: null };
    const [weapons, traps, perks, schematics] = await Promise.all([
      listAdminWeapons({ data: {} }),
      listAdminTraps({ data: {} }),
      listAdminPerks({ data: {} }),
      listAdminSchematics({ data: {} }),
    ]);
    return {
      session,
      groups: {
        weapons: weapons.items,
        traps: traps.items,
        perks: perks.items,
        schematics: schematics.items,
      },
    };
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
  const { session, groups } = Route.useLoaderData();
  // List body hides while the $contentId child editor is active (same
  // pattern as articles) — the editor then owns the shell's content area.
  // Declared before the early return — hook order must stay stable.
  const hasChild = useChildMatches({ select: (m) => m.length > 0 });
  if (!session.authenticated || !session.user || !groups)
    return <CmsSignInRequired title="Inventory" />;
  return (
    <CmsShell active="inventory" sessionUser={session.user} expiresAt={session.expiresAt}>
      {hasChild ? null : (
        <InventoryBody
          groups={groups}
          canWrite={session.user.role === "editor" || session.user.role === "admin"}
        />
      )}
      {/* Child editor route renders here - without this Outlet the editor match never paints. */}
      <Outlet />
    </CmsShell>
  );
}

function InventoryBody(props: {
  groups: {
    weapons: InventoryAdminItem[];
    traps: InventoryAdminItem[];
    perks: InventoryAdminItem[];
    schematics: InventoryAdminItem[];
  };
  canWrite: boolean;
}) {
  const [kind, setKind] = useState<Kind>("weapon");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<{
    contentId: string;
    title: string;
    to: "published" | "draft" | "archived";
  } | null>(null);

  const rows =
    props.groups[
      kind === "weapon"
        ? "weapons"
        : kind === "trap"
          ? "traps"
          : kind === "perk"
            ? "perks"
            : "schematics"
    ];
  const q = search.trim().toLowerCase();
  const visible = rows.filter(
    (i) =>
      (status === "" || i.status === status) &&
      (q === "" ||
        (i.title ?? "").toLowerCase().includes(q) ||
        i.contentId.toLowerCase().includes(q)),
  );

  const kindLabels: Record<Kind, string> = {
    weapon: "Weapons",
    trap: "Traps",
    perk: "Perks",
    schematic: "Schematics",
  };
  const kindHint: Record<Kind, string> = {
    weapon: "Ranged and melee armaments. Referenced by exactly-one schematics.",
    trap: "Defensive placements. Referenced by exactly-one schematics.",
    perk: "Modifier keys — unique machine ids attached to schematic slots.",
    schematic: "Craftable plans. Each references exactly one weapon XOR one trap.",
  };

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
        eyebrow="Content · Inventory"
        title="Inventory"
        description="Weapons, traps, perks, and schematics. A schematic references exactly one weapon or one trap. Only published rows appear publicly."
        action={
          props.canWrite ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="cc-btn cc-btn-primary cc-btn-sm"
                onClick={() => setCreateOpen(true)}
              >
                + New {kindLabels[kind].replace(/s$/, "").toLowerCase()} draft
              </button>
              {/* One Import JSON action, retargeted at the active tab. The four
                  inventory kinds are four real entity types, so the dialog's
                  `kind` follows the tab rather than inventing a union type. */}
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

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Inventory kind">
        {(["weapon", "trap", "perk", "schematic"] as Kind[]).map((k) => {
          const count =
            k === "weapon"
              ? props.groups.weapons.length
              : k === "trap"
                ? props.groups.traps.length
                : k === "perk"
                  ? props.groups.perks.length
                  : props.groups.schematics.length;
          const active = kind === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setKind(k);
                setStatus("");
              }}
              className={
                active
                  ? "cc-btn cc-btn-primary cc-btn-sm"
                  : "cc-btn cc-btn-ghost cc-btn-sm border cc-hairline"
              }
            >
              {kindLabels[k]} <span className="tabular-nums opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div>
        <CmsSectionTitle>{kindLabels[kind]}</CmsSectionTitle>
        <p className="mt-1 text-sm opacity-70">{kindHint[kind]}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-52 flex-1 sm:max-w-xs">
            <span className="sr-only">Search {kindLabels[kind]}</span>
            <input
              className="cc-input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${kindLabels[kind].toLowerCase()}…`}
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
            { value: "", label: "All", count: rows.length },
            {
              value: "published",
              label: "Published",
              count: rows.filter((i) => i.status === "published").length,
            },
            {
              value: "draft",
              label: "Draft",
              count: rows.filter((i) => i.status === "draft").length,
            },
            {
              value: "archived",
              label: "Archived",
              count: rows.filter((i) => i.status === "archived").length,
            },
          ]}
        />
        <p className="text-xs opacity-60" role="status">
          Showing {visible.length} of {rows.length}. Drafts never appear publicly.
        </p>
      </div>

      <CmsDataTable
        columns={[
          {
            key: "title",
            header: kindLabels[kind].replace(/s$/, ""),
            render: (r) => <span className="font-medium">{r.title ?? r.contentId}</span>,
          },
          {
            key: "subtype",
            header: "Subtype",
            label: "Subtype",
            render: (r) => <span className="font-mono text-xs">{r.subtype ?? "—"}</span>,
          },
          {
            key: "status",
            header: "Status",
            label: "Status",
            render: (r) => <CmsLifecycleBadge status={r.status} />,
          },
          {
            key: "locales",
            header: "Locales",
            label: "Locales",
            render: (r) => (
              <span className="font-mono text-xs">{r.locales.join(", ") || "none"}</span>
            ),
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
        rowTo={(r) => `/admin/inventory/${r.contentId}`}
        emptyTitle={rows.length === 0 ? `No ${kindLabels[kind].toLowerCase()} yet` : "No matches"}
        emptyDescription={
          rows.length === 0
            ? kind === "perk"
              ? "Perk keys are unique machine ids. Create the first draft above."
              : kind === "schematic"
                ? "Each schematic needs exactly one weapon or trap target."
                : "Create the first draft above."
            : "Try clearing the search or choosing a different status tab."
        }
      />

      <CreateInventoryDialog
        open={createOpen}
        pending={pending}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          if (input.kind === "weapon") {
            await mutate(
              () => createAdminWeapon({ data: { title: input.title } }).then(() => undefined),
              "Weapon draft created.",
            );
          } else if (input.kind === "trap") {
            await mutate(
              () => createAdminTrap({ data: { title: input.title } }).then(() => undefined),
              "Trap draft created.",
            );
          } else if (input.kind === "perk") {
            await mutate(
              () =>
                createAdminPerk({ data: { title: input.title, perkKey: input.perkKey } }).then(
                  () => undefined,
                ),
              "Perk draft created.",
            );
          } else {
            await mutate(
              () =>
                createAdminSchematic({
                  data: {
                    title: input.title,
                    ...(input.targetKind === "weapon"
                      ? { weaponContentId: input.targetId }
                      : { trapContentId: input.targetId }),
                  },
                }).then(() => undefined),
              "Schematic draft created.",
            );
          }
        }}
      />
      <CmsImportDialog
        open={importOpen}
        kind={kind}
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
            () =>
              publishAdminInventoryContent({
                data: { contentId: confirm.contentId, to: confirm.to },
              }),
            "Status updated.",
          )
        }
        pending={pending}
        title={confirm ? `Confirm: ${confirm.to} “${confirm.title}”` : "Confirm"}
        body={
          confirm?.to === "published"
            ? "Publishing makes this row publicly visible. Continue?"
            : confirm?.to === "archived"
              ? "Archiving retires this row from the public site (never hard-deleted). Continue?"
              : "Moving back to draft hides this row from the public site. Continue?"
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

function CreateInventoryDialog(props: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onCreate: (input: {
    kind: Kind;
    title: string;
    perkKey: string;
    targetKind: "weapon" | "trap";
    targetId: string;
  }) => Promise<void>;
}) {
  const [kind, setKind] = useState<Kind>("weapon");
  const [title, setTitle] = useState("");
  const [perkKey, setPerkKey] = useState("");
  const [targetKind, setTargetKind] = useState<"weapon" | "trap">("weapon");
  const [targetId, setTargetId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
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
            disabled={props.pending}
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
              void props.onCreate({
                kind,
                title: title.trim(),
                perkKey: perkKey.trim(),
                targetKind,
                targetId: targetId.trim(),
              });
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
