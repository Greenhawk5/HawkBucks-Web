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
import {
  getAdminLoadout,
  setAdminLoadoutHeroes,
  updateAdminLoadout,
} from "@/lib/cms/loadouts-admin.loader";
import { listAdminHeroes } from "@/lib/cms/heroes-admin.loader";
import { formatLoadoutSlotInput, parseLoadoutSlotInput } from "@/lib/cms/public-content-slots";
import { publishAdminContent, upsertAdminTranslation } from "@/lib/cms/heroes-admin.loader";

/**
 * Rebuild the 0..5 slot array from admin hero rows. Empty slots have no row,
 * so they would vanish under a plain map+join; this preserves positions by
 * writing "(empty)" placeholders (the same token the save path maps to null).
 * Shared pure helper (client-safe): formatLoadoutSlotInput.
 */
function initialHeroIds(
  heroes: Array<{ contentId: string; slotOrder: number }> | null | undefined,
): string {
  return formatLoadoutSlotInput(heroes);
}

export const Route = createFileRoute("/admin/loadouts/$contentId")({
  loader: async ({ params }) => {
    const session = await getAdminSession();
    if (!session.authenticated) {
      return {
        session,
        loadout: null,
        heroOptions: [] as Array<{ contentId: string; title: string | null }>,
      };
    }
    const [{ loadout }, { items }] = await Promise.all([
      getAdminLoadout({ data: { contentId: params.contentId } }),
      listAdminHeroes({ data: {} }),
    ]);
    return {
      session,
      loadout,
      heroOptions: items.map((item: { contentId: string; title: string | null }) => ({
        contentId: item.contentId,
        title: item.title,
      })),
    };
  },
  head: () => ({
    meta: [{ title: "Edit loadout — CMS Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  pendingComponent: () => <AdminPending title="Edit loadout" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <AdminRouteError title="Edit loadout" backTo="/admin/loadouts" error={error} />
  ),
  component: LoadoutEditor,
});

function LoadoutEditor() {
  type LoadoutDetail = Awaited<ReturnType<typeof getAdminLoadout>>["loadout"];
  const { session, loadout, heroOptions } = Route.useLoaderData() as {
    session: { authenticated: boolean };
    loadout: LoadoutDetail;
    heroOptions: Array<{ contentId: string; title: string | null }>;
  };
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heroIds, setHeroIds] = useState(initialHeroIds(loadout?.heroes));
  const [loadoutType, setLoadoutType] = useState(loadout?.loadoutType ?? "custom");
  const [popularity, setPopularity] = useState(String(loadout?.popularity ?? 0));
  const [sortOrder, setSortOrder] = useState(String(loadout?.sortOrder ?? 0));
  const [coverAssetId, setCoverAssetId] = useState(loadout?.coverAssetId ?? "");
  const [locale, setLocale] = useState(loadout?.defaultLocale ?? "en");
  const activeTranslation =
    loadout?.translations.find((t) => t.locale === locale) ?? loadout?.translations[0];
  const [title, setTitle] = useState(activeTranslation?.title ?? "");
  const [body, setBody] = useState(activeTranslation?.body ?? "");

  if (!session.authenticated || !loadout) return <AdminSignInGate title="Edit loadout" />;

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

  const titleById = new Map(heroOptions.map((h) => [h.contentId, h.title ?? h.contentId]));

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
            <Link to="/admin/heroes" className="underline">
              Heroes
            </Link>
          </li>
          <li>
            <Link to="/admin/loadouts" className="underline">
              Loadouts
            </Link>
          </li>
          <li>
            <Link to="/admin/inventory" className="underline">
              Inventory
            </Link>
          </li>
          <li>
            <Link to="/admin/media" className="underline">
              Media
            </Link>
          </li>
        </ul>
      </nav>
      <h1 className="mt-6 text-2xl font-bold">Edit loadout</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Status: {loadout.status}. Heroes: {loadout.heroes.length}. Locales:{" "}
        {loadout.locales.join(", ") || "none"}.
      </p>
      <AdminError error={error} />
      <AdminNotice message={msg} />

      <section className="mt-6 text-sm">
        <h2 className="text-lg font-semibold">Settings</h2>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label>
            Type{" "}
            <select
              className="rounded border px-2 py-1"
              value={loadoutType}
              onChange={(e) => setLoadoutType(e.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="meta">Meta</option>
              <option value="farming">Farming</option>
              <option value="boss">Boss</option>
              <option value="fun">Fun</option>
              <option value="custom">Custom</option>
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
            Cover asset id{" "}
            <input
              className="w-44 rounded border px-2 py-1"
              value={coverAssetId}
              placeholder="media_… (optional)"
              onChange={(e) => setCoverAssetId(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded bg-primary px-3 py-1 text-primary-foreground"
            onClick={() =>
              run(async () => {
                await updateAdminLoadout({
                  data: {
                    contentId: loadout.contentId,
                    loadoutType,
                    popularity: Number(popularity),
                    sortOrder: Number(sortOrder),
                    coverAssetId: coverAssetId.trim() === "" ? null : coverAssetId.trim(),
                  },
                });
                return "Settings saved.";
              })
            }
          >
            Save settings
          </button>
        </div>
      </section>

      <section className="mt-6 text-sm">
        <h2 className="text-lg font-semibold">Translation</h2>
        <div className="mt-2 space-y-3">
          <label className="block">
            Locale{" "}
            <select
              className="rounded border px-2 py-1"
              value={locale}
              onChange={(e) => {
                setLocale(e.target.value);
                const next = loadout.translations.find((t) => t.locale === e.target.value);
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
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded bg-primary px-3 py-1 text-primary-foreground"
            onClick={() =>
              run(async () => {
                if (title.trim() === "") throw new Error("Title is required.");
                await upsertAdminTranslation({
                  data: { contentId: loadout.contentId, locale, title: title.trim(), body },
                });
                return "Translation saved.";
              })
            }
          >
            Save translation
          </button>
        </div>
      </section>

      <section className="mt-6 text-sm">
        <h2 className="text-lg font-semibold">Hero roster</h2>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {loadout.heroes.length === 0 ? (
            <li>No heroes assigned yet. Slot 0 (Commander) is required.</li>
          ) : (
            loadout.heroes.map((hero) => (
              <li key={`${hero.contentId}-${hero.slotOrder}`}>
                Slot {hero.slotOrder}: {titleById.get(hero.contentId) ?? hero.contentId} (
                {hero.status})
              </li>
            ))
          )}
        </ul>
        <label className="mt-3 block">
          Hero content ids (comma-separated, max 6, slot 0 = Commander)
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            value={heroIds}
            onChange={(e) => setHeroIds(e.target.value)}
          />
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Use the literal token (empty) for an empty Support slot, e.g. “idA, idB, (empty), idC”
          keeps Support 2 empty.
        </p>
        <div className="mt-3">
          <h3 className="font-medium">Pick from available heroes</h3>
          <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto border p-2">
            {heroOptions.length === 0 ? (
              <li className="text-muted-foreground">No heroes available yet.</li>
            ) : (
              heroOptions.map((hero) => (
                <li key={hero.contentId}>
                  <button
                    type="button"
                    className="underline"
                    title={hero.contentId}
                    onClick={() =>
                      setHeroIds((current) =>
                        current.trim() === "" ? hero.contentId : `${current}, ${hero.contentId}`,
                      )
                    }
                  >
                    {hero.title ?? hero.contentId}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          className="rounded bg-primary px-3 py-1 text-primary-foreground"
          onClick={() =>
            run(async () => {
              const ids = parseLoadoutSlotInput(heroIds);
              await setAdminLoadoutHeroes({
                data: { contentId: loadout.contentId, heroContentIds: [], heroSlots: ids },
              });
              return "Heroes saved.";
            })
          }
        >
          Save heroes
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={() =>
            run(async () => {
              await publishAdminContent({
                data: { contentId: loadout.contentId, to: "published" },
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
              await publishAdminContent({ data: { contentId: loadout.contentId, to: "draft" } });
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
              await publishAdminContent({ data: { contentId: loadout.contentId, to: "archived" } });
              return "Archived (never hard-deleted).";
            })
          }
        >
          Archive
        </button>
      </div>
      <p className="mt-6 text-sm">
        <Link to="/admin/loadouts" className="underline">
          Back to loadouts
        </Link>
      </p>
    </main>
  );
}
