import { useState, type ReactNode } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  AdminEmpty,
  AdminError,
  AdminPage,
  AdminPending,
  AdminRouteError,
  AdminSignInGate,
} from "@/components/cms/AdminShell";
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
    meta: [{ title: "Inventory — CMS Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  pendingComponent: () => <AdminPending title="Inventory" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <AdminRouteError title="Inventory" backTo="/admin" error={error} />
  ),
  component: InventoryAdmin,
});

function InventoryAdmin() {
  const { session, groups } = Route.useLoaderData();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  if (!session.authenticated || !groups) return <AdminSignInGate title="Inventory" />;

  async function handlePublish(contentId: string, to: "published" | "draft" | "archived") {
    setError(null);
    try {
      await publishAdminInventoryContent({ data: { contentId, to } });
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed.");
    }
  }

  return (
    <AdminPage
      active="inventory"
      title="Inventory"
      description="Weapons, traps, perks, and schematics. A schematic references exactly one weapon or one trap. Drafts never appear publicly."
      backTo="/admin"
    >
      <AdminError error={error} />
      <InventoryGroup
        title="Weapons"
        items={groups.weapons}
        empty="No weapons yet. Create the first draft below."
        onPublish={handlePublish}
        detail={(id) => (
          <Link to="/admin/inventory/$contentId" params={{ contentId: id }} className="underline">
            Open
          </Link>
        )}
      />
      <InventoryGroup
        title="Traps"
        items={groups.traps}
        empty="No traps yet. Create the first draft below."
        onPublish={handlePublish}
        detail={(id) => (
          <Link to="/admin/inventory/$contentId" params={{ contentId: id }} className="underline">
            Open
          </Link>
        )}
      />
      <InventoryGroup
        title="Perks"
        items={groups.perks}
        empty="No perks yet. Perk keys are unique machine ids."
        onPublish={handlePublish}
        detail={(id) => (
          <Link to="/admin/inventory/$contentId" params={{ contentId: id }} className="underline">
            Open
          </Link>
        )}
      />
      <InventoryGroup
        title="Schematics"
        items={groups.schematics}
        empty="No schematics yet. Each schematic needs exactly one weapon or trap."
        onPublish={handlePublish}
        detail={(id) => (
          <Link to="/admin/inventory/$contentId" params={{ contentId: id }} className="underline">
            Open
          </Link>
        )}
      />
      <CreateForms onError={setError} reload={() => router.invalidate()} />
    </AdminPage>
  );
}

function InventoryGroup(props: {
  title: string;
  items: InventoryAdminItem[];
  empty: string;
  onPublish: (contentId: string, to: "published" | "draft" | "archived") => Promise<void>;
  detail: (contentId: string) => ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">
        {props.title} ({props.items.length})
      </h2>
      {props.items.length === 0 ? (
        <AdminEmpty message={props.empty} />
      ) : (
        <table className="mt-3 w-full text-start text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pe-4">Title</th>
              <th className="py-2 pe-4">Subtype</th>
              <th className="py-2 pe-4">Status</th>
              <th className="py-2 pe-4">Locales</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.items.map((item) => (
              <tr key={item.contentId} className="border-b">
                <td className="py-2 pe-4">{item.title ?? item.contentId}</td>
                <td className="py-2 pe-4">{item.subtype ?? "—"}</td>
                <td className="py-2 pe-4">{item.status}</td>
                <td className="py-2 pe-4">{item.locales.join(", ") || "none"}</td>
                <td className="py-2">
                  <span className="flex flex-wrap gap-2">
                    {props.detail(item.contentId)}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => props.onPublish(item.contentId, "published")}
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => props.onPublish(item.contentId, "draft")}
                    >
                      Unpublish
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => props.onPublish(item.contentId, "archived")}
                    >
                      Archive
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function CreateForms(props: {
  onError: (message: string | null) => void;
  reload: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"weapon" | "trap" | "perk" | "schematic">("weapon");
  const [perkKey, setPerkKey] = useState("");
  const [targetId, setTargetId] = useState("");
  const [targetKind, setTargetKind] = useState<"weapon" | "trap">("weapon");
  const [pending, setPending] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim() === "") {
      props.onError("Title is required.");
      return;
    }
    if (kind === "perk" && perkKey.trim() === "") {
      props.onError("Perk key is required (unique machine id).");
      return;
    }
    if (kind === "schematic" && targetId.trim() === "") {
      props.onError("Schematic needs the target weapon or trap content id.");
      return;
    }
    setPending(true);
    props.onError(null);
    try {
      const trimmedTitle = title.trim();
      if (kind === "weapon") {
        await createAdminWeapon({ data: { title: trimmedTitle } });
      } else if (kind === "trap") {
        await createAdminTrap({ data: { title: trimmedTitle } });
      } else if (kind === "perk") {
        await createAdminPerk({ data: { title: trimmedTitle, perkKey: perkKey.trim() } });
      } else {
        const target = targetId.trim();
        await createAdminSchematic({
          data: {
            title: trimmedTitle,
            ...(targetKind === "weapon" ? { weaponContentId: target } : { trapContentId: target }),
          },
        });
      }
      setTitle("");
      setPerkKey("");
      setTargetId("");
      await props.reload();
    } catch (e) {
      props.onError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-10 border-t pt-6">
      <h2 className="text-lg font-semibold">Create draft</h2>
      <form onSubmit={handleCreate} className="mt-3 flex flex-wrap items-end gap-2 text-sm">
        <label>
          Kind{" "}
          <select
            className="rounded border px-2 py-1"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="weapon">Weapon</option>
            <option value="trap">Trap</option>
            <option value="perk">Perk</option>
            <option value="schematic">Schematic</option>
          </select>
        </label>
        <label>
          Title{" "}
          <input
            className="rounded border px-2 py-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Draft title"
          />
        </label>
        {kind === "perk" ? (
          <label>
            Perk key{" "}
            <input
              className="rounded border px-2 py-1"
              value={perkKey}
              onChange={(e) => setPerkKey(e.target.value)}
              placeholder="unique-key"
            />
          </label>
        ) : null}
        {kind === "schematic" ? (
          <>
            <label>
              Target kind{" "}
              <select
                className="rounded border px-2 py-1"
                value={targetKind}
                onChange={(e) => setTargetKind(e.target.value as typeof targetKind)}
              >
                <option value="weapon">Weapon</option>
                <option value="trap">Trap</option>
              </select>
            </label>
            <label>
              Target content id{" "}
              <input
                className="rounded border px-2 py-1"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="cms_…"
              />
            </label>
          </>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-primary px-3 py-1 text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Saving…" : "Create draft"}
        </button>
      </form>
    </section>
  );
}
