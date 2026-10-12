import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  assignAdminHeroPerk,
  deleteAdminAbility,
  getAdminHero,
  listAdminHeroPerkDefinitions,
  publishAdminContent,
  updateAdminHero,
  upsertAdminHeroPerkIcon,
  upsertAdminTranslation,
  type HeroAdminDetail,
} from "@/lib/cms/heroes-admin.loader";
import { upsertAdminAbility } from "@/lib/cms/loadouts-admin.loader";
import {
  addAdminCostRow,
  addAdminProgressionTier,
  deleteAdminCostRow,
  deleteAdminProgressionTier,
  getAdminHeroEvolution,
  setAdminCostOverride,
  setAdminProgressionOverride,
} from "@/lib/cms/catalog-admin.loader";
import { listAdminCatalogResources } from "@/lib/cms/catalog-admin.loader";
import { HERO_SUMMARY_MAX_LENGTH } from "@/lib/cms/heroes-loadouts.server";
import { CmsRouteErrorStandalone, CmsRoutePending } from "@/components/cms/cc/CmsAuth";
import { CmsCard, CmsField, CmsNotice } from "@/components/cms/cc/CmsPrimitives";
import {
  CmsConfirmDialog,
  CmsDataTable,
  CmsDialog,
  CmsMenu,
} from "@/components/cms/cc/CmsPrimitives";
import { CmsMediaField } from "@/components/cms/media/CmsMediaField";
import { CmsMediaSection } from "@/components/cms/cc/CmsMediaSection";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";
import {
  CmsEditorFeedback,
  CmsEditorFrame,
  CmsFormSection,
  useCmsEditorState,
} from "@/components/cms/cc/CmsEditor";

