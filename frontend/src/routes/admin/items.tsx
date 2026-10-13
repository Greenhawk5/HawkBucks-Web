import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  createAdminCatalogResource,
  deleteAdminCatalogResource,
  getAdminCatalogResource,
  listAdminCatalogDefs,
  listAdminCatalogResources,
  setAdminAbilityDefTranslation,
  setAdminPerkDefTranslation,
  setAdminResourceTranslation,
  updateAdminAbilityDef,
  updateAdminCatalogResource,
  updateAdminPerkDef,
} from "@/lib/cms/catalog-admin.loader";
import {
  createAdminIconRegistryEntry,
  deleteAdminIconRegistryEntry,
  listAdminIconRegistry,
  updateAdminIconRegistryEntry,
} from "@/lib/cms/icon-registry-admin.loader";
import { CMS_CONTENT_LOCALES } from "@/lib/cms/heroes";
import { CmsShell } from "@/components/cms/cc/CmsShell";
import {
  CmsRouteErrorStandalone,
  CmsRoutePending,
  CmsSignInRequired,
} from "@/components/cms/cc/CmsAuth";
import {
  CmsConfirmDialog,
  CmsDialog,
  CmsField,
  CmsNotice,
} from "@/components/cms/cc/CmsPrimitives";
import { CmsMediaPicker } from "@/components/cms/cc/CmsMediaPicker";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";
import { GameItemIcon } from "@/components/cms/GameItemIcon";

type Tab = "resources" | "abilities" | "perks" | "icons";

function isTab(value: unknown): value is Tab {
  return value === "resources" || value === "abilities" || value === "perks" || value === "icons";
}

interface ItemsSearch {
  tab?: Tab | undefined;
  q?: string | undefined;
  category?: string | undefined;
  status?: string | undefined;
  slot?: string | undefined;
  offset?: number | undefined;
}

function parseSearch(raw: Record<string, unknown>): ItemsSearch {
  const out: ItemsSearch = {};
  if (isTab(raw["tab"])) out.tab = raw["tab"];
  if (typeof raw["q"] === "string" && raw["q"].trim() !== "") out.q = raw["q"].trim();
  if (typeof raw["category"] === "string" && raw["category"] !== "") {
    out.category = raw["category"];
  }
  if (typeof raw["status"] === "string" && raw["status"] !== "") out.status = raw["status"];
  if (typeof raw["slot"] === "string" && raw["slot"] !== "") out.slot = raw["slot"];
  if (typeof raw["offset"] === "number" && Number.isFinite(raw["offset"])) {
    out.offset = Math.max(0, Math.floor(raw["offset"]));
  }
  return out;
}

const PAGE_SIZE = 50;

export const Route = createFileRoute("/admin/items")({
  validateSearch: parseSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const session = await getAdminSession();
    if (!session.authenticated) {
      return { session, tab: "resources" as Tab, data: null };
    }
    const tab = isTab(deps.tab) ? deps.tab : "resources";
    if (tab === "resources") {
      const data = await listAdminCatalogResources({
        data: {
          search: deps.q,
          category: deps.category,
          status: deps.status,
          limit: PAGE_SIZE,
          offset: deps.offset ?? 0,
        },
      });
      return { session, tab, data };
    }
    if (tab === "icons") {
      // Reuses the same `q`/`category` search params as the other tabs. `q` here
      // matches semantic key OR display name, and `category` is restricted to
      // the icon categories the resolver actually serves.
      const data = await listAdminIconRegistry({
        data: {
          search: deps.q,
          category: deps.category,
          limit: PAGE_SIZE,
          offset: deps.offset ?? 0,
        },
      });
      return { session, tab, data };
    }
    const data = await listAdminCatalogDefs({
      data: {
        kind: tab === "abilities" ? "ability" : "perk",
        search: deps.q,
        slot: deps.slot,
        limit: PAGE_SIZE,
        offset: deps.offset ?? 0,
      },
    });
    return { session, tab, data };
  },
  head: () => ({
    meta: [
      { title: "Game Items — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Game Items" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Game Items" backTo="/admin" error={error} />
  ),
  component: GameItemsAdmin,
});

function GameItemsAdmin() {
  const { session, tab, data } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/items" });
  const [createOpen, setCreateOpen] = useState(false);

  const setParams = useCallback(
    (next: Partial<ItemsSearch>, options?: { replace?: boolean }) => {
      void navigate({
        search: (prev) => ({ ...prev, ...next, offset: next.offset ?? 0 }),
        ...(options?.replace === true ? { replace: true } : {}),
      });
    },
    [navigate],
  );
  const refresh = useCallback(async () => {
    await navigate({ search: (prev) => ({ ...prev }) });
  }, [navigate]);

  if (!session.authenticated || !session.user) return <CmsSignInRequired title="Game Items" />;
  const canWrite = session.user.role === "editor" || session.user.role === "admin";

  return (
    <CmsShell active="items" sessionUser={session.user} expiresAt={session.expiresAt}>
      <div className="space-y-5">
        <div>
          <p className="cc-eyebrow">Content · Game Items</p>
          <h1 className="cc-h1">Game Items</h1>
          <p className="cc-lede">
            The reusable catalog behind evolution costs, abilities, and perks: what an item{" "}
            <em>is</em> lives here; the files live in the Media Library. Renames and corrections
            made here survive the reference sync — the original upstream value stays visible and
            restorable. The <strong>Icons</strong> section registers the small glyphs several
            entities share — class marks, perk and ability icons — pointing at assets the Media
            Library already stores, never uploading a second copy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Catalog kind">
          {(
            [
              ["resources", "Resources"],
              ["abilities", "Abilities"],
              ["perks", "Hero perks"],
              ["icons", "Icons"],
            ] as Array<[Tab, string]>
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === tab}
              className={
                t === tab ? "cc-btn cc-btn-primary cc-btn-sm" : "cc-btn cc-btn-ghost cc-btn-sm"
              }
              onClick={() => setParams({ tab: t, q: undefined, offset: 0 })}
            >
              {label}
            </button>
          ))}
        </div>

        {data === null ? (
          <CmsNotice kind="info">Sign in to browse the catalog.</CmsNotice>
        ) : tab === "resources" ? (
          <ResourcesTab
            data={data as Awaited<ReturnType<typeof listAdminCatalogResources>>}
            search={search}
            setParams={setParams}
            refresh={refresh}
            canWrite={canWrite}
            onNew={() => setCreateOpen(true)}
          />
        ) : tab === "icons" ? (
          <IconsTab
            data={data as Awaited<ReturnType<typeof listAdminIconRegistry>>}
            search={search}
            setParams={setParams}
            refresh={refresh}
            canWrite={canWrite}
          />
        ) : (
          <DefsTab
            kind={tab === "abilities" ? "abilities" : "perks"}
            data={data as Awaited<ReturnType<typeof listAdminCatalogDefs>>}
            search={search}
            setParams={setParams}
            refresh={refresh}
            canWrite={canWrite}
          />
        )}

        <CreateResourceDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => void refresh()}
        />
      </div>
    </CmsShell>
  );
}

