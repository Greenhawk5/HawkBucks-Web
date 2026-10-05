import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import { getContentByIdLite, getInventoryDetail } from "@/lib/cms/inventory-admin-detail.loader";
import {
  publishAdminInventoryContent,
  setAdminSchematicPerks,
  updateAdminSchematic,
  updateAdminTrap,
  updateAdminWeapon,
  upsertAdminPerkTranslation,
} from "@/lib/cms/schematics-admin.loader";
import { upsertAdminTranslation } from "@/lib/cms/heroes-admin.loader";
import { CmsRouteErrorStandalone, CmsRoutePending } from "@/components/cms/cc/CmsAuth";
import { CmsCard, CmsField, CmsNotice } from "@/components/cms/cc/CmsPrimitives";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";
import { CmsMediaField } from "@/components/cms/media/CmsMediaField";
import {
  CmsEditorFeedback,
  CmsEditorFrame,
  CmsFormSection,
  useCmsEditorState,
} from "@/components/cms/cc/CmsEditor";

export const Route = createFileRoute("/admin/inventory/$contentId")({
  loader: async ({ params }) => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, detail: null };
    const base = await getContentByIdLite({ data: { contentId: params.contentId } });
    const detail = await getInventoryDetail({ data: { contentId: params.contentId } });
    return { session, detail: { ...detail, entityType: base.entityType, status: base.status } };
  },
  head: () => ({
    meta: [
      { title: "Edit inventory item — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Edit inventory item" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Edit inventory item" backTo="/admin/inventory" error={error} />
  ),
  component: InventoryEditor,
});

type Detail = Awaited<ReturnType<typeof getInventoryDetail>> & {
  entityType: string;
  status: string;
};
const LOCALES = ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"] as const;

function InventoryEditor() {
  const { session, detail } = Route.useLoaderData() as {
    session: {
      authenticated: boolean;
      user: { id: string; username: string; displayName: string; role: string } | null;
      expiresAt: string | null;
    };
    detail: Detail | null;
  };
  const editor = useCmsEditorState();
  const [publishPending, setPublishPending] = useState(false);

  if (!detail || !session.user) {
    return (
      <CmsEditorFrame
        session={session}
        backTo="/admin/inventory"
        backLabel="Inventory"
        eyebrow="Content · Inventory"
        title="Inventory item not found"
        status="draft"
        publishPending={false}
        canPublish={false}
        onPublish={() => undefined}
      >
        <CmsNotice kind="error">This inventory item does not exist.</CmsNotice>
      </CmsEditorFrame>
    );
  }

  const canWrite = session.user?.role === "editor" || session.user?.role === "admin";
  const canPublish = session.user?.role === "admin";
  const record = detail.record as Record<string, string | number | null>;
  const kindLabel =
    detail.entityType === "weapon"
      ? "Weapon"
      : detail.entityType === "trap"
        ? "Trap"
        : detail.entityType === "perk"
          ? "Perk"
          : "Schematic";

  async function handlePublish(to: "published" | "draft" | "archived") {
    if (
      !window.confirm(
        to === "published"
          ? "Publishing makes this row publicly visible. Continue?"
          : to === "archived"
            ? "Archiving retires this row (never hard-deleted). Continue?"
            : "Moving back to draft hides this row. Continue?",
      )
    ) {
      return;
    }
    setPublishPending(true);
    editor.setError(null);
    try {
      await publishAdminInventoryContent({
        data: { contentId: (detail as NonNullable<typeof detail>).contentId, to },
      });
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
      backTo="/admin/inventory"
      backLabel="Inventory"
      eyebrow={`Content · Inventory · ${detail.entityType}`}
      title={detail.translations[0]?.title ?? detail.contentId}
      subtitle={`Content id ${detail.contentId} · ${detail.translations.length} translation(s)`}
      status={detail.status}
      publishPending={publishPending}
      canPublish={canPublish}
      onPublish={handlePublish}
      rail={
        <CmsCard title="Record">
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between gap-2">
              <dt className="opacity-60">Kind</dt>
              <dd className="font-mono">{detail.entityType}</dd>
            </div>
            {detail.entityType === "perk" ? (
              <div className="flex justify-between gap-2">
                <dt className="opacity-60">Perk key</dt>
                <dd className="max-w-40 truncate font-mono">{String(record["perk_key"] ?? "—")}</dd>
              </div>
            ) : null}
            {detail.entityType === "schematic" ? (
              <div className="flex justify-between gap-2">
                <dt className="opacity-60">Target</dt>
                <dd className="max-w-40 truncate font-mono">
                  {record["weapon_content_id"]
                    ? `weapon ${record["weapon_content_id"]}`
                    : record["trap_content_id"]
                      ? `trap ${record["trap_content_id"]}`
                      : "none"}
                </dd>
              </div>
            ) : null}
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
      {detail.entityType === "perk" ? (
        <PerkEditor
          detail={detail}
          disabled={!canWrite}
          run={editor.run}
          pending={editor.pending}
        />
      ) : (
        <GenericTranslationForm
          detail={detail}
          kindLabel={kindLabel}
          disabled={!canWrite}
          run={editor.run}
          pending={editor.pending}
        />
      )}
      {detail.entityType === "weapon" ? (
        <WeaponForm
          contentId={detail.contentId}
          record={detail.record}
          disabled={!canWrite}
          run={editor.run}
          pending={editor.pending}
        />
      ) : null}
      {detail.entityType === "trap" ? (
        <TrapForm
          contentId={detail.contentId}
          record={detail.record}
          disabled={!canWrite}
          run={editor.run}
          pending={editor.pending}
        />
      ) : null}
      {detail.entityType === "schematic" ? (
        <>
          <SchematicForm
            contentId={detail.contentId}
            record={detail.record}
            disabled={!canWrite}
            run={editor.run}
            pending={editor.pending}
          />
          <SchematicPerksForm
            contentId={detail.contentId}
            record={detail.record}
            disabled={!canWrite}
            run={editor.run}
            pending={editor.pending}
          />
        </>
      ) : null}
    </CmsEditorFrame>
  );
}

function GenericTranslationForm(props: {
  detail: Detail;
  kindLabel: string;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const active = props.detail.translations[0];
  const [locale, setLocale] = useState(active?.locale ?? "en");
  const [title, setTitle] = useState(active?.title ?? "");
  const [body, setBody] = useState(active?.body ?? "");
  return (
    <CmsFormSection
      title={`${props.kindLabel} translation`}
      description="Per-locale title and body. Switching locale never clobbers another locale's text."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              if (title.trim() === "") throw new Error("Title is required.");
              await upsertAdminTranslation({
                data: { contentId: props.detail.contentId, locale, title: title.trim(), body },
              });
              return `Translation saved (${locale}).`;
            })
          }
        >
          {props.pending ? "Saving…" : "Save translation"}
        </button>
      }
    >
      <CmsField label="Locale">
        <CmsSelect
          id="inventory-detail-locale"
          value={locale}
          disabled={props.disabled}
          onChange={(v) => {
            setLocale(v);
            const next = props.detail.translations.find((t) => t.locale === v);
            setTitle(next?.title ?? "");
            setBody(next?.body ?? "");
          }}
          width="full"
          options={LOCALES.map((l) => ({ value: l, label: l }))}
        />
      </CmsField>
      <CmsField label="Title">
        <input
          className="cc-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={props.disabled}
        />
      </CmsField>
      <CmsField label="Body">
        <textarea
          className="cc-input"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={props.disabled}
        />
      </CmsField>
    </CmsFormSection>
  );
}