export const Route = createFileRoute("/admin/heroes/$contentId")({
  loader: async ({ params }) => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, hero: null };
    const { hero } = await getAdminHero({ data: { contentId: params.contentId } });
    return { session, hero };
  },
  head: () => ({
    meta: [
      { title: "Edit hero — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Edit hero" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Edit hero" backTo="/admin/heroes" error={error} />
  ),
  component: HeroEditor,
});

const LOCALES = ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"] as const;

function HeroEditor() {
  const { session, hero } = Route.useLoaderData() as {
    session: {
      authenticated: boolean;
      user: { id: string; username: string; displayName: string; role: string } | null;
      expiresAt: string | null;
    };
    hero: Awaited<ReturnType<typeof getAdminHero>>["hero"] | null;
  };
  const editor = useCmsEditorState();
  const refreshHero = useHeroEditorRefresh();
  const [publishPending, setPublishPending] = useState(false);

  if (!hero || !session.user) {
    return (
      <CmsEditorFrame
        session={session}
        backTo="/admin/heroes"
        backLabel="Heroes"
        eyebrow="Content · Hero"
        title="Hero not found"
        status="draft"
        publishPending={false}
        canPublish={false}
        onPublish={() => undefined}
      >
        <CmsNotice kind="error">This hero does not exist.</CmsNotice>
      </CmsEditorFrame>
    );
  }

  const currentHero = hero as NonNullable<typeof hero>;
  const canWrite = session.user?.role === "editor" || session.user?.role === "admin";
  const canPublish = session.user?.role === "admin";

  async function handlePublish(to: "published" | "draft" | "archived") {
    if (
      !window.confirm(
        to === "published"
          ? "Publishing makes this hero publicly visible. Continue?"
          : to === "archived"
            ? "Archiving retires this hero (never hard-deleted). Continue?"
            : "Moving back to draft hides this hero. Continue?",
      )
    ) {
      return;
    }
    setPublishPending(true);
    editor.setError(null);
    try {
      await publishAdminContent({ data: { contentId: currentHero.contentId, to } });
      window.location.reload();
    } catch (e) {
      editor.setError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setPublishPending(false);
    }
  }

  return (
    <CmsEditorFrame
      session={session}
      backTo="/admin/heroes"
      backLabel="Heroes"
      eyebrow={`Content · Hero · ${hero.heroClass}`}
      title={hero.title ?? hero.contentId}
      subtitle={`Content id ${hero.contentId} · ${hero.abilities.length} abilities · locales ${hero.locales.join(", ") || "none"}`}
      status={hero.status}
      updatedAt={hero.updatedAt}
      publishPending={publishPending}
      canPublish={canPublish}
      onPublish={handlePublish}
      rail={
        <CmsCard title="Record">
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between gap-2">
              <dt className="opacity-60">Class</dt>
              <dd className="font-mono">{hero.heroClass}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="opacity-60">Default locale</dt>
              <dd className="font-mono">{hero.defaultLocale}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="opacity-60">Abilities</dt>
              <dd className="tabular-nums">{hero.abilities.length}</dd>
            </div>
          </dl>
        </CmsCard>
      }
    >
      <CmsEditorFeedback message={editor.message} error={editor.error} />
      {!canWrite ? (
        <CmsNotice kind="warning">
          Your role ({session.user?.role}) is read-only. Editing requires the editor role.
        </CmsNotice>
      ) : null}
      <IdentityForm
        hero={currentHero}
        disabled={!canWrite}
        run={editor.run}
        pending={editor.pending}
      />
      <MediaForm
        hero={currentHero}
        disabled={!canWrite}
        run={editor.run}
        pending={editor.pending}
      />
      <TranslationForm
        hero={currentHero}
        disabled={!canWrite}
        run={editor.run}
        pending={editor.pending}
      />
      <AbilitiesForm
        hero={currentHero}
        disabled={!canWrite}
        run={editor.run}
        pending={editor.pending}
      />
      <PerkSlotPanel
        hero={currentHero}
        disabled={!canWrite}
        pending={editor.pending}
        run={editor.run}
        refresh={refreshHero}
      />
      <EvolutionEditor hero={currentHero} canWrite={canWrite} refreshHero={refreshHero} />
      <ReferencePanel hero={currentHero} />
    </CmsEditorFrame>
  );
}

type HeroDetail = Awaited<ReturnType<typeof getAdminHero>>["hero"];

/**
 * Read-only view of what the reference sync populated.
 *
 * Deliberately NOT a form. Perks, progression and costs are written only by
 * scripts/sync-heroes-reference.mjs, so exposing them as editable fields would
 * let an editor change data that the next sync would silently overwrite - and
 * would break the reference-only rollback this separation makes possible.
 *
 * The two editable things in this namespace now live in PerkSlotPanel above:
 * `hero_perks.icon_asset_id` (media metadata on the per-hero join row, which
 * the sync never writes) and the join rows themselves, which is how a hero
 * gains a standard/commander perk even when the reference sync produced none.
 * Neither appears in this list, and neither touches the shared definitions.
 *
 * Editorial fields (identity, media, translations, SEO) live in the forms above.
 */
/**
 * Editable evolution & progression section (migration 0016).
 *
 * The reference sync owns the upstream values; this editor writes ONLY
 * the `editorial_*` override columns the sync never touches. Every row
 * shows the reference value, the effective value, and whether an
 * override is active. Clearing an override restores the reference value;
 * excluding a row suppresses it from public output without deleting it
 * (the sync would recreate a deleted reference row).
 *
 * Rows the CMS created itself (`data_source = 'editorial'`) may be
 * hard-deleted because the sync only recreates combinations present in
 * the upstream snapshot.
 */
function EvolutionEditor(props: {
  hero: HeroDetail;
  canWrite: boolean;
  refreshHero: () => Promise<void>;
}) {
  const { hero, canWrite } = props;
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminHeroEvolution>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tierTarget, setTierTarget] = useState<EditableTierRow | null>(null);
  const [costTarget, setCostTarget] = useState<EditableCostRow | null>(null);
  const [addTierOpen, setAddTierOpen] = useState(false);
  const [addCostOpen, setAddCostOpen] = useState(false);
  const [confirmDeleteTier, setConfirmDeleteTier] = useState<EditableTierRow | null>(null);
  const [confirmDeleteCost, setConfirmDeleteCost] = useState<EditableCostRow | null>(null);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const result = await getAdminHeroEvolution({ data: { contentId: hero.contentId } });
      setData(result);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load evolution data.");
    }
  }, [hero.contentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = useCallback(
    async (action: () => Promise<unknown>, success: string) => {
      setError(null);
      setMessage(null);
      setBusy(true);
      try {
        await action();
        setMessage(success);
        await Promise.all([reload(), props.refreshHero()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed.");
      } finally {
        setBusy(false);
      }
    },
    [reload, props],
  );

  const tiers = data?.tiers ?? [];
  const costs = data?.costs ?? [];
  const rarities = [...new Set(tiers.map((t) => t.rarity))];

  return (
    <CmsFormSection
      title="Evolution & progression"
      description="Editorial overrides over synced reference data. Overrides survive the reference sync; clearing one restores the upstream value."
      data-testid="hero-evolution-editor"
      action={
        canWrite ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="cc-btn cc-btn-outline cc-btn-sm"
              onClick={() => setAddTierOpen(true)}
            >
              + Add tier
            </button>
            <button
              type="button"
              className="cc-btn cc-btn-outline cc-btn-sm"
              onClick={() => setAddCostOpen(true)}
            >
              + Add cost
            </button>
          </div>
        ) : undefined
      }
    >
      {!canWrite ? (
        <CmsNotice kind="warning">
          Your role is read-only. Editing overrides requires the editor role.
        </CmsNotice>
      ) : null}
      {loadError ? (
        <CmsNotice kind="error">{loadError}</CmsNotice>
      ) : !data ? (
        <CmsNotice kind="info">Loading evolution data…</CmsNotice>
      ) : tiers.length === 0 ? (
        <CmsNotice kind="info">
          No evolution data for this hero yet. Add a tier, or run the reference sync.
        </CmsNotice>
      ) : (
        <div className="space-y-4">
          {rarities.map((rarity) => {
            const rarityTiers = tiers
              .filter((t) => t.rarity === rarity)
              .sort((a, b) => a.tier - b.tier);
            const rarityCosts = costs.filter((c) => c.rarity === rarity);
            return (
              <div key={rarity} className="cc-panel p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold capitalize">{rarity}</h3>
                  <p className="text-xs tabular-nums opacity-60">
                    {rarityTiers.length} tiers ·{" "}
                    {rarityCosts.filter((c) => c.scope === "total").length} total row(s)
                  </p>
                </div>
                <table className="cc-table mt-2 w-full">
                  <thead>
                    <tr>
                      <th scope="col">Tier</th>
                      <th scope="col">Power (ref → effective)</th>
                      <th scope="col">Level (ref → effective)</th>
                      <th scope="col">Evolve to next</th>
                      <th scope="col" className="text-end">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rarityTiers.map((tier) => {
                      const top = tier.tier === rarityTiers[rarityTiers.length - 1]?.tier;
                      const tierCosts = rarityCosts.filter(
                        (c) => c.scope === "tier" && c.tier === tier.tier && c.kind === "evolve",
                      );
                      const overridden =
                        tier.editorial_power_min !== null ||
                        tier.editorial_power_max !== null ||
                        tier.editorial_level_min !== null ||
                        tier.editorial_level_max !== null;
                      return (
                        <tr key={tier.id} className={tier.editorial_excluded ? "opacity-50" : ""}>
                          <td className="tabular-nums font-semibold">
                            {tier.tier}
                            {tier.editorial_excluded ? (
                              <span className="ms-1 cc-badge" title="Excluded from public output">
                                excluded
                              </span>
                            ) : null}
                          </td>
                          <td className="tabular-nums">
                            {fmtRange(tier.power_min, tier.power_max)}
                            {overridden ? (
                              <span className="ms-1 text-xs text-[var(--cc-accent)]">
                                →{" "}
                                {fmtRange(
                                  tier.editorial_power_min ?? tier.power_min,
                                  tier.editorial_power_max ?? tier.power_max,
                                )}
                              </span>
                            ) : null}
                          </td>
                          <td className="tabular-nums">
                            {fmtRange(tier.level_min, tier.level_max)}
                            {(tier.editorial_level_min !== null ||
                              tier.editorial_level_max !== null) && (
                              <span className="ms-1 text-xs text-[var(--cc-accent)]">
                                →{" "}
                                {fmtRange(
                                  tier.editorial_level_min ?? tier.level_min,
                                  tier.editorial_level_max ?? tier.level_max,
                                )}
                              </span>
                            )}
                          </td>
                          <td>
                            {tierCosts.length === 0 ? (
                              <span className="text-xs opacity-60">
                                {top ? "Final tier — no further evolution." : "—"}
                              </span>
                            ) : (
                              <ul className="flex flex-wrap gap-1">
                                {tierCosts.map((c) => (
                                  <li
                                    key={c.id}
                                    className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs tabular-nums cc-hairline"
                                  >
                                    <span className="font-semibold">
                                      {c.effective_amount.toLocaleString("en-US")}
                                    </span>
                                    <span className="opacity-80">{c.resource_name}</span>
                                    {c.editorial_amount !== null ? (
                                      <span
                                        className="text-[var(--cc-accent)]"
                                        title={`Reference: ${c.amount.toLocaleString("en-US")}`}
                                      >
                                        *
                                      </span>
                                    ) : null}
                                    {c.editorial_excluded ? (
                                      <span className="cc-badge">excl</span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="text-end">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                className="cc-btn cc-btn-ghost cc-btn-sm"
                                disabled={!canWrite || busy}
                                onClick={() => setTierTarget(tier)}
                              >
                                Override
                              </button>
                              {tier.data_source === "editorial" ? (
                                <button
                                  type="button"
                                  className="cc-btn cc-btn-ghost cc-btn-sm"
                                  disabled={!canWrite || busy}
                                  onClick={() => setConfirmDeleteTier(tier)}
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {rarityCosts.filter((c) => c.scope === "total").length > 0 ? (
                  <div className="mt-2 rounded-md border p-2.5 cc-hairline">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-60">
                      Total to max / recycling
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {rarityCosts
                        .filter((c) => c.scope === "total")
                        .map((c) => (
                          <li
                            key={c.id}
                            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[13px] tabular-nums cc-hairline"
                          >
                            <span className="font-semibold">
                              {c.effective_amount.toLocaleString("en-US")}
                            </span>
                            <span className="opacity-80">{c.resource_name}</span>
                            <span className="text-[10px] uppercase opacity-50">{c.kind}</span>
                            {c.editorial_amount !== null ? (
                              <span
                                className="text-[var(--cc-accent)]"
                                title={`Reference: ${c.amount.toLocaleString("en-US")}`}
                              >
                                *
                              </span>
                            ) : null}
                            {canWrite ? (
                              <button
                                type="button"
                                className="cc-btn cc-btn-ghost cc-btn-sm"
                                disabled={busy}
                                onClick={() => setCostTarget(c)}
                                aria-label={`Edit ${c.resource_name} ${c.kind} cost`}
                              >
                                ✎
                              </button>
                            ) : null}
                            {c.data_source === "editorial" && canWrite ? (
                              <button
                                type="button"
                                className="cc-btn cc-btn-ghost cc-btn-sm"
                                disabled={busy}
                                onClick={() => setConfirmDeleteCost(c)}
                                aria-label={`Delete ${c.resource_name} ${c.kind} cost`}
                              >
                                ✕
                              </button>
                            ) : null}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}

                {rarityCosts.filter((c) => c.scope === "tier").length > 0 ? (
                  <div className="mt-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-60">
                      Tier &amp; recycle costs
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {rarityCosts
                        .filter((c) => c.scope === "tier")
                        .map((c) => (
                          <li
                            key={c.id}
                            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[13px] tabular-nums cc-hairline"
                          >
                            <span className="text-[10px] uppercase opacity-50">
                              T{c.tier} {c.kind}
                            </span>
                            <span className="font-semibold">
                              {c.effective_amount.toLocaleString("en-US")}
                            </span>
                            <span className="opacity-80">{c.resource_name}</span>
                            {c.editorial_amount !== null ? (
                              <span
                                className="text-[var(--cc-accent)]"
                                title={`Reference: ${c.amount.toLocaleString("en-US")}`}
                              >
                                *
                              </span>
                            ) : null}
                            {canWrite ? (
                              <button
                                type="button"
                                className="cc-btn cc-btn-ghost cc-btn-sm"
                                disabled={busy}
                                onClick={() => setCostTarget(c)}
                                aria-label={`Edit ${c.resource_name} ${c.kind} cost`}
                              >
                                ✎
                              </button>
                            ) : null}
                            {c.data_source === "editorial" && canWrite ? (
                              <button
                                type="button"
                                className="cc-btn cc-btn-ghost cc-btn-sm"
                                disabled={busy}
                                onClick={() => setConfirmDeleteCost(c)}
                                aria-label={`Delete ${c.resource_name} ${c.kind} cost`}
                              >
                                ✕
                              </button>
                            ) : null}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })}
          <p className="text-xs opacity-55">
            * marks an editorial override — the reference value is preserved and restorable. Synced
            snapshot{" "}
            <span className="font-mono">{hero.dataSnapshotAt?.slice(0, 10) ?? "unknown"}</span>.
          </p>
          {error ? <CmsNotice kind="error">{error}</CmsNotice> : null}
          {message ? <CmsNotice kind="success">{message}</CmsNotice> : null}
        </div>
      )}

      {tierTarget ? (
        <TierOverrideDialog
          tier={tierTarget}
          busy={busy}
          onClose={() => setTierTarget(null)}
          onSave={(patch, excluded) =>
            run(
              () =>
                setAdminProgressionOverride({
                  data: { id: tierTarget.id, ...patch, excluded },
                }),
              "Tier override saved.",
            )
          }
          onExclude={(excluded) =>
            run(
              () => setAdminProgressionOverride({ data: { id: tierTarget.id, excluded } }),
              excluded ? "Tier excluded from public output." : "Tier restored to public output.",
            )
          }
        />
      ) : null}
      {costTarget ? (
        <CostOverrideDialog
          cost={costTarget}
          busy={busy}
          onClose={() => setCostTarget(null)}
          onSave={(amount, excluded) =>
            run(
              () =>
                setAdminCostOverride({
                  data: { id: costTarget.id, editorialAmount: amount, excluded },
                }),
              "Cost override saved.",
            )
          }
          onExclude={(excluded) =>
            run(
              () => setAdminCostOverride({ data: { id: costTarget.id, excluded } }),
              excluded ? "Cost excluded from public output." : "Cost restored to public output.",
            )
          }
        />
      ) : null}
      {addTierOpen ? (
        <AddTierDialog
          heroContentId={hero.contentId}
          busy={busy}
          onClose={() => setAddTierOpen(false)}
          onSave={(input) => run(() => addAdminProgressionTier({ data: input }), "Tier added.")}
        />
      ) : null}
      {addCostOpen ? (
        <AddCostDialog
          heroContentId={hero.contentId}
          busy={busy}
          onClose={() => setAddCostOpen(false)}
          onSave={(input) => run(() => addAdminCostRow({ data: input }), "Cost added.")}
        />
      ) : null}
      {confirmDeleteTier ? (
        <CmsConfirmDialog
          open
          onClose={() => setConfirmDeleteTier(null)}
          onConfirm={() => {
            const tier = confirmDeleteTier;
            setConfirmDeleteTier(null);
            void run(() => deleteAdminProgressionTier({ data: { id: tier.id } }), "Tier deleted.");
          }}
          title="Delete editor-created tier?"
          body={`Tier ${confirmDeleteTier.tier} (${confirmDeleteTier.rarity}) was created in the CMS, so it is safe to delete. Synced tiers must be excluded instead — the sync would recreate them.`}
          confirmLabel="Delete tier"
          tone="danger"
        />
      ) : null}
      {confirmDeleteCost ? (
        <CmsConfirmDialog
          open
          onClose={() => setConfirmDeleteCost(null)}
          onConfirm={() => {
            const cost = confirmDeleteCost;
            setConfirmDeleteCost(null);
            void run(() => deleteAdminCostRow({ data: { id: cost.id } }), "Cost row deleted.");
          }}
          title="Delete editor-created cost?"
          body={`This cost row was created in the CMS, so it is safe to delete. Synced costs must be excluded instead — the sync would recreate them.`}
          confirmLabel="Delete cost"
          tone="danger"
        />
      ) : null}
    </CmsFormSection>
  );
}

function fmtRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "—";
  return `${min ?? "—"}–${max ?? "—"}`;
}

type EditableTierRow = Awaited<ReturnType<typeof getAdminHeroEvolution>>["tiers"][number];
type EditableCostRow = Awaited<ReturnType<typeof getAdminHeroEvolution>>["costs"][number];

function TierOverrideDialog(props: {
  tier: EditableTierRow;
  busy: boolean;
  onClose: () => void;
  onSave: (
    patch: {
      editorialPowerMin?: number | null;
      editorialPowerMax?: number | null;
      editorialLevelMin?: number | null;
      editorialLevelMax?: number | null;
    },
    excluded: boolean,
  ) => void;
  onExclude: (excluded: boolean) => void;
}) {
  const t = props.tier;
  // String while editing ("" = cleared); parsed + validated on save.
  const [powerMin, setPowerMin] = useState<string>(
    String(t.editorial_power_min ?? t.power_min ?? ""),
  );
  const [powerMax, setPowerMax] = useState<string>(
    String(t.editorial_power_max ?? t.power_max ?? ""),
  );
  const [levelMin, setLevelMin] = useState<string>(
    String(t.editorial_level_min ?? t.level_min ?? ""),
  );
  const [levelMax, setLevelMax] = useState<string>(
    String(t.editorial_level_max ?? t.level_max ?? ""),
  );
  const [excluded, setExcluded] = useState(t.editorial_excluded === 1);
  const [localError, setLocalError] = useState<string | null>(null);
  const num = (v: string): number | null => (v.trim() === "" ? null : Number(v.trim()));
  return (
    <CmsDialog open onClose={props.onClose} title={`Override tier ${t.tier} (${t.rarity})`}>
      <div className="space-y-4">
        <p className="text-xs opacity-70">
          Reference: power {fmtRange(t.power_min, t.power_max)} · level{" "}
          {fmtRange(t.level_min, t.level_max)}. Leave a field empty to clear its override and
          restore the reference value.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <CmsField label="Power min" description="Reference: ">
            <input
              className="cc-input"
              inputMode="numeric"
              value={String(powerMin ?? "")}
              onChange={(e) => setPowerMin(e.target.value)}
              placeholder={t.power_min === null ? "—" : String(t.power_min)}
            />
          </CmsField>
          <CmsField label="Power max">
            <input
              className="cc-input"
              inputMode="numeric"
              value={String(powerMax ?? "")}
              onChange={(e) => setPowerMax(e.target.value)}
              placeholder={t.power_max === null ? "—" : String(t.power_max)}
            />
          </CmsField>
          <CmsField label="Level min">
            <input
              className="cc-input"
              inputMode="numeric"
              value={String(levelMin ?? "")}
              onChange={(e) => setLevelMin(e.target.value)}
              placeholder={t.level_min === null ? "—" : String(t.level_min)}
            />
          </CmsField>
          <CmsField label="Level max">
            <input
              className="cc-input"
              inputMode="numeric"
              value={String(levelMax ?? "")}
              onChange={(e) => setLevelMax(e.target.value)}
              placeholder={t.level_max === null ? "—" : String(t.level_max)}
            />
          </CmsField>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={excluded}
            onChange={(e) => setExcluded(e.target.checked)}
          />
          Exclude this tier from public output (stays in the database, restorable)
        </label>
        {localError ? (
          <p className="text-sm text-[var(--cc-danger)]" role="alert">
            {localError}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-between gap-2">
          <button
            type="button"
            className="cc-btn cc-btn-ghost cc-btn-sm"
            disabled={props.busy}
            onClick={() => props.onExclude(excluded)}
          >
            {excluded ? "Restore" : "Apply exclusion"}
          </button>
          <div className="flex gap-2">
            <button type="button" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={props.onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="cc-btn cc-btn-primary cc-btn-sm"
              disabled={props.busy}
              onClick={() => {
                const pMin = num(powerMin);
                const pMax = num(powerMax);
                const lMin = num(levelMin);
                const lMax = num(levelMax);
                for (const [label, v] of [
                  ["Power min", pMin],
                  ["Power max", pMax],
                  ["Level min", lMin],
                  ["Level max", lMax],
                ] as const) {
                  if (v !== null && (!Number.isInteger(v) || v < 0)) {
                    setLocalError(`${label} must be a whole number ≥ 0.`);
                    return;
                  }
                }
                if (pMin !== null && pMax !== null && pMin > pMax) {
                  setLocalError("Power min cannot exceed power max.");
                  return;
                }
                if (lMin !== null && lMax !== null && lMin > lMax) {
                  setLocalError("Level min cannot exceed level max.");
                  return;
                }
                props.onSave(
                  {
                    editorialPowerMin: pMin,
                    editorialPowerMax: pMax,
                    editorialLevelMin: lMin,
                    editorialLevelMax: lMax,
                  },
                  excluded,
                );
              }}
            >
              {props.busy ? "Saving…" : "Save override"}
            </button>
          </div>
        </div>
      </div>
    </CmsDialog>
  );
}

function CostOverrideDialog(props: {
  cost: EditableCostRow;
  busy: boolean;
  onClose: () => void;
  onSave: (amount: number | null, excluded: boolean) => void;
  onExclude: (excluded: boolean) => void;
}) {
  const c = props.cost;
  // String while editing ("" = cleared); parsed + validated on save so NaN
  // can never reach the persistence payload.
  const [amount, setAmount] = useState<string>(String(c.editorial_amount ?? c.amount ?? ""));
  const [excluded, setExcluded] = useState(c.editorial_excluded === 1);
  const [localError, setLocalError] = useState<string | null>(null);
  return (
    <CmsDialog open onClose={props.onClose} title={`Override ${c.resource_name} (${c.kind})`}>
      <div className="space-y-4">
        <p className="text-xs opacity-70">
          {c.rarity} · {c.scope === "total" ? "total to max" : `tier ${c.tier}`} · {c.kind}.
          Reference amount: {c.amount.toLocaleString("en-US")}. Leave empty to clear the override
          and restore the reference value.
        </p>
        <CmsField label="Amount">
          <input
            className="cc-input"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(c.amount)}
          />
        </CmsField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={excluded}
            onChange={(e) => setExcluded(e.target.checked)}
          />
          Exclude this cost from public output (stays in the database, restorable)
        </label>
        {localError ? (
          <p className="text-sm text-[var(--cc-danger)]" role="alert">
            {localError}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-between gap-2">
          <button
            type="button"
            className="cc-btn cc-btn-ghost cc-btn-sm"
            disabled={props.busy}
            onClick={() => props.onExclude(excluded)}
          >
            {excluded ? "Restore" : "Apply exclusion"}
          </button>
          <div className="flex gap-2">
            <button type="button" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={props.onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="cc-btn cc-btn-primary cc-btn-sm"
              disabled={props.busy}
              onClick={() => {
                const trimmed = amount.trim();
                const a = trimmed === "" ? null : Number(trimmed);
                if (a !== null && (!Number.isInteger(a) || a < 0 || !Number.isFinite(a))) {
                  setLocalError("Amount must be a whole number ≥ 0.");
                  return;
                }
                props.onSave(a, excluded);
              }}
            >
              {props.busy ? "Saving…" : "Save override"}
            </button>
          </div>
        </div>
      </div>
    </CmsDialog>
  );
}

function AddTierDialog(props: {
  heroContentId: string;
  busy: boolean;
  onClose: () => void;
  onSave: (input: {
    heroContentId: string;
    rarity: string;
    tier: number;
    powerMin?: number | null;
    powerMax?: number | null;
    levelMin?: number | null;
    levelMax?: number | null;
  }) => void;
}) {
  const [rarity, setRarity] = useState("common");
  const [tier, setTier] = useState("1");
  const [powerMin, setPowerMin] = useState("");
  const [powerMax, setPowerMax] = useState("");
  const [levelMin, setLevelMin] = useState("");
  const [levelMax, setLevelMax] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  return (
    <CmsDialog open onClose={props.onClose} title="Add progression tier">
      <div className="space-y-4">
        <p className="text-xs opacity-70">
          Creates an editor-owned tier (`data_source = 'editorial'`) that the reference sync will
          not overwrite or recreate.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <CmsField label="Rarity">
            <CmsSelect
              id="add-tier-rarity"
              value={rarity}
              onChange={setRarity}
              width="full"
              options={["common", "uncommon", "rare", "epic", "legendary", "mythic"].map((r) => ({
                value: r,
                label: r,
              }))}
            />
          </CmsField>
          <CmsField label="Tier" description="1-based; total rows are not tiers.">
            <input
              className="cc-input"
              inputMode="numeric"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            />
          </CmsField>
          <CmsField label="Power min (optional)">
            <input
              className="cc-input"
              inputMode="numeric"
              value={powerMin}
              onChange={(e) => setPowerMin(e.target.value)}
            />
          </CmsField>
          <CmsField label="Power max (optional)">
            <input
              className="cc-input"
              inputMode="numeric"
              value={powerMax}
              onChange={(e) => setPowerMax(e.target.value)}
            />
          </CmsField>
          <CmsField label="Level min (optional)">
            <input
              className="cc-input"
              inputMode="numeric"
              value={levelMin}
              onChange={(e) => setLevelMin(e.target.value)}
            />
          </CmsField>
          <CmsField label="Level max (optional)">
            <input
              className="cc-input"
              inputMode="numeric"
              value={levelMax}
              onChange={(e) => setLevelMax(e.target.value)}
            />
          </CmsField>
        </div>
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
            disabled={props.busy}
            onClick={() => {
              const n = Number(tier);
              if (!Number.isInteger(n) || n < 1 || !Number.isFinite(n)) {
                setLocalError("Tier must be a whole number ≥ 1.");
                return;
              }
              // Server contract uses `number | null` (null = no value);
              // undefined would violate exactOptionalPropertyTypes.
              const opt = (v: string): number | null => (v.trim() === "" ? null : Number(v.trim()));
              const nums = [opt(powerMin), opt(powerMax), opt(levelMin), opt(levelMax)];
              if (nums.some((v) => v !== null && (!Number.isInteger(v) || v < 0))) {
                setLocalError("Numeric fields must be whole numbers ≥ 0.");
                return;
              }
              props.onSave({
                heroContentId: props.heroContentId,
                rarity,
                tier: n,
                powerMin: opt(powerMin),
                powerMax: opt(powerMax),
                levelMin: opt(levelMin),
                levelMax: opt(levelMax),
              });
            }}
          >
            {props.busy ? "Adding…" : "Add tier"}
          </button>
        </div>
      </div>
    </CmsDialog>
  );
}

function AddCostDialog(props: {
  heroContentId: string;
  busy: boolean;
  onClose: () => void;
  onSave: (input: {
    heroContentId: string;
    rarity: string;
    scope: string;
    tier: number;
    kind: string;
    resourceId: string;
    amount: number;
  }) => void;
}) {
  const [rarity, setRarity] = useState("common");
  const [scope, setScope] = useState("tier");
  const [tier, setTier] = useState("1");
  const [kind, setKind] = useState("evolve");
  const [resourceId, setResourceId] = useState("");
  const [resources, setResources] = useState<
    Awaited<ReturnType<typeof listAdminCatalogResources>>["items"]
  >([]);
  const [amount, setAmount] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listAdminCatalogResources({ data: { limit: 100, offset: 0 } })
      .then((r) => {
        if (!cancelled) {
          setResources(r.items);
          const first = r.items[0];
          if (r.items.length > 0 && first) setResourceId(first.id);
        }
      })
      .catch(() => {
        if (!cancelled) setLocalError("Failed to load catalog items.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CmsDialog open onClose={props.onClose} title="Add cost row">
      <div className="space-y-4">
        <p className="text-xs opacity-70">
          Creates an editor-owned cost row (`data_source = 'editorial'`) that the reference sync
          will not overwrite or recreate.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <CmsField label="Rarity">
            <CmsSelect
              id="add-cost-rarity"
              value={rarity}
              onChange={setRarity}
              width="full"
              options={["common", "uncommon", "rare", "epic", "legendary", "mythic"].map((r) => ({
                value: r,
                label: r,
              }))}
            />
          </CmsField>
          <CmsField label="Scope">
            <CmsSelect
              id="add-cost-scope"
              value={scope}
              onChange={(v) => {
                setScope(v);
                setTier(v === "total" ? "0" : "1");
              }}
              width="full"
              options={[
                { value: "tier", label: "Tier (evolve into this tier)" },
                { value: "total", label: "Total (tier 1 → max summary)" },
              ]}
            />
          </CmsField>
          {scope === "tier" ? (
            <CmsField label="Tier" description="The tier being evolved into (1-based).">
              <input
                className="cc-input"
                inputMode="numeric"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
              />
            </CmsField>
          ) : null}
          <CmsField label="Kind">
            <CmsSelect
              id="add-cost-kind"
              value={kind}
              onChange={setKind}
              width="full"
              options={[
                { value: "evolve", label: "Evolve" },
                { value: "recycle", label: "Recycle" },
                { value: "upgrade_rarity", label: "Upgrade rarity" },
              ]}
            />
          </CmsField>
          <CmsField label="Catalog item" description="Shared resource from the Game Item Catalog.">
            <CmsSelect
              id="add-cost-resource"
              value={resourceId}
              onChange={setResourceId}
              width="full"
              options={resources.map((r) => ({ value: r.id, label: r.effective_name }))}
            />
          </CmsField>
          <CmsField label="Amount">
            <input
              className="cc-input"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </CmsField>
        </div>
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
            disabled={props.busy}
            onClick={() => {
              const a = Number(amount);
              if (!Number.isInteger(a) || a < 0) {
                setLocalError("Amount must be a whole number ≥ 0.");
                return;
              }
              if (!resourceId) {
                setLocalError("Choose a catalog item.");
                return;
              }
              if (scope === "tier") {
                const n = Number(tier);
                if (!Number.isInteger(n) || n < 1) {
                  setLocalError("Tier must be a whole number ≥ 1.");
                  return;
                }
                props.onSave({
                  heroContentId: props.heroContentId,
                  rarity,
                  scope,
                  tier: n,
                  kind,
                  resourceId,
                  amount: a,
                });
              } else {
                props.onSave({
                  heroContentId: props.heroContentId,
                  rarity,
                  scope,
                  tier: 0,
                  kind,
                  resourceId,
                  amount: a,
                });
              }
            }}
          >
            {props.busy ? "Adding…" : "Add cost"}
          </button>
        </div>
      </div>
    </CmsDialog>
  );
}

function ReferencePanel({ hero }: { hero: HeroDetail }) {
  const ref = hero.reference;
  const hasAny =
    ref.perks.length > 0 || ref.rarities.length > 0 || ref.costRows > 0 || hero.stwRefSlug !== null;
  return (
    <CmsFormSection
      title="Reference data (synced)"
      description="Written by the reference sync, not editable here. Editorial fields are in the sections above."
      data-testid="hero-reference-panel"
    >
      {!hasAny ? (
        <CmsNotice kind="info">
          No reference data synced for this hero yet. Run scripts/sync-heroes-reference.mjs against
          the reference snapshot.
        </CmsNotice>
      ) : (
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source
            </dt>
            <dd className="mt-0.5 font-mono text-xs">{hero.dataSource}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reference slug
            </dt>
            <dd className="mt-0.5 font-mono text-xs">{hero.stwRefSlug ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Snapshot
            </dt>
            <dd className="mt-0.5 font-mono text-xs">
              {hero.dataSnapshotAt ? hero.dataSnapshotAt.slice(0, 10) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cost rows
            </dt>
            <dd className="mt-0.5 font-mono text-xs tabular-nums">{ref.costRows}</dd>
          </div>
        </dl>
      )}

      {ref.perks.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Perks
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {ref.perks.map((p) => (
              <li key={p.key} className="text-sm">
                <span className="text-xs uppercase text-muted-foreground">{p.slot}</span>{" "}
                <span className="font-medium">{p.name}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground">{p.key}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ref.rarities.length > 0 ? (
        <HeroEditorEvolutionSection progression={ref.progression} hero={hero} />
      ) : (
        // An explicit unknown-vs-zero distinction. No rows is a DATA fact (this
        // hero has no synced progression), not a zero cost — and the panel must
        // say which it is rather than leave the editor guessing.
        <CmsNotice kind="info">
          No evolution data synced for this hero. The public page shows an empty progression section
          rather than invented costs.
        </CmsNotice>
      )}
    </CmsFormSection>
  );
}

/**
 * Read-only evolution inspection for the hero editor (W7).
 *
 * This is the same `progression` object the public pages render — folded by the
 * same `buildProgression` — so what an editor sees here IS what a player will
 * see. Nothing here is a form field; normal hero saves never touch
 * `hero_progression`/`hero_progression_costs`, so saving an identity or an
 * image cannot overwrite synced costs.
 *
 * A tier with no `evolve` entries is the TOP tier (no further evolution), which
 * the table states explicitly rather than leaving a blank cell. A tier whose
 * power range is null shows an em-dash: the source has no value there, which is
 * a different fact from a zero.
 */
function HeroEditorEvolutionSection(props: {
  progression: HeroDetail["reference"]["progression"];
  hero: HeroDetail;
}) {
  const { progression, hero } = props;
  if (progression === null) {
    return (
      <CmsNotice kind="info">
        No evolution data synced for this hero. The public page shows an empty progression section
        rather than invented costs.
      </CmsNotice>
    );
  }
  return (
    <div className="mt-4 space-y-4">
      {progression.rarities.map((rarity) => (
        <div
          key={rarity.rarity}
          className="cc-panel p-3"
          data-testid={`hero-evolution-${rarity.rarity}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold capitalize">{rarity.rarity}</h3>
            <p className="text-xs tabular-nums opacity-60">
              {rarity.tiers.length} tiers · max power {rarity.tiers.at(-1)?.powerMax ?? "—"}
            </p>
          </div>

          <table className="cc-table mt-2 w-full">
            <thead>
              <tr>
                <th scope="col">Tier</th>
                <th scope="col">Power</th>
                <th scope="col">Level</th>
                <th scope="col">Evolve to next</th>
              </tr>
            </thead>
            <tbody>
              {rarity.tiers.map((tier) => {
                const isTop = tier.tier === rarity.tiers.at(-1)?.tier;
                return (
                  <tr key={tier.tier}>
                    <td className="tabular-nums font-semibold">{tier.tier}</td>
                    <td className="tabular-nums">
                      {tier.powerMin === null && tier.powerMax === null
                        ? "—"
                        : `${tier.powerMin ?? "—"}–${tier.powerMax ?? "—"}`}
                    </td>
                    <td className="tabular-nums">
                      {tier.levelMin === null && tier.levelMax === null
                        ? "—"
                        : `${tier.levelMin ?? "—"}–${tier.levelMax ?? "—"}`}
                    </td>
                    <td>
                      {tier.evolve.length === 0 ? (
                        <span className="text-xs opacity-60">
                          {isTop ? "Final tier — no further evolution." : "—"}
                        </span>
                      ) : (
                        <ul className="flex flex-wrap gap-1">
                          {tier.evolve.map((cost) => (
                            <li
                              key={cost.resourceKey}
                              className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs tabular-nums cc-hairline"
                            >
                              <span className="font-semibold">
                                {cost.amount.toLocaleString("en-US")}
                              </span>
                              <span className="opacity-80">{cost.name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {rarity.total.length > 0 ? (
            <div className="mt-2 rounded-md border p-2.5 cc-hairline">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-60">
                Total to max
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {rarity.total.map((cost) => (
                  <li
                    key={cost.resourceKey}
                    className="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[13px] tabular-nums cc-hairline"
                  >
                    <span className="font-semibold">{cost.amount.toLocaleString("en-US")}</span>
                    <span className="opacity-80">{cost.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {rarity.recycle.length > 0 ? (
            <div className="mt-2 rounded-md border p-2.5 cc-hairline">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-60">
                Recycling returns
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {rarity.recycle.map((cost) => (
                  <li
                    key={`${cost.resourceKey}-${cost.amount}`}
                    className="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[13px] tabular-nums cc-hairline"
                  >
                    <span className="font-semibold">{cost.amount.toLocaleString("en-US")}</span>
                    <span className="opacity-80">{cost.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-2 text-xs opacity-55">
            Synced reference data — snapshot{" "}
            <span className="font-mono">{hero.dataSnapshotAt?.slice(0, 10) ?? "unknown"}</span>.
            Saving this hero never modifies these costs.
          </p>
        </div>
      ))}
    </div>
  );
}

function IdentityForm(props: {
  hero: HeroDetail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const hero = props.hero;
  const [heroClass, setHeroClass] = useState(hero.heroClass);
  const [category, setCategory] = useState(hero.category ?? "");
  const [rarity, setRarity] = useState((hero as { rarity?: string | null }).rarity ?? "");
  const [popularity, setPopularity] = useState(String(hero.popularity));
  const [sortOrder, setSortOrder] = useState(String(hero.sortOrder));
  const [summary, setSummary] = useState(hero.summary ?? "");

  /**
   * The optimistic-concurrency token, held in state so a successful save can
   * replace it with the token the server just wrote.
   *
   * This is the fix for the reported "Save identity doesn't stick" behaviour.
   * Every update re-stamps `hero_records.updated_at`, but the previous code
   * sent the RENDER-time token forever. So save #1 succeeded, save #2 threw
   * "This hero was changed by another editor while you were editing" — even
   * though the editor was the only one who had changed anything — and the
   * Summary they had just retyped was never written. A refresh then showed the
   * save-#1 value, which reads exactly like "the field does not persist".
   */
  const [concurrencyToken, setConcurrencyToken] = useState<string | null>(hero.recordUpdatedAt);

  return (
    <CmsFormSection
      title="Identity"
      description="Class, category, rarity, and discovery ordering. Media references live in their own section below."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              const result = await updateAdminHero({
                data: {
                  contentId: hero.contentId,
                  heroClass,
                  category: category === "" ? null : category,
                  rarity: rarity === "" ? null : rarity,
                  popularity: Number(popularity),
                  sortOrder: Number(sortOrder),
                  // The server owns normalization (trim, empty -> null, length
                  // cap). Sending null explicitly is what CLEARS a stored
                  // summary; omitting the field would preserve the old one.
                  summary,
                  // Optimistic concurrency: reject the write if another editor
                  // changed this record since the last successful save.
                  expectedUpdatedAt: concurrencyToken,
                },
              });
              // Adopt the server's fresh token so the next save from this same
              // page is compared against what is actually in the database.
              setConcurrencyToken(result.recordUpdatedAt);
              return "Identity saved.";
            })
          }
        >
          {props.pending ? "Saving…" : "Save identity"}
        </button>
      }
    >
      {/*
        Layout: the Summary helper used to wrap to three lines, which pushed its
        input far below the Class control beside it. The row now aligns on a
        single description band for every field (`alignControl` reserves one
        line), and no field carries a second paragraph under its input — that
        per-field extra text is what made the heights unequal again.
      */}
      <div className="grid gap-4 sm:grid-cols-2">
        <CmsField
          label="Summary"
          alignControl
          description="One short line for cards and Quick View."
        >
          <input
            id="hero-summary"
            className="cc-input"
            value={summary}
            onChange={(e) => setSummary(e.currentTarget.value)}
            disabled={props.disabled}
            maxLength={HERO_SUMMARY_MAX_LENGTH}
          />
        </CmsField>
        <CmsField label="Class" alignControl description="Soldier, constructor, ninja, outlander.">
          <CmsSelect
            id="hero-class"
            value={heroClass}
            onChange={setHeroClass}
            disabled={props.disabled}
            width="full"
            options={[
              { value: "soldier", label: "Soldier" },
              { value: "constructor", label: "Constructor" },
              { value: "ninja", label: "Ninja" },
              { value: "outlander", label: "Outlander" },
            ]}
          />
        </CmsField>
        <CmsField label="Category" alignControl description="Gameplay role used by public filters.">
          <CmsSelect
            id="hero-category"
            value={category}
            onChange={setCategory}
            disabled={props.disabled}
            width="full"
            options={[
              { value: "", label: "None" },
              { value: "assault", label: "Assault" },
              { value: "support", label: "Support" },
              { value: "recon", label: "Recon" },
              { value: "defense", label: "Defense" },
              { value: "special", label: "Special" },
            ]}
          />
        </CmsField>
        <CmsField label="Rarity" alignControl description="Editorial rarity for public filters.">
          <CmsSelect
            id="hero-rarity"
            value={rarity}
            onChange={setRarity}
            disabled={props.disabled}
            width="full"
            options={[
              { value: "", label: "Unclassified" },
              { value: "common", label: "Common" },
              { value: "uncommon", label: "Uncommon" },
              { value: "rare", label: "Rare" },
              { value: "epic", label: "Epic" },
              { value: "legendary", label: "Legendary" },
              { value: "mythic", label: "Mythic" },
            ]}
          />
        </CmsField>
        <CmsField label="Popularity" alignControl description="Higher ranks first in listings.">
          <input
            className="cc-input"
            value={popularity}
            inputMode="numeric"
            onChange={(e) => setPopularity(e.target.value)}
            disabled={props.disabled}
          />
        </CmsField>
        <CmsField label="Sort order" alignControl description="Tie-breaker within a popularity.">
          <input
            className="cc-input"
            value={sortOrder}
            inputMode="numeric"
            onChange={(e) => setSortOrder(e.currentTarget.value)}
            disabled={props.disabled}
          />
        </CmsField>
      </div>
    </CmsFormSection>
  );
}

/**
 * Object-level media for a hero. Split out of IdentityForm (Wave 1 fix pass):
 * a live preview is several times taller than a metadata input, so keeping it
 * in the Identity grid stretched whole rows and broke the field pairing. The
 * save path is unchanged — still `updateAdminHero`, still the same two columns.
 */
function MediaForm(props: {
  hero: HeroDetail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const hero = props.hero;
  const [portraitAssetId, setPortraitAssetId] = useState(hero.portraitAssetId ?? "");
  const [bannerAssetId, setBannerAssetId] = useState(hero.bannerAssetId ?? "");
  return (
    <CmsMediaSection>
      <CmsMediaField
        label="Portrait asset id"
        description="Shown on hero cards and the public hero page."
        value={portraitAssetId}
        onChange={setPortraitAssetId}
        disabled={props.disabled}
        folder="heroes"
      />
      <CmsMediaField
        label="Banner asset id"
        description="Wide hero artwork. Optional."
        value={bannerAssetId}
        onChange={setBannerAssetId}
        disabled={props.disabled}
        folder="heroes"
      />
      <div className="flex justify-end">
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              await updateAdminHero({
                data: {
                  contentId: hero.contentId,
                  portraitAssetId: portraitAssetId.trim() === "" ? null : portraitAssetId.trim(),
                  bannerAssetId: bannerAssetId.trim() === "" ? null : bannerAssetId.trim(),
                },
              });
              return "Media saved.";
            })
          }
        >
          {props.pending ? "Saving…" : "Save media"}
        </button>
      </div>
    </CmsMediaSection>
  );
}

function TranslationForm(props: {
  hero: HeroDetail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const hero = props.hero;
  const [locale, setLocale] = useState(hero.defaultLocale);
  const active = hero.translations.find((t) => t.locale === locale) ?? hero.translations[0];
  const [title, setTitle] = useState(active?.title ?? "");
  const [body, setBody] = useState(active?.body ?? "");
  const [seoTitle, setSeoTitle] = useState(active?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(active?.seoDescription ?? "");
  // translation_status gates BOTH the hreflang alternates and the sitemap
  // entry, so it must be settable from the editor.
  const [translationStatus, setTranslationStatus] = useState(active?.translationStatus ?? "draft");

  return (
    <CmsFormSection
      title="Content & translations"
      description="Per-locale title, description, and SEO metadata. Switching locale never clobbers another locale's text."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              if (title.trim() === "") throw new Error("Title is required.");
              await upsertAdminTranslation({
                data: {
                  contentId: hero.contentId,
                  locale,
                  title: title.trim(),
                  body,
                  seoTitle: seoTitle.trim() === "" ? null : seoTitle.trim(),
                  seoDescription: seoDescription.trim() === "" ? null : seoDescription.trim(),
                  translationStatus,
                },
              });
              return `Translation saved (${locale}).`;
            })
          }
        >
          {props.pending ? "Saving…" : "Save translation"}
        </button>
      }
    >
      <CmsField label="Locale" description={`Saved locales: ${hero.locales.join(", ") || "none"}.`}>
        <CmsSelect
          id="hero-locale"
          value={locale}
          disabled={props.disabled}
          onChange={(v) => {
            setLocale(v);
            const t = hero.translations.find((x) => x.locale === v);
            setTitle(t?.title ?? "");
            setBody(t?.body ?? "");
            setSeoTitle(t?.seoTitle ?? "");
            setSeoDescription(t?.seoDescription ?? "");
          }}
          width="full"
          options={LOCALES.map((l) => ({ value: l, label: l }))}
        />
      </CmsField>
      <CmsField label="Title" description="Public display name for this locale.">
        <input
          className="cc-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={props.disabled}
        />
      </CmsField>
      <CmsField label="Description" description="Body text shown on the public hero page.">
        <textarea
          className="cc-input"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={props.disabled}
        />
      </CmsField>
      <div className="grid gap-4 sm:grid-cols-2">
        <CmsField
          label="Translation status"
          description="Complete advertises this locale in hreflang and includes it in the sitemap. Draft keeps it out of both."
        >
          <CmsSelect
            id="hero-translation-status"
            value={translationStatus}
            onChange={setTranslationStatus}
            disabled={props.disabled}
            width="full"
            options={[
              { value: "draft", label: "Draft" },
              { value: "complete", label: "Complete" },
            ]}
          />
        </CmsField>
        <CmsField label="SEO title" description="Optional override, plain text.">
          <input
            className="cc-input"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            disabled={props.disabled}
          />
        </CmsField>
        <CmsField label="SEO description" description="Optional override, plain text.">
          <input
            className="cc-input"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            disabled={props.disabled}
          />
        </CmsField>
      </div>
    </CmsFormSection>
  );
}

/**
 * Abilities for this hero: key, per-locale translations, and the per-hero icon
 * override (migration 0007 column, read by the public loaders since this
 * screen gained the picker).
 *
 * The icon is saved through `upsertAdminAbility` with ONLY `iconAssetId`
 * supplied. That is deliberate: the mutation is a partial update, so picking an
 * icon cannot reset the ability's ordering, and the ability's name/description
 * translations live in a different table that this path never writes. Leaving
 * the icon empty is valid — the shared `ability_defs.icon_asset_id` then
 * decides what the public page shows.
 */
function AbilitiesForm(props: {
  hero: HeroDetail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const hero = props.hero;
  const [abilityKey, setAbilityKey] = useState("");
  const [abilityName, setAbilityName] = useState("");

  return (
    <CmsFormSection
      title={`Abilities (${hero.abilities.length})`}
      description="Named keys with per-locale translations. Removing an ability removes its translations and cannot be undone."
    >
      {hero.abilities.length === 0 ? (
        <p className="text-sm opacity-70">No abilities yet.</p>
      ) : (
        <ul className="divide-y divide-white/5" data-testid="hero-abilities-editor">
          {hero.abilities.map((ability) => (
            <li key={ability.id} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{ability.abilityKey}</span>
                <span className="text-xs opacity-60">
                  {ability.translations.map((t) => `${t.locale}:${t.name}`).join(" · ") ||
                    "untranslated"}
                </span>
                <button
                  type="button"
                  className="cc-btn cc-btn-ghost cc-btn-sm ms-auto"
                  disabled={props.disabled || props.pending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove ability ${ability.abilityKey}? Its translations go with it; this cannot be undone.`,
                      )
                    ) {
                      void props.run(async () => {
                        await deleteAdminAbility({ data: { abilityId: ability.id } });
                        window.location.reload();
                        return "Ability removed.";
                      });
                    }
                  }}
                >
                  Remove
                </button>
              </div>
              <CmsMediaField
                label={`${ability.abilityKey} icon`}
                description="Per-hero override. Leave empty to use the shared icon for this ability."
                value={ability.iconAssetId ?? ""}
                onChange={(value) => {
                  const next = value.trim() === "" ? null : value.trim();
                  void props.run(async () => {
                    await upsertAdminAbility({
                      data: {
                        heroContentId: hero.contentId,
                        abilityKey: ability.abilityKey,
                        iconAssetId: next,
                      },
                    });
                    window.location.reload();
                    return next === null ? "Ability icon cleared." : "Ability icon saved.";
                  });
                }}
                disabled={props.disabled || props.pending}
                folder="abilities"
                previewClassName="h-12 w-12"
              />
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2 border-t pt-3 cc-hairline">
        <CmsField label="Ability key">
          <input
            className="cc-input font-mono"
            value={abilityKey}
            onChange={(e) => setAbilityKey(e.target.value)}
            placeholder="ability key"
            disabled={props.disabled}
          />
        </CmsField>
        <CmsField label="Ability name (default locale)">
          <input
            className="cc-input"
            value={abilityName}
            onChange={(e) => setAbilityName(e.target.value)}
            placeholder="ability name"
            disabled={props.disabled}
          />
        </CmsField>
        <button
          type="button"
          className="cc-btn cc-btn-outline cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              if (abilityKey.trim() === "") throw new Error("Ability key is required.");
              const trimmed = abilityName.trim();
              await upsertAdminAbility({
                data: {
                  heroContentId: hero.contentId,
                  abilityKey: abilityKey.trim(),
                  ...(trimmed === "" ? {} : { name: trimmed }),
                  locale: hero.defaultLocale,
                },
              });
              setAbilityKey("");
              setAbilityName("");
              window.location.reload();
              return "Ability saved.";
            })
          }
        >
          Add ability
        </button>
      </div>
    </CmsFormSection>
  );
}

function PerkSlotCard(props: {
  slot: "standard" | "commander";
  label: string;
  description: string;
  hero: HeroDetail;
  assigned: PerkSlotAssignment;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
  refresh: () => Promise<void>;
}) {
  const { slot } = props;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLocale, setCreateLocale] = useState("en");
  const [confirmClear, setConfirmClear] = useState(false);

  const assigned = props.assigned;

  return (
    <div className="cc-panel p-3" data-testid={`hero-perk-slot-${slot}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{props.label}</h3>
          <p className="mt-0.5 text-xs leading-relaxed opacity-65">{props.description}</p>
        </div>
      </div>

      {assigned === null ? (
        /*
          THE FIX for the dead end. This is the state the old panel left with no
          way out; it is now the primary call to action, not a shrug.
        */
        <div className="mt-3 space-y-2">
          <p className="text-sm opacity-70">No perk assigned to this slot.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="cc-btn cc-btn-outline cc-btn-sm"
              disabled={props.disabled || props.pending}
              onClick={() => setPickerOpen(true)}
            >
              Assign a perk…
            </button>
            <button
              type="button"
              className="cc-btn cc-btn-ghost cc-btn-sm"
              disabled={props.disabled || props.pending}
              onClick={() => setCreateOpen(true)}
            >
              Create new…
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <dl className="space-y-1 text-[13px]">
            <div className="flex gap-2">
              <dt className="shrink-0 opacity-60">Assigned</dt>
              <dd className="min-w-0 font-medium">{assigned.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 opacity-60">Key</dt>
              <dd className="min-w-0 font-mono text-xs break-all">{assigned.key}</dd>
            </div>
            {/*
              SHARED BY EVERY HERO using this definition. The premise is that a
              definition is game-wide, so editing its text affects all of them.
            */}
            <div className="flex gap-2">
              <dt className="shrink-0 opacity-60">Scope</dt>
              <dd className="text-xs opacity-80">
                Shared definition — editing its name or description affects every hero using it.
              </dd>
            </div>
          </dl>

          <CmsMediaField
            label={`${props.label} image`}
            description={(() => {
              if (assigned.iconAssetId !== null) {
                return "This hero's own image for this perk.";
              }
              if (assigned.defIconAssetId !== null) {
                return "This hero uses the perk's shared image. Setting one here overrides it only for this hero.";
              }
              return "No image on this hero and none shared by the perk itself.";
            })()}
            value={assigned.iconAssetId ?? ""}
            onChange={(value) => {
              const next = value.trim() === "" ? null : value.trim();
              void props.run(async () => {
                await upsertAdminHeroPerkIcon({
                  data: {
                    contentId: props.hero.contentId,
                    heroPerkId: assigned.id,
                    iconAssetId: next,
                  },
                });
                await props.refresh();
                return next === null ? "Perk image cleared." : "Perk image saved.";
              });
            }}
            disabled={props.disabled || props.pending}
            folder="perks"
            previewClassName="h-12 w-12"
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="cc-btn cc-btn-outline cc-btn-sm"
              disabled={props.disabled || props.pending}
              onClick={() => setPickerOpen(true)}
            >
              Replace…
            </button>
            <button
              type="button"
              className="cc-btn cc-btn-danger-outline cc-btn-sm"
              disabled={props.disabled || props.pending}
              onClick={() => setConfirmClear(true)}
            >
              Clear slot
            </button>
          </div>
        </div>
      )}

      <CmsDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={`Assign a ${slot} perk`}
        size="lg"
      >
        <HeroPerkDefinitionPicker
          slot={slot}
          disabled={props.disabled}
          onSelect={(perkDefId, name) => {
            void props.run(async () => {
              await assignAdminHeroPerk({
                data: {
                  contentId: props.hero.contentId,
                  slot,
                  perkDefId,
                  replace: true,
                },
              });
              await props.refresh();
              return `${name} assigned as the ${slot} perk.`;
            });
            setPickerOpen(false);
          }}
        />
      </CmsDialog>

      <CmsDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`Create a new ${slot} perk definition`}
      >
        <div className="space-y-4">
          <CmsField label="Name" description="Shown on cards and the public hero page.">
            <input
              className="cc-input"
              value={createName}
              onChange={(e) => setCreateName(e.currentTarget.value)}
              placeholder="Perk name"
            />
          </CmsField>
          <CmsField label="Description" description="Optional. Plain text for the quick view.">
            <textarea
              className="cc-input min-h-24"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.currentTarget.value)}
            />
          </CmsField>
          <CmsField label="Locale" description="Which language this text is written in.">
            <CmsSelect
              id={`perk-create-locale-${slot}`}
              value={createLocale}
              onChange={setCreateLocale}
              width="full"
              options={LOCALES.map((l) => ({ value: l, label: l }))}
            />
          </CmsField>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="cc-btn cc-btn-ghost cc-btn-sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cc-btn cc-btn-primary cc-btn-sm"
              disabled={props.disabled || props.pending}
              onClick={() => {
                void props.run(async () => {
                  await assignAdminHeroPerk({
                    data: {
                      contentId: props.hero.contentId,
                      slot,
                      create: {
                        displayName: createName,
                        description: createDescription,
                        descriptionLocale: createLocale,
                      },
                      replace: true,
                    },
                  });
                  await props.refresh();
                  return `Created and assigned the ${slot} perk.`;
                });
                setCreateOpen(false);
              }}
            >
              Create and assign
            </button>
          </div>
        </div>
      </CmsDialog>

      <CmsConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          void props.run(async () => {
            await assignAdminHeroPerk({
              data: { contentId: props.hero.contentId, slot, clear: true },
            });
            await props.refresh();
            return `${props.label} cleared.`;
          });
          setConfirmClear(false);
        }}
        pending={props.pending}
        tone="danger"
        title={`Clear the ${slot} perk?`}
        body={`This hero will no longer carry a ${slot} perk. The shared perk definition itself stays available to other heroes.`}
        confirmLabel="Clear slot"
      />
    </div>
  );
}

/** One assignment surfaced to a slot card. */
type PerkSlotAssignment = NonNullable<HeroDetail["reference"]["perks"][number]> | null;

const PERK_SLOTS: ReadonlyArray<{
  slot: "standard" | "commander";
  label: string;
  description: string;
}> = [
  {
    slot: "standard",
    label: "Standard perk",
    description: "The hero's base perk, earned at rarity one.",
  },
  {
    slot: "commander",
    label: "Commander perk",
    description: "The stronger perk unlocked at maximum rarity.",
  },
];

/**
 * The two-slot perk editor.
 *
 * Each slot is an independent card so "assign a standard perk" can never be
 * confused with "assign a commander perk": the slot travels with every mutation
 * and is re-verified server-side against the definition's own slot.
 */
function PerkSlotPanel(props: {
  hero: HeroDetail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
  refresh: () => Promise<void>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PERK_SLOTS.map((slotDef) => (
        <PerkSlotCard
          key={slotDef.slot}
          slot={slotDef.slot}
          label={slotDef.label}
          description={slotDef.description}
          hero={props.hero}
          assigned={props.hero.reference.perks.find((p) => p.slot === slotDef.slot) ?? null}
          disabled={props.disabled}
          pending={props.pending}
          run={props.run}
          refresh={props.refresh}
        />
      ))}
    </div>
  );
}

/**
 * Definition picker for one slot.
 *
 * Loads the shared definitions of the right slot on open — never a full table
 * dump — and reports how many exist so an editor can tell "none exists yet"
 * (create one) from "I just cannot see it" (search).
 *
 * Only definitions whose own `slot` matches the requested slot can ever be
 * returned: the query itself is scoped by slot, and the server re-verifies the
 * pair on submission.
 */
function HeroPerkDefinitionPicker(props: {
  slot: "standard" | "commander";
  disabled: boolean;
  onSelect: (perkDefId: string, displayName: string) => void;
}) {
  const [items, setItems] = useState<
    Array<{
      id: string;
      perkKey: string;
      displayName: string;
      hasTranslation: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(
    async (term: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = await listAdminHeroPerkDefinitions({
          data: { slot: props.slot, search: term },
        });
        setItems(result.items);
        if (result.items.length === 0 && term.trim() !== "") {
          setLoadError(`No ${props.slot} perk matches “${term}”.`);
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Could not load perk definitions.");
      } finally {
        setLoading(false);
      }
    },
    [props.slot],
  );

  useEffect(() => {
    void load("");
  }, [load]);

  return (
    <div className="space-y-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void load(search);
        }}
      >
        <label className="sr-only" htmlFor="perk-picker-search">
          Search {props.slot} perks
        </label>
        <input
          id="perk-picker-search"
          className="cc-input"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder={`Search ${props.slot} perks…`}
        />
      </form>

      {loading ? (
        <p className="text-sm opacity-70">Loading definitions…</p>
      ) : items.length === 0 ? (
        <CmsNotice kind="info">
          No {props.slot} perk definitions exist for this hero's slot yet. Use{" "}
          <strong>Create new…</strong> to add one — it is shared by every hero that uses it.
        </CmsNotice>
      ) : (
        <CmsDataTable
          columns={[
            {
              key: "name",
              header: "Perk",
              render: (row) => (
                <div className="min-w-0">
                  <p className="font-medium">{row.displayName}</p>
                  <p className="font-mono text-xs truncate opacity-60">{row.perkKey}</p>
                </div>
              ),
            },
            {
              key: "assign",
              header: "Assign",
              label: "Assign",
              render: (row) => (
                <button
                  type="button"
                  className="cc-btn cc-btn-primary cc-btn-sm"
                  disabled={props.disabled}
                  onClick={() => props.onSelect(row.id, row.displayName)}
                >
                  Assign
                </button>
              ),
            },
          ]}
          rows={items}
          emptyTitle="No perks"
          emptyDescription="Nothing matches this search."
        />
      )}

      {loadError !== null ? <CmsNotice kind="warning">{loadError}</CmsNotice> : null}
    </div>
  );
}

/**
 * Re-render the editor from the database after a mutation.
 *
 * The old perk-image path called `window.location.reload()`. Re-invalidating
 * the route loader is equivalent for correctness (the whole editor is rendered
 * from `getAdminHero`) but keeps the navigation stack, the scroll position,
 * and the shell's own state.
 */
function useHeroEditorRefresh() {
  const router = useRouter();
  return useCallback(async () => {
    await router.invalidate();
  }, [router]);
}
