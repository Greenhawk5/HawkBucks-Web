import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  AdminError,
  AdminNotice,
  AdminPending,
  AdminRouteError,
  AdminSignInGate,
} from "@/components/cms/AdminShell";
import { getContentByIdLite, getInventoryDetail } from "@/lib/cms/inventory-admin-detail.loader";
import {
  publishAdminInventoryContent,
  setAdminSchematicPerks,
  updateAdminTrap,
  updateAdminWeapon,
  upsertAdminPerkTranslation,
} from "@/lib/cms/schematics-admin.loader";
import { upsertAdminTranslation } from "@/lib/cms/heroes-admin.loader";

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
      { title: "Edit inventory item — CMS Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <AdminPending title="Edit inventory item" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <AdminRouteError title="Edit inventory item" backTo="/admin/inventory" error={error} />
  ),
  component: InventoryEditor,
});

function InventoryEditor() {
  const { session, detail } = Route.useLoaderData();
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!session.authenticated || !detail) return <AdminSignInGate title="Edit inventory item" />;

  async function run(action: () => Promise<string>) {
    setError(null);
    setMsg(null);
    try {
      setMsg(await action());
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="CMS sections" className="border-b pb-2">
        <ul className="flex flex-wrap gap-4 text-sm">
          <li>
            <Link to="/admin" className="underline">
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/admin/inventory" className="underline">
              Inventory
            </Link>
          </li>
        </ul>
      </nav>
      <h1 className="mt-6 text-2xl font-bold">Edit {detail.entityType}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Status: {detail.status}. Content: {detail.contentId}.
      </p>
      <AdminError error={error} />
      <AdminNotice message={msg} />
      <div className="mt-6 space-y-8 text-sm">
        <TranslationForm
          contentId={detail.contentId}
          translations={detail.translations}
          onRun={run}
        />
        {detail.entityType === "weapon" ? (
          <WeaponForm contentId={detail.contentId} record={detail.record} onRun={run} />
        ) : null}
        {detail.entityType === "trap" ? (
          <TrapForm contentId={detail.contentId} record={detail.record} onRun={run} />
        ) : null}
        {detail.entityType === "perk" ? (
          <PerkForm contentId={detail.contentId} record={detail.record} onRun={run} />
        ) : null}
        {detail.entityType === "schematic" ? (
          <SchematicForm contentId={detail.contentId} record={detail.record} onRun={run} />
        ) : null}
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <button
            type="button"
            className="rounded bg-primary px-3 py-1 text-primary-foreground"
            onClick={() =>
              run(async () => {
                await publishAdminInventoryContent({
                  data: { contentId: detail.contentId, to: "published" },
                });
                return "Published.";
              })
            }
          >
            Publish
          </button>
          <button
            type="button"
            className="rounded border px-3 py-1"
            onClick={() =>
              run(async () => {
                await publishAdminInventoryContent({
                  data: { contentId: detail.contentId, to: "draft" },
                });
                return "Moved back to draft.";
              })
            }
          >
            Unpublish
          </button>
          <button
            type="button"
            className="rounded border px-3 py-1"
            onClick={() =>
              run(async () => {
                await publishAdminInventoryContent({
                  data: { contentId: detail.contentId, to: "archived" },
                });
                return "Archived (never hard-deleted).";
              })
            }
          >
            Archive
          </button>
        </div>
      </div>
      <p className="mt-6 text-sm">
        <Link to="/admin/inventory" className="underline">
          Back to inventory
        </Link>
      </p>
    </main>
  );
}