function PerkEditor(props: {
  detail: Detail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const record = props.detail.record as Record<string, string | number | null>;
  const [locale, setLocale] = useState("en");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <CmsFormSection
      title="Perk translations"
      description="Perk names/descriptions live in the perk table (not the generic translation table). The perk key is the immutable unique machine id."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              if (name.trim() === "") throw new Error("Perk name is required.");
              await upsertAdminPerkTranslation({
                data: {
                  contentId: props.detail.contentId,
                  locale,
                  name: name.trim(),
                  ...(description.trim() === "" ? {} : { description: description.trim() }),
                },
              });
              setName("");
              setDescription("");
              return `Perk translation saved (${locale}).`;
            })
          }
        >
          {props.pending ? "Saving…" : "Save perk name"}
        </button>
      }
    >
      <CmsField label="Perk key (immutable)" description="Unique machine id set at creation.">
        <input
          className="cc-input font-mono"
          value={String(record["perk_key"] ?? "")}
          disabled
          readOnly
        />
      </CmsField>
      <div className="grid gap-4 sm:grid-cols-2">
        <CmsField label="Locale">
          <CmsSelect
            id="inventory-perk-locale"
            value={locale}
            disabled={props.disabled}
            onChange={setLocale}
            width="full"
            options={LOCALES.map((l) => ({ value: l, label: l }))}
          />
        </CmsField>
        <CmsField label="Name" description="Display name for this locale.">
          <input
            className="cc-input"
            value={name}
            placeholder="Perk display name"
            onChange={(e) => setName(e.target.value)}
            disabled={props.disabled}
          />
        </CmsField>
      </div>
      <CmsField label="Description" description="Optional flavor text for this locale.">
        <textarea
          className="cc-input"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={props.disabled}
        />
      </CmsField>
    </CmsFormSection>
  );
}