// ---------------------------------------------------------------------------
// Resources tab
// ---------------------------------------------------------------------------

type ResourceRow = Awaited<ReturnType<typeof listAdminCatalogResources>>["items"][number];

function ResourcesTab(props: {
  data: Awaited<ReturnType<typeof listAdminCatalogResources>>;
  search: ItemsSearch;
  setParams: (next: Partial<ItemsSearch>) => void;
  refresh: () => Promise<void>;
  canWrite: boolean;
  onNew: () => void;
}) {
  const { data, search, setParams, refresh, canWrite } = props;
  const [editingId, setEditingId] = useState<string | null>(null);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="cc-input max-w-64"
          placeholder="Search name or key…"
          defaultValue={search.q ?? ""}
          key={search.q ?? ""}
          aria-label="Search catalog items"
          onKeyDown={(e) => {
            if (e.key === "Enter")
              setParams({ q: (e.target as HTMLInputElement).value, offset: 0 });
          }}
        />
        <CmsSelect
          id="items-status"
          value={search.status ?? ""}
          onChange={(v) => setParams({ status: v === "" ? undefined : v, offset: 0 })}
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "retired", label: "Retired" },
          ]}
        />
        {canWrite ? (
          <button type="button" className="cc-btn cc-btn-primary cc-btn-sm" onClick={props.onNew}>
            + New item
          </button>
        ) : null}
        <span className="ms-auto text-xs opacity-60">
          Showing {data.items.length} of {data.total}
        </span>
      </div>

      {data.items.length === 0 ? (
        <CmsNotice kind="info">
          No catalog items match. New reusable materials are created here — never duplicated per
          hero.
        </CmsNotice>
      ) : (
        <ul className="cc-panel divide-y overflow-hidden rounded-xl">
          {data.items.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                onClick={() => setEditingId(row.id)}
              >
                <GameItemIcon
                  iconUrl={row.icon_url}
                  name={row.effective_name}
                  sizeClass="h-9 w-9"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.effective_name}</span>
                  <span className="block truncate font-mono text-xs opacity-60">
                    {row.resource_key} · {row.category} · used by {row.cost_rows} cost row
                    {row.cost_rows === 1 ? "" : "s"}
                  </span>
                </span>
                {row.editorial_name ? (
                  <span className="cc-badge" title="An editorial override is active">
                    override
                  </span>
                ) : null}
                {row.data_source === "stw-sync" ? (
                  <span className="cc-badge" title="Imported by the reference sync">
                    sync
                  </span>
                ) : (
                  <span className="cc-badge" title="Created by an editor in the CMS">
                    editorial
                  </span>
                )}
                {row.status === "retired" ? <span className="cc-badge">retired</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Pager total={data.total} offset={search.offset ?? 0} setParams={setParams} />

      {editingId ? (
        <EditResourceDialog
          id={editingId}
          canWrite={canWrite}
          onClose={() => setEditingId(null)}
          onSaved={() => void refresh()}
        />
      ) : null}
    </section>
  );
}

function Pager(props: {
  total: number;
  offset: number;
  setParams: (next: Partial<ItemsSearch>) => void;
}) {
  const { total, offset, setParams } = props;
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        type="button"
        className="cc-btn cc-btn-ghost cc-btn-sm"
        disabled={offset === 0}
        onClick={() => setParams({ offset: Math.max(0, offset - PAGE_SIZE) })}
      >
        ← Prev
      </button>
      <span className="opacity-60">
        {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
      </span>
      <button
        type="button"
        className="cc-btn cc-btn-ghost cc-btn-sm"
        disabled={offset + PAGE_SIZE >= total}
        onClick={() => setParams({ offset: offset + PAGE_SIZE })}
      >
        Next →
      </button>
    </div>
  );
}

function EditResourceDialog(props: {
  id: string;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [detail, setDetail] = useState<
    Awaited<ReturnType<typeof getAdminCatalogResource>>["resource"] | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [overrideName, setOverrideName] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<string | null>(null);
  const [iconId, setIconId] = useState<string | null | undefined>(undefined);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);
  const [trLocale, setTrLocale] = useState("es");
  const [trName, setTrName] = useState("");
  const [trDesc, setTrDesc] = useState("");
  const [trBusy, setTrBusy] = useState(false);
  const [trError, setTrError] = useState<string | null>(null);

  // Load once per opened row.
  useEffect(() => {
    let cancelled = false;
    void getAdminCatalogResource({ data: { id: props.id } })
      .then((r) => {
        if (cancelled) return;
        setDetail(r.resource);
        setOverrideName(r.resource.editorialName ?? "");
        setCategory(r.resource.category);
        setStatus(r.resource.status);
        setSortOrder(String(r.resource.sortOrder));
        setIconId(r.resource.iconAssetId);
        setIconUrl(r.resource.iconUrl);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Load failed.");
      });
    return () => {
      cancelled = true;
    };
  }, [props.id]);

  const save = async () => {
    if (!detail) return;
    setError(null);
    setSaving(true);
    try {
      await updateAdminCatalogResource({
        data: {
          id: detail.id,
          editorialName: (overrideName ?? "").trim() === "" ? null : (overrideName ?? "").trim(),
          category: (category ?? "").trim() === "" ? "material" : (category ?? "").trim(),
          status: status ?? "active",
          iconAssetId: iconId === undefined ? detail.iconAssetId : iconId,
          sortOrder: sortOrder === null || sortOrder.trim() === "" ? 0 : Number(sortOrder),
        },
      });
      props.onSaved();
      props.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CmsDialog open onClose={props.onClose} title="Edit catalog item" size="md">
      {loadError ? (
        <p className="text-sm text-[var(--cc-danger)]" role="alert">
          {loadError}
        </p>
      ) : !detail ? (
        <p className="text-sm opacity-70">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <GameItemIcon iconUrl={iconUrl} name={detail.effectiveName} sizeClass="h-12 w-12" />
            <div className="min-w-0">
              <p className="font-mono text-xs opacity-60">{detail.resourceKey}</p>
              <p className="text-sm">
                Reference name: <span className="font-medium">{detail.displayName}</span>
              </p>
              <p className="text-xs opacity-60">
                Source: {detail.dataSource}
                {detail.dataSnapshotAt ? ` · snapshot ${detail.dataSnapshotAt.slice(0, 10)}` : ""} ·
                used by {detail.costRows} cost row{detail.costRows === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <CmsField
            label="Display override"
            description="Empty restores the reference name. Overrides survive the reference sync."
          >
            <input
              className="cc-input"
              value={overrideName ?? ""}
              disabled={!props.canWrite}
              onChange={(e) => setOverrideName(e.target.value)}
              placeholder={detail.displayName}
            />
          </CmsField>

          <div className="grid gap-4 sm:grid-cols-3">
            <CmsField label="Category" description="Item kind slug.">
              <input
                className="cc-input font-mono"
                value={category ?? ""}
                disabled={!props.canWrite}
                onChange={(e) => setCategory(e.target.value)}
              />
            </CmsField>
            <CmsField label="Sort order" description="Ordering in cost lists.">
              <input
                className="cc-input"
                inputMode="numeric"
                value={sortOrder ?? ""}
                disabled={!props.canWrite}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </CmsField>
            <CmsField label="Status" description="Retiring hides its costs publicly.">
              <CmsSelect
                id="edit-resource-status"
                value={status ?? "active"}
                onChange={setStatus}
                width="full"
                options={[
                  { value: "active", label: "Active" },
                  { value: "retired", label: "Retired" },
                ]}
              />
            </CmsField>
          </div>

          <CmsField
            label="Icon"
            description="Pick from registered assets or register an existing R2 object — never re-upload."
          >
            <div className="flex items-center gap-2">
              <GameItemIcon iconUrl={iconUrl} name={detail.effectiveName} sizeClass="h-9 w-9" />
              <button
                type="button"
                className="cc-btn cc-btn-outline cc-btn-sm"
                disabled={!props.canWrite}
                onClick={() => setPickerOpen(true)}
              >
                {iconId ? "Replace…" : "Choose…"}
              </button>
              {iconId ? (
                <button
                  type="button"
                  className="cc-btn cc-btn-ghost cc-btn-sm"
                  disabled={!props.canWrite}
                  onClick={() => {
                    setIconId(null);
                    setIconUrl(null);
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-xs opacity-60">
              {iconId ?? "no association — the placeholder renders instead of a broken image"}
            </p>
          </CmsField>

          <CmsField
            label={`Localized name — ${trLocale}`}
            description="Translations fall back: locale → override → reference → key."
          >
            <div className="space-y-2">
              <CmsSelect
                id="edit-resource-locale"
                value={trLocale}
                onChange={(v) => {
                  setTrLocale(v);
                  const hit = detail.translations.find((t) => t.locale === v);
                  setTrName(hit?.name ?? "");
                  setTrDesc(hit?.description ?? "");
                  setTrError(null);
                }}
                width="full"
                options={CMS_CONTENT_LOCALES.map((l) => ({ value: l, label: l }))}
              />
              <input
                className="cc-input"
                value={trName}
                disabled={!props.canWrite}
                onChange={(e) => setTrName(e.target.value)}
                placeholder="Localized name"
              />
              <input
                className="cc-input"
                value={trDesc}
                disabled={!props.canWrite}
                onChange={(e) => setTrDesc(e.target.value)}
                placeholder="Localized description (optional)"
              />
              {trError ? (
                <p className="text-sm text-[var(--cc-danger)]" role="alert">
                  {trError}
                </p>
              ) : null}
              <button
                type="button"
                className="cc-btn cc-btn-outline cc-btn-sm"
                disabled={!props.canWrite || trBusy}
                onClick={() => {
                  setTrBusy(true);
                  setTrError(null);
                  void setAdminResourceTranslation({
                    data: {
                      resourceId: detail.id,
                      locale: trLocale,
                      name: trName,
                      description: trDesc,
                    },
                  })
                    .then(() => getAdminCatalogResource({ data: { id: detail.id } }))
                    .then((r) => setDetail(r.resource))
                    .catch((e) => setTrError(e instanceof Error ? e.message : "Save failed."))
                    .finally(() => setTrBusy(false));
                }}
              >
                {trBusy ? "Saving…" : "Save translation"}
              </button>
            </div>
          </CmsField>

          {detail.usedByHeroes.length > 0 ? (
            <CmsField
              label="Used by"
              description="Capped sample — the catalog row is shared, never copied."
            >
              <ul className="max-h-28 space-y-0.5 overflow-y-auto font-mono text-xs opacity-80">
                {detail.usedByHeroes.map((u) => (
                  <li key={u.heroContentId}>
                    {u.heroContentId} · {u.rarities} rarit{u.rarities === 1 ? "y" : "ies"}
                  </li>
                ))}
              </ul>
            </CmsField>
          ) : null}

          {error ? (
            <p className="text-sm text-[var(--cc-danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              className="cc-btn cc-btn-ghost cc-btn-sm"
              disabled={!props.canWrite}
              onClick={() => setConfirmDelete(true)}
            >
              Delete…
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="cc-btn cc-btn-ghost cc-btn-sm"
                onClick={props.onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cc-btn cc-btn-primary cc-btn-sm"
                disabled={!props.canWrite || saving}
                onClick={() => {
                  // Retiring hides public costs: confirm explicitly rather than
                  // letting it ride along with an ordinary save.
                  if (detail && status === "retired" && detail.status !== "retired") {
                    setConfirmRetire(true);
                    return;
                  }
                  void save();
                }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          {status === "retired" && detail.status !== "retired" ? (
            <CmsNotice kind="info">
              Saving with “retired” hides this item’s costs from public pages. Press Save, confirm
              here, then check the public totals — or switch back to “active”.
            </CmsNotice>
          ) : null}
        </div>
      )}

      <CmsMediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose catalog icon"
        onPick={(assetId, deliveryUrl) => {
          setIconId(assetId);
          setIconUrl(deliveryUrl);
        }}
      />
      <CmsConfirmDialog
        open={confirmRetire}
        onClose={() => setConfirmRetire(false)}
        onConfirm={() => {
          setConfirmRetire(false);
          void save();
        }}
        title="Retire catalog item?"
        body="Retiring hides this item's evolution costs from public pages. The rows stay in the database and can be reactivated. Continue?"
        confirmLabel="Retire"
        tone="danger"
      />
      <CmsConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          setError(null);
          void deleteAdminCatalogResource({ data: { id: props.id } })
            .then(() => {
              props.onSaved();
              props.onClose();
            })
            .catch((e) => setError(e instanceof Error ? e.message : "Delete failed."));
        }}
        title="Delete catalog item?"
        body="Only unused editor-created items can be deleted. Reference-synced or used items must be retired instead — the server enforces this."
        confirmLabel="Delete"
        tone="danger"
      />
    </CmsDialog>
  );
}

function CreateResourceDialog(props: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("material");
  const [iconId, setIconId] = useState<string | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!props.open) return null;
  return (
    <CmsDialog open onClose={props.onClose} title="New catalog item">
      <div className="space-y-4">
        <CmsField label="Key" description="Unique machine id, lowercase slug. Cannot change later.">
          <input
            className="cc-input font-mono"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="storm-shard"
          />
        </CmsField>
        <CmsField
          label="Display name"
          description="Reference name; overridable later without losing it."
        >
          <input
            className="cc-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Storm Shard"
          />
        </CmsField>
        <CmsField label="Category" description="Item kind slug, e.g. material, xp, training.">
          <input
            className="cc-input font-mono"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </CmsField>
        <CmsField
          label="Icon (optional)"
          description="Associate now or later — no duplicate entity."
        >
          <div className="flex items-center gap-2">
            <GameItemIcon iconUrl={iconUrl} name={name || key || "new item"} sizeClass="h-9 w-9" />
            <button
              type="button"
              className="cc-btn cc-btn-outline cc-btn-sm"
              onClick={() => setPickerOpen(true)}
            >
              Choose…
            </button>
            {iconId ? (
              <button
                type="button"
                className="cc-btn cc-btn-ghost cc-btn-sm"
                onClick={() => {
                  setIconId(null);
                  setIconUrl(null);
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </CmsField>
        {error ? (
          <p className="text-sm text-[var(--cc-danger)]" role="alert">
            {error}
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
              setError(null);
              setBusy(true);
              void createAdminCatalogResource({
                data: {
                  resourceKey: key.trim(),
                  displayName: name.trim(),
                  category: category.trim() === "" ? "material" : category.trim(),
                  iconAssetId: iconId,
                },
              })
                .then(() => {
                  props.onCreated();
                  props.onClose();
                })
                .catch((e) => setError(e instanceof Error ? e.message : "Create failed."))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Creating…" : "Create item"}
          </button>
        </div>
      </div>
      <CmsMediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose catalog icon"
        onPick={(assetId, deliveryUrl) => {
          setIconId(assetId);
          setIconUrl(deliveryUrl);
        }}
      />
    </CmsDialog>
  );
}

// ---------------------------------------------------------------------------
// Ability / perk definition tabs
// ---------------------------------------------------------------------------

type DefRow = Awaited<ReturnType<typeof listAdminCatalogDefs>>["items"][number];

function DefsTab(props: {
  kind: "abilities" | "perks";
  data: Awaited<ReturnType<typeof listAdminCatalogDefs>>;
  search: ItemsSearch;
  setParams: (next: Partial<ItemsSearch>) => void;
  refresh: () => Promise<void>;
  canWrite: boolean;
}) {
  const { kind, data, search, setParams, refresh, canWrite } = props;
  const [editing, setEditing] = useState<DefRow | null>(null);
  const singular = kind === "abilities" ? "ability" : "perk";
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="cc-input max-w-64"
          placeholder={`Search ${singular} name or key…`}
          defaultValue={search.q ?? ""}
          key={search.q ?? ""}
          aria-label={`Search ${singular} definitions`}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              setParams({ q: (e.target as HTMLInputElement).value, offset: 0 });
          }}
        />
        {kind === "perks" ? (
          <CmsSelect
            id="items-slot"
            value={search.slot ?? ""}
            onChange={(v) => setParams({ slot: v === "" ? undefined : v, offset: 0 })}
            options={[
              { value: "", label: "Both slots" },
              { value: "standard", label: "Standard" },
              { value: "commander", label: "Commander" },
            ]}
          />
        ) : null}
        <span className="ms-auto text-xs opacity-60">
          Showing {data.items.length} of {data.total}
        </span>
      </div>
      <CmsNotice kind="info">
        {kind === "abilities"
          ? "19 machine-keyed reference rows with no public URL. Icons and renames here apply to every hero carrying the ability."
          : "Slot-scoped definitions (standard/… vs commander/… never collide). Edits apply to every hero carrying the perk."}
      </CmsNotice>
      {data.items.length === 0 ? (
        <CmsNotice kind="info">No definitions match.</CmsNotice>
      ) : (
        <ul className="cc-panel divide-y overflow-hidden rounded-xl">
          {data.items.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                onClick={() => setEditing(row)}
              >
                <GameItemIcon
                  iconUrl={row.icon_url}
                  name={row.effective_name}
                  sizeClass="h-9 w-9"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.effective_name}</span>
                  <span className="block truncate font-mono text-xs opacity-60">
                    {row.slot ? `${row.slot} · ` : ""}
                    {row.def_key} · {row.hero_count} hero{row.hero_count === 1 ? "" : "es"}
                  </span>
                </span>
                {row.editorial_name ? <span className="cc-badge">override</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Pager total={data.total} offset={search.offset ?? 0} setParams={setParams} />
      {editing ? (
        <EditDefDialog
          kind={kind}
          row={editing}
          canWrite={canWrite}
          onClose={() => setEditing(null)}
          onSaved={() => void refresh()}
        />
      ) : null}
    </section>
  );
}

function EditDefDialog(props: {
  kind: "abilities" | "perks";
  row: DefRow;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { row } = props;
  const [overrideName, setOverrideName] = useState("");
  const [iconId, setIconId] = useState<string | null>(row.icon_asset_id);
  const [iconUrl, setIconUrl] = useState<string | null>(row.icon_url);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trLocale, setTrLocale] = useState("es");
  const [trName, setTrName] = useState("");
  const [trDesc, setTrDesc] = useState("");
  const [trBusy, setTrBusy] = useState(false);
  const [trError, setTrError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        id: row.id,
        editorialName: overrideName.trim() === "" ? null : overrideName.trim(),
        iconAssetId: iconId,
      };
      if (props.kind === "abilities") {
        await updateAdminAbilityDef({ data: payload });
      } else {
        await updateAdminPerkDef({ data: payload });
      }
      props.onSaved();
      props.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CmsDialog
      open
      onClose={props.onClose}
      title={`Edit ${props.kind === "abilities" ? "ability" : "perk"}`}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <GameItemIcon iconUrl={iconUrl} name={row.effective_name} sizeClass="h-12 w-12" />
          <div className="min-w-0">
            <p className="font-mono text-xs opacity-60">{row.def_key}</p>
            <p className="text-sm">
              Reference name: <span className="font-medium">{row.display_name}</span>
            </p>
            <p className="text-xs opacity-60">
              Shared by {row.hero_count} hero{row.hero_count === 1 ? "" : "s"} · source{" "}
              {row.data_source}
            </p>
          </div>
        </div>
        <CmsField
          label="Display override"
          description="Empty restores the reference name. Overrides survive the reference sync."
        >
          <input
            className="cc-input"
            value={overrideName}
            disabled={!props.canWrite}
            onChange={(e) => setOverrideName(e.target.value)}
            placeholder={row.display_name}
          />
        </CmsField>
        <CmsField
          label="Shared icon"
          description="Applies to every hero carrying this definition. Per-hero overrides still win."
        >
          <div className="flex items-center gap-2">
            <GameItemIcon iconUrl={iconUrl} name={row.effective_name} sizeClass="h-9 w-9" />
            <button
              type="button"
              className="cc-btn cc-btn-outline cc-btn-sm"
              disabled={!props.canWrite}
              onClick={() => setPickerOpen(true)}
            >
              {iconId ? "Replace…" : "Choose…"}
            </button>
            {iconId ? (
              <button
                type="button"
                className="cc-btn cc-btn-ghost cc-btn-sm"
                disabled={!props.canWrite}
                onClick={() => {
                  setIconId(null);
                  setIconUrl(null);
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </CmsField>
        <CmsField
          label={`Translation override — ${trLocale}`}
          description="Only the override is stored; the reference text stays intact."
        >
          <div className="space-y-2">
            <CmsSelect
              id="edit-def-locale"
              value={trLocale}
              onChange={(v) => {
                setTrLocale(v);
                setTrName("");
                setTrDesc("");
                setTrError(null);
              }}
              width="full"
              options={CMS_CONTENT_LOCALES.map((l) => ({ value: l, label: l }))}
            />
            <input
              className="cc-input"
              value={trName}
              disabled={!props.canWrite}
              onChange={(e) => setTrName(e.target.value)}
              placeholder="Override name (empty clears)"
            />
            {props.kind === "perks" ? (
              <input
                className="cc-input"
                value={trDesc}
                disabled={!props.canWrite}
                onChange={(e) => setTrDesc(e.target.value)}
                placeholder="Override description (empty clears)"
              />
            ) : null}
            {trError ? (
              <p className="text-sm text-[var(--cc-danger)]" role="alert">
                {trError}
              </p>
            ) : null}
            <button
              type="button"
              className="cc-btn cc-btn-outline cc-btn-sm"
              disabled={!props.canWrite || trBusy}
              onClick={() => {
                setTrBusy(true);
                setTrError(null);
                const call =
                  props.kind === "abilities"
                    ? setAdminAbilityDefTranslation({
                        data: {
                          defId: row.id,
                          locale: trLocale,
                          editorialName: trName.trim() === "" ? null : trName.trim(),
                        },
                      })
                    : setAdminPerkDefTranslation({
                        data: {
                          defId: row.id,
                          locale: trLocale,
                          editorialName: trName.trim() === "" ? null : trName.trim(),
                          editorialDescription: trDesc.trim() === "" ? null : trDesc.trim(),
                        },
                      });
                void call
                  .then(() => setTrError(null))
                  .catch((e) => setTrError(e instanceof Error ? e.message : "Save failed."))
                  .finally(() => setTrBusy(false));
              }}
            >
              {trBusy ? "Saving…" : "Save translation override"}
            </button>
          </div>
        </CmsField>
        {error ? (
          <p className="text-sm text-[var(--cc-danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={props.onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-primary cc-btn-sm"
            disabled={!props.canWrite || saving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <CmsMediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose definition icon"
        onPick={(assetId, deliveryUrl) => {
          setIconId(assetId);
          setIconUrl(deliveryUrl);
        }}
      />
    </CmsDialog>
  );
}

// ---------------------------------------------------------------------------
// Icons — the reusable-glyph registry
// ---------------------------------------------------------------------------

const ICON_CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "hero-class", label: "Hero classes" },
  { value: "standard-perk", label: "Standard Perks" },
  { value: "ability", label: "Abilities" },
  { value: "resource", label: "Catalog resources" },
];

const ASSOCIATION_LABELS: Record<string, string> = {
  hero_portrait: "Hero portrait",
  hero_banner: "Hero banner",
  hero_ability_icon: "Hero ability",
  ability_definition_icon: "Shared ability icon",
  hero_perk_icon: "Hero perk",
  hero_perk_definition_icon: "Shared perk icon",
  catalog_item_icon: "Catalog item",
  loadout_cover: "Loadout cover",
  weapon_icon: "Weapon",
  trap_icon: "Trap",
  perk_icon: "Team perk",
  schematic_icon: "Schematic",
  article_cover: "Article cover",
  article_attachment: "Article attachment",
  og_image: "Share image",
};

function associationLabel(source: string): string {
  return ASSOCIATION_LABELS[source] ?? source;
}

type IconRow = Awaited<ReturnType<typeof listAdminIconRegistry>>["entries"][number];

/**
 * The Icons section of the existing Game Items page.
 *
 * This is an EXTENSION of this page, not a new tool: it reuses the tab
 * navigation, the search/category filter params, the `CmsMediaPicker` for
 * selection, the `GameItemIcon` renderer, and the write conventions the other
 * tabs already use. There is one hard boundary that keeps it from becoming a
 * second media system:
 *
 *   nothing here uploads, renames, moves or deletes a file. Every row is a
 *   POINTER to an asset the Media Library already owns, and the only way in is
 *   selecting an existing asset. Deleting a row is one DELETE against the
 *   registry table and leaves the bytes and the `media_assets` row exactly as
 *   they were.
 */
function IconsTab(props: {
  data: Awaited<ReturnType<typeof listAdminIconRegistry>>;
  search: ItemsSearch;
  setParams: (next: Partial<ItemsSearch>) => void;
  refresh: () => Promise<void>;
  canWrite: boolean;
}) {
  const { data, search, setParams, refresh, canWrite } = props;
  const [editing, setEditing] = useState<IconRow | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="cc-input max-w-72"
          placeholder="Search display name or key…"
          defaultValue={search.q ?? ""}
          key={search.q ?? ""}
          aria-label="Search registered icons"
          onKeyDown={(e) => {
            if (e.key === "Enter")
              setParams({ q: (e.target as HTMLInputElement).value, offset: 0 });
          }}
        />
        <CmsSelect
          id="icons-category"
          value={search.category ?? ""}
          onChange={(v) => setParams({ category: v === "" ? undefined : v, offset: 0 })}
          width="full"
          options={ICON_CATEGORY_OPTIONS}
        />
        <span className="ms-auto text-xs opacity-60">
          Showing {data.entries.length} of {data.total}
        </span>
      </div>

      <CmsNotice kind="info">
        Registers an <strong>existing</strong> Media Library asset under a stable{" "}
        <code className="font-mono text-xs">category:slug</code> key. Resolution on the public site
        is an exact key match — never a name match — so renaming the display text below cannot
        silently repoint an icon, and the key itself is immutable once registered.
      </CmsNotice>

      {data.entries.length === 0 ? (
        <CmsNotice kind="info">
          {search.q || search.category
            ? "No icons match."
            : "No icons registered yet. Add one, then pick an existing asset in the Media Library."}
        </CmsNotice>
      ) : (
        <ul className="cc-panel divide-y overflow-hidden rounded-xl">
          {data.entries.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                onClick={() => setEditing(row)}
              >
                <GameItemIcon iconUrl={row.iconUrl} name={row.displayName} sizeClass="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.displayName}</span>
                  <span className="block truncate font-mono text-xs opacity-60">
                    {row.semanticKey}
                  </span>
                </span>
                {row.mediaAssetId === null ? (
                  // A real, reachable state: an editor reserved the key and has
                  // not picked a file yet. Saying so is better than an
                  // unexplained empty slot.
                  <span className="cc-badge">unbound</span>
                ) : row.iconUrl === null ? (
                  <span className="cc-badge" title="Asset is missing or not usable">
                    unavailable
                  </span>
                ) : row.usageCount > 0 ? (
                  <span className="cc-badge" title={row.usedBy.map(associationLabel).join(", ")}>
                    in use · {row.usageCount}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Pager total={data.total} offset={search.offset ?? 0} setParams={setParams} />

      {canWrite ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="cc-btn cc-btn-primary cc-btn-sm"
            onClick={() => setCreating(true)}
          >
            Register icon
          </button>
        </div>
      ) : null}

      {creating ? (
        <RegisterIconDialog
          onClose={() => setCreating(false)}
          onCreated={() => void refresh()}
          canWrite={canWrite}
        />
      ) : null}

      {editing ? (
        <EditIconDialog
          row={editing}
          canWrite={canWrite}
          onClose={() => setEditing(null)}
          onSaved={() => void refresh()}
        />
      ) : null}
    </section>
  );
}

interface IconFormState {
  displayName: string;
  category: string;
  semanticKey: string;
  assetId: string | null;
  assetUrl: string | null;
}

/** Derive a semantic key from the category + a human name, exactly as the
 *  resolver does, so what the form PREVIEWS is what will be stored. */
function suggestedKey(category: string, name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  if (slug === "") return "";
  return `${category}:${slug}`;
}

function IconDialogShell(props: {
  title: string;
  state: IconFormState;
  onChange: (next: Partial<IconFormState>) => void;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
  canWrite: boolean;
  submitLabel: string;
  /** When set, the semantic key is shown read-only after registration. */
  keyHint?: string;
  /** Extra footer action(s), e.g. deleting the entry. Lives INSIDE the dialog
   *  so it can never be painted behind the modal overlay. */
  extraActions?: ReactNode;
}) {
  const { state, onChange } = props;
  const [pickerOpen, setPickerOpen] = useState(false);
  const keyLocked = props.keyHint !== undefined;
  const derivedKey = suggestedKey(state.category, state.displayName);
  const effectiveKey = state.semanticKey === "" ? derivedKey : state.semanticKey;
  const keyValid =
    /^[a-z][a-z0-9-]{0,31}:[a-z0-9][a-z0-9-]{0,63}$/.test(effectiveKey) &&
    effectiveKey.startsWith(`${state.category}:`);

  return (
    <CmsDialog open onClose={props.onClose} title={props.title} size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <GameItemIcon iconUrl={state.assetUrl} name={state.displayName} sizeClass="h-12 w-12" />
          <div className="min-w-0">
            <p className="text-sm">
              {state.assetId ? (
                <>
                  Bound to Media Library asset{" "}
                  <span className="font-mono text-xs opacity-70">
                    {state.assetId.slice(0, 18)}…
                  </span>
                </>
              ) : (
                <>No asset bound yet</>
              )}
            </p>
            <p className="text-xs opacity-60">
              The file stays in the Media Library — this entry only points at it.
            </p>
          </div>
        </div>

        <CmsField
          label="Category"
          description="Restricted to the categories the public icons actually use."
        >
          <CmsSelect
            id="icon-category"
            value={state.category}
            onChange={(v) => onChange({ category: v, semanticKey: "" })}
            width="full"
            options={ICON_CATEGORY_OPTIONS.filter((o) => o.value !== "")}
          />
        </CmsField>

        <CmsField label="Display name">
          <input
            className="cc-input"
            value={state.displayName}
            disabled={!props.canWrite}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="Soldier"
          />
        </CmsField>

        <CmsField
          label="Semantic key"
          {...(keyLocked && props.keyHint !== undefined ? { description: props.keyHint } : {})}
        >
          <input
            className="cc-input font-mono text-sm"
            value={keyLocked ? state.semanticKey : effectiveKey}
            readOnly={keyLocked}
            disabled={!props.canWrite}
            onChange={(e) => onChange({ semanticKey: e.target.value })}
            placeholder="hero-class:soldier"
          />
          {!keyLocked && !keyValid && effectiveKey !== "" ? (
            <p className="mt-1 text-xs text-[var(--cc-danger)]">
              Key must be <code className="font-mono">category:slug</code> and start with{" "}
              <code className="font-mono">{state.category}:</code>.
            </p>
          ) : null}
        </CmsField>

        <CmsField
          label="Icon asset"
          description="Pick an existing Media Library asset. Nothing is uploaded here."
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="cc-btn cc-btn-outline cc-btn-sm"
              disabled={!props.canWrite}
              onClick={() => setPickerOpen(true)}
            >
              {state.assetId ? "Replace…" : "Choose…"}
            </button>
            {state.assetId ? (
              <button
                type="button"
                className="cc-btn cc-btn-ghost cc-btn-sm"
                disabled={!props.canWrite}
                onClick={() => onChange({ assetId: null, assetUrl: null })}
              >
                Clear
              </button>
            ) : null}
          </div>
        </CmsField>

        {props.error ? (
          <p className="text-sm text-[var(--cc-danger)]" role="alert">
            {props.error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {props.extraActions}
          <div className="flex justify-end gap-2 ms-auto">
            <button type="button" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={props.onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="cc-btn cc-btn-primary cc-btn-sm"
              disabled={
                !props.canWrite || props.saving || !keyValid || state.displayName.trim() === ""
              }
              onClick={props.onSubmit}
            >
              {props.saving ? "Saving…" : props.submitLabel}
            </button>
          </div>
        </div>
      </div>

      <CmsMediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose icon asset"
        onPick={(assetId, deliveryUrl) => onChange({ assetId, assetUrl: deliveryUrl })}
      />
    </CmsDialog>
  );
}

function RegisterIconDialog(props: {
  onClose: () => void;
  onCreated: () => void;
  canWrite: boolean;
}) {
  const [state, setState] = useState<IconFormState>({
    displayName: "",
    category: "hero-class",
    semanticKey: "",
    assetId: null,
    assetUrl: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await createAdminIconRegistryEntry({
        data: {
          semanticKey:
            state.semanticKey === ""
              ? suggestedKey(state.category, state.displayName)
              : state.semanticKey,
          displayName: state.displayName.trim(),
          category: state.category,
          mediaAssetId: state.assetId,
        },
      });
      props.onCreated();
      props.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <IconDialogShell
      title="Register icon"
      state={state}
      onChange={(next) => setState((prev) => ({ ...prev, ...next }))}
      error={error}
      saving={saving}
      canWrite={props.canWrite}
      onClose={props.onClose}
      onSubmit={() => void submit()}
      submitLabel="Register"
    />
  );
}

function EditIconDialog(props: {
  row: IconRow;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = useState<IconFormState>({
    displayName: props.row.displayName,
    category: props.row.category,
    semanticKey: props.row.semanticKey,
    assetId: props.row.mediaAssetId,
    assetUrl: props.row.iconUrl,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await updateAdminIconRegistryEntry({
        data: {
          id: props.row.id,
          displayName: state.displayName.trim(),
          mediaAssetId: state.assetId,
        },
      });
      props.onSaved();
      props.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setError(null);
    setSaving(true);
    try {
      await deleteAdminIconRegistryEntry({ data: { id: props.row.id } });
      setConfirmDelete(false);
      props.onSaved();
      props.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <IconDialogShell
        title="Edit icon"
        state={state}
        onChange={(next) => setState((prev) => ({ ...prev, ...next }))}
        error={error}
        saving={saving}
        canWrite={props.canWrite}
        onClose={props.onClose}
        onSubmit={() => void save()}
        submitLabel="Save"
        keyHint="The semantic key is the public resolution key and cannot change once registered — renaming it would silently repoint every consumer."
        extraActions={
          props.canWrite ? (
            <button
              type="button"
              className="cc-btn cc-btn-danger-outline cc-btn-sm"
              disabled={saving}
              onClick={() => setConfirmDelete(true)}
            >
              Remove entry
            </button>
          ) : null
        }
      />

      <CmsConfirmDialog
        open={confirmDelete}
        title="Remove this icon entry?"
        body={`Removes the registry pointer for “${props.row.displayName}”. The Media Library asset and the file in storage are left untouched — use the Media Library to destroy the object itself.`}
        confirmLabel={saving ? "Working…" : "Remove entry"}
        tone="danger"
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