function TranslationForm(props: {
  contentId: string;
  translations: Array<{ locale: string; title: string; body: string; slug: string }>;
  onRun: (action: () => Promise<string>) => Promise<void>;
}) {
  const active = props.translations[0];
  const [locale, setLocale] = useState(active?.locale ?? "en");
  const [title, setTitle] = useState(active?.title ?? "");
  const [body, setBody] = useState(active?.body ?? "");

  return (
    <section>
      <h2 className="text-lg font-semibold">Translation</h2>
      <div className="mt-2 space-y-3">
        <label className="block">
          Locale{" "}
          <select
            className="rounded border px-2 py-1"
            value={locale}
            onChange={(e) => {
              setLocale(e.target.value);
              const next = props.translations.find((t) => t.locale === e.target.value);
              setTitle(next?.title ?? "");
              setBody(next?.body ?? "");
            }}
          >
            {["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Title{" "}
          <input
            className="w-full rounded border px-2 py-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block">
          Body{" "}
          <textarea
            className="w-full rounded border px-2 py-1"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="rounded bg-primary px-3 py-1 text-primary-foreground"
          onClick={() =>
            props.onRun(async () => {
              if (title.trim() === "") throw new Error("Title is required.");
              await upsertAdminTranslation({
                data: { contentId: props.contentId, locale, title: title.trim(), body },
              });
              return "Translation saved.";
            })
          }
        >
          Save translation
        </button>
      </div>
    </section>
  );
}

function WeaponForm(props: {
  contentId: string;
  record: {
    weapon_subtype?: string;
    popularity?: number;
    sort_order?: number;
    icon_asset_id?: string | null;
  };
  onRun: (action: () => Promise<string>) => Promise<void>;
}) {
  const [subtype, setSubtype] = useState(props.record.weapon_subtype ?? "other");
  const [popularity, setPopularity] = useState(String(props.record.popularity ?? 0));
  const [sortOrder, setSortOrder] = useState(String(props.record.sort_order ?? 0));
  const [icon, setIcon] = useState(props.record.icon_asset_id ?? "");

  return (
    <section>
      <h2 className="text-lg font-semibold">Weapon fields</h2>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label>
          Subtype{" "}
          <select
            className="rounded border px-2 py-1"
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
          >
            {["assault", "smg", "pistol", "shotgun", "sniper", "melee", "explosive", "other"].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Popularity{" "}
          <input
            className="w-24 rounded border px-2 py-1"
            value={popularity}
            inputMode="numeric"
            onChange={(e) => setPopularity(e.target.value)}
          />
        </label>
        <label>
          Sort order{" "}
          <input
            className="w-24 rounded border px-2 py-1"
            value={sortOrder}
            inputMode="numeric"
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </label>
        <label>
          Icon asset id{" "}
          <input
            className="w-48 rounded border px-2 py-1"
            value={icon}
            placeholder="media_… (optional)"
            onChange={(e) => setIcon(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="rounded bg-primary px-3 py-1 text-primary-foreground"
          onClick={() =>
            props.onRun(async () => {
              await updateAdminWeapon({
                data: {
                  contentId: props.contentId,
                  weaponSubtype: subtype,
                  popularity: Number(popularity),
                  sortOrder: Number(sortOrder),
                  iconAssetId: icon.trim() === "" ? null : icon.trim(),
                },
              });
              return "Weapon saved.";
            })
          }
        >
          Save weapon
        </button>
      </div>
    </section>
  );
}

function TrapForm(props: {
  contentId: string;
  record: {
    trap_subtype?: string;
    popularity?: number;
    sort_order?: number;
    icon_asset_id?: string | null;
  };
  onRun: (action: () => Promise<string>) => Promise<void>;
}) {
  const [subtype, setSubtype] = useState(props.record.trap_subtype ?? "other");
  const [popularity, setPopularity] = useState(String(props.record.popularity ?? 0));
  const [sortOrder, setSortOrder] = useState(String(props.record.sort_order ?? 0));
  const [icon, setIcon] = useState(props.record.icon_asset_id ?? "");

  return (
    <section>
      <h2 className="text-lg font-semibold">Trap fields</h2>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label>
          Subtype{" "}
          <select
            className="rounded border px-2 py-1"
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
          >
            {["damage", "healer", "utility", "other"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Popularity{" "}
          <input
            className="w-24 rounded border px-2 py-1"
            value={popularity}
            inputMode="numeric"
            onChange={(e) => setPopularity(e.target.value)}
          />
        </label>
        <label>
          Sort order{" "}
          <input
            className="w-24 rounded border px-2 py-1"
            value={sortOrder}
            inputMode="numeric"
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </label>
        <label>
          Icon asset id{" "}
          <input
            className="w-48 rounded border px-2 py-1"
            value={icon}
            placeholder="media_… (optional)"
            onChange={(e) => setIcon(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="rounded bg-primary px-3 py-1 text-primary-foreground"
          onClick={() =>
            props.onRun(async () => {
              await updateAdminTrap({
                data: {
                  contentId: props.contentId,
                  trapSubtype: subtype,
                  popularity: Number(popularity),
                  sortOrder: Number(sortOrder),
                  iconAssetId: icon.trim() === "" ? null : icon.trim(),
                },
              });
              return "Trap saved.";
            })
          }
        >
          Save trap
        </button>
      </div>
    </section>
  );
}

function PerkForm(props: {
  contentId: string;
  record: { perk_key?: string };
  onRun: (action: () => Promise<string>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [locale, setLocale] = useState("en");

  return (
    <section>
      <h2 className="text-lg font-semibold">Perk translation</h2>
      <p className="text-muted-foreground">Perk key: {props.record.perk_key ?? "—"}</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label>
          Locale{" "}
          <select
            className="rounded border px-2 py-1"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            {["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Name{" "}
          <input
            className="rounded border px-2 py-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Perk display name"
          />
        </label>
        <button
          type="button"
          className="rounded bg-primary px-3 py-1 text-primary-foreground"
          onClick={() =>
            props.onRun(async () => {
              if (name.trim() === "") throw new Error("Perk name is required.");
              await upsertAdminPerkTranslation({
                data: { contentId: props.contentId, locale, name: name.trim() },
              });
              setName("");
              return "Perk translation saved.";
            })
          }
        >
          Save perk name
        </button>
      </div>
    </section>
  );
}

function SchematicForm(props: {
  contentId: string;
  record: { weapon_content_id?: string | null; trap_content_id?: string | null };
  onRun: (action: () => Promise<string>) => Promise<void>;
}) {
  const [slots, setSlots] = useState("");
  return (
    <section>
      <h2 className="text-lg font-semibold">Schematic perks</h2>
      <p className="text-muted-foreground">
        Linked to{" "}
        {props.record.weapon_content_id
          ? `weapon ${props.record.weapon_content_id}`
          : props.record.trap_content_id
            ? `trap ${props.record.trap_content_id}`
            : "nothing (fix via migration)"}
        . Enter perk assignments as contentId:slot pairs, one per line.
      </p>
      <textarea
        className="mt-2 w-full rounded border px-2 py-1"
        rows={4}
        value={slots}
        placeholder={"perk-content-id:0\nperk-content-id:1"}
        onChange={(e) => setSlots(e.target.value)}
      />
      <button
        type="button"
        className="mt-2 rounded bg-primary px-3 py-1 text-primary-foreground"
        onClick={() =>
          props.onRun(async () => {
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
                if (!Number.isInteger(slotOrder)) throw new Error("slotOrder must be an integer.");
                return { perkContentId: perkContentId.trim(), slotOrder };
              });
            await setAdminSchematicPerks({ data: { contentId: props.contentId, perks } });
            setSlots("");
            return `Saved ${perks.length} perk slot(s).`;
          })
        }
      >
        Save perks
      </button>
    </section>
  );
}