function WeaponForm(props: {
  contentId: string;
  record: Record<string, string | number | null>;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const [subtype, setSubtype] = useState(String(props.record["weapon_subtype"] ?? "other"));
  const [rarity, setRarity] = useState(String(props.record["rarity"] ?? ""));
  const [popularity, setPopularity] = useState(String(props.record["popularity"] ?? 0));
  const [sortOrder, setSortOrder] = useState(String(props.record["sort_order"] ?? 0));
  const [icon, setIcon] = useState(String(props.record["icon_asset_id"] ?? ""));
  return (
    <CmsFormSection
      title="Weapon fields"
      description="Subtype, discovery ordering, and icon media reference."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              await updateAdminWeapon({
                data: {
                  contentId: props.contentId,
                  weaponSubtype: subtype,
                  rarity: rarity === "" ? null : rarity,
                  popularity: Number(popularity),
                  sortOrder: Number(sortOrder),
                  iconAssetId: icon.trim() === "" ? null : icon.trim(),
                },
              });
              return "Weapon saved.";
            })
          }
        >
          {props.pending ? "Saving…" : "Save weapon"}
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <CmsField label="Subtype">
          <CmsSelect
            id="inventory-weapon-subtype"
            value={subtype}
            disabled={props.disabled}
            onChange={setSubtype}
            width="full"
            options={[
              "assault",
              "smg",
              "pistol",
              "shotgun",
              "sniper",
              "melee",
              "explosive",
              "other",
            ].map((s) => ({ value: s, label: s }))}
          />
        </CmsField>
        <CmsField label="Rarity" description="Editorial rarity (public filter + accent).">
          <CmsSelect
            id="inventory-weapon-rarity"
            value={rarity}
            disabled={props.disabled}
            onChange={setRarity}
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
        <CmsMediaField
          label="Icon asset id"
          description="R2 media id (media_…). Upload inline or pick an existing asset."
          value={icon}
          onChange={setIcon}
          disabled={props.disabled}
          folder="weapons"
        />
        <CmsField label="Popularity">
          <input
            className="cc-input"
            value={popularity}
            inputMode="numeric"
            disabled={props.disabled}
            onChange={(e) => setPopularity(e.target.value)}
          />
        </CmsField>
        <CmsField label="Sort order">
          <input
            className="cc-input"
            value={sortOrder}
            inputMode="numeric"
            disabled={props.disabled}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </CmsField>
      </div>
    </CmsFormSection>
  );
}

const RARITY_OPTIONS = [
  { value: "", label: "Unclassified" },
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "epic", label: "Epic" },
  { value: "legendary", label: "Legendary" },
  { value: "mythic", label: "Mythic" },
];

function TrapForm(props: {
  contentId: string;
  record: Record<string, string | number | null>;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const [subtype, setSubtype] = useState(String(props.record["trap_subtype"] ?? "other"));
  const [placement, setPlacement] = useState(String(props.record["trap_placement"] ?? ""));
  const [rarity, setRarity] = useState(String(props.record["rarity"] ?? ""));
  const [popularity, setPopularity] = useState(String(props.record["popularity"] ?? 0));
  const [sortOrder, setSortOrder] = useState(String(props.record["sort_order"] ?? 0));
  const [icon, setIcon] = useState(String(props.record["icon_asset_id"] ?? ""));
  return (
    <CmsFormSection
      title="Trap fields"
      description="Subtype, discovery ordering, and icon media reference."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              await updateAdminTrap({
                data: {
                  contentId: props.contentId,
                  trapSubtype: subtype,
                  trapPlacement: placement === "" ? null : placement,
                  rarity: rarity === "" ? null : rarity,
                  popularity: Number(popularity),
                  sortOrder: Number(sortOrder),
                  iconAssetId: icon.trim() === "" ? null : icon.trim(),
                },
              });
              return "Trap saved.";
            })
          }
        >
          {props.pending ? "Saving…" : "Save trap"}
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <CmsField
          label="Placement (canonical)"
          description="Floor / wall / ceiling. Drives public trap filters."
        >
          <CmsSelect
            id="inventory-trap-placement"
            value={placement}
            disabled={props.disabled}
            onChange={setPlacement}
            width="full"
            options={[
              { value: "", label: "Unclassified" },
              { value: "floor", label: "Floor" },
              { value: "wall", label: "Wall" },
              { value: "ceiling", label: "Ceiling" },
            ]}
          />
        </CmsField>
        <CmsField
          label="Legacy role (compat)"
          description="Old damage/healer/utility grouping. Preserved, not used by new filters."
        >
          <CmsSelect
            id="inventory-trap-subtype"
            value={subtype}
            disabled={props.disabled}
            onChange={setSubtype}
            width="full"
            options={["damage", "healer", "utility", "other"].map((s) => ({
              value: s,
              label: s,
            }))}
          />
        </CmsField>
        <CmsField label="Rarity" description="Editorial rarity (public filter + accent).">
          <CmsSelect
            id="inventory-trap-rarity"
            value={rarity}
            disabled={props.disabled}
            onChange={setRarity}
            width="full"
            options={RARITY_OPTIONS}
          />
        </CmsField>
        <CmsMediaField
          label="Icon asset id"
          description="R2 media id (media_…). Upload inline or pick an existing asset."
          value={icon}
          onChange={setIcon}
          disabled={props.disabled}
          folder="traps"
        />
        <CmsField label="Popularity">
          <input
            className="cc-input"
            value={popularity}
            inputMode="numeric"
            disabled={props.disabled}
            onChange={(e) => setPopularity(e.target.value)}
          />
        </CmsField>
        <CmsField label="Sort order">
          <input
            className="cc-input"
            value={sortOrder}
            inputMode="numeric"
            disabled={props.disabled}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </CmsField>
      </div>
    </CmsFormSection>
  );
}

function SchematicForm(props: {
  contentId: string;
  record: Record<string, string | number | null>;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const [slots, setSlots] = useState("");
  const [icon, setIcon] = useState(String(props.record["icon_asset_id"] ?? ""));
  const [popularity, setPopularity] = useState(String(props.record["popularity"] ?? 0));
  const [sortOrder, setSortOrder] = useState(String(props.record["sort_order"] ?? 0));
  const target = props.record["weapon_content_id"]
    ? `weapon ${props.record["weapon_content_id"]}`
    : props.record["trap_content_id"]
      ? `trap ${props.record["trap_content_id"]}`
      : "nothing (fix via migration)";
  return (
    <CmsFormSection
      title="Schematic fields"
      description="Discovery ordering and icon media reference. Weapon/trap targeting is fixed at creation and changed only through a retarget."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              await updateAdminSchematic({
                data: {
                  contentId: props.contentId,
                  popularity: Number(popularity),
                  sortOrder: Number(sortOrder),
                  iconAssetId: icon.trim() === "" ? null : icon.trim(),
                },
              });
              return "Schematic saved.";
            })
          }
        >
          {props.pending ? "Saving…" : "Save schematic"}
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <CmsMediaField
          label="Icon asset id"
          description="R2 media id (media_…). Upload inline or pick an existing asset."
          value={icon}
          onChange={setIcon}
          disabled={props.disabled}
          folder="schematics"
        />
        <CmsField label="Popularity">
          <input
            className="cc-input"
            value={popularity}
            inputMode="numeric"
            disabled={props.disabled}
            onChange={(e) => setPopularity(e.target.value)}
          />
        </CmsField>
        <CmsField label="Sort order">
          <input
            className="cc-input"
            value={sortOrder}
            inputMode="numeric"
            disabled={props.disabled}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </CmsField>
      </div>
    </CmsFormSection>
  );
}

function SchematicPerksForm(props: {
  contentId: string;
  record: Record<string, string | number | null>;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const [slots, setSlots] = useState("");
  const target = props.record["weapon_content_id"]
    ? `weapon ${props.record["weapon_content_id"]}`
    : props.record["trap_content_id"]
      ? `trap ${props.record["trap_content_id"]}`
      : "nothing (fix via migration)";
  return (
    <CmsFormSection
      title="Schematic perks"
      description={`Linked to ${target}. Perk assignments are contentId:slot pairs, one per line. Slot order must be unique integers.`}
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              const perks = slots
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line !== "")
                .map((line) => {
                  const [perkContentId = "", slot = ""] = line.split(":");
                  if (perkContentId.trim() === "" || slot.trim() === "") {
                    throw new Error("Each line must be contentId:slotOrder.");
                  }
                  const slotOrder = Number(slot);
                  if (!Number.isInteger(slotOrder))
                    throw new Error("slotOrder must be an integer.");
                  return { perkContentId: perkContentId.trim(), slotOrder };
                });
              await setAdminSchematicPerks({ data: { contentId: props.contentId, perks } });
              setSlots("");
              return `Saved ${perks.length} perk slot(s).`;
            })
          }
        >
          {props.pending ? "Saving…" : "Save perks"}
        </button>
      }
    >
      <CmsField label="Perk slots" description="contentId:slotOrder, one per line.">
        <textarea
          className="cc-input font-mono"
          rows={4}
          value={slots}
          placeholder={"perk-content-id:0\nperk-content-id:1"}
          disabled={props.disabled}
          onChange={(e) => setSlots(e.target.value)}
        />
      </CmsField>
    </CmsFormSection>
  );
}
