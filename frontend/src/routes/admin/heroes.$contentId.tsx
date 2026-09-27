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
  deleteAdminAbility,
  getAdminHero,
  publishAdminContent,
  updateAdminHero,
  upsertAdminTranslation,
} from "@/lib/cms/heroes-admin.loader";
import { upsertAdminAbility } from "@/lib/cms/loadouts-admin.loader";

export const Route = createFileRoute("/admin/heroes/$contentId")({
  loader: async ({ params }) => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, hero: null };
    const { hero } = await getAdminHero({ data: { contentId: params.contentId } });
    return { session, hero };
  },
  head: () => ({
    meta: [{ title: "Edit hero — CMS Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  pendingComponent: () => <AdminPending title="Edit hero" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <AdminRouteError title="Edit hero" backTo="/admin/heroes" error={error} />
  ),
  component: HeroEditor,
});

function HeroEditor() {
  type HeroDetail = Awaited<ReturnType<typeof getAdminHero>>["hero"];
  const { session, hero } = Route.useLoaderData() as {
    session: { authenticated: boolean };
    hero: HeroDetail;
  };
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!session.authenticated || !hero) return <AdminSignInGate title="Edit hero" />;

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
      <h1 className="mt-6 text-2xl font-bold">Edit hero</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Status: {hero.status}. Abilities: {hero.abilities.length}. Locales:{" "}
        {hero.locales.join(", ") || "none"}.
      </p>
      <AdminError error={error} />
      <AdminNotice message={msg} />
      <FullHeroForm
        hero={hero}
        onRun={run}
        reload={() => router.invalidate()}
        onPublish={(to) =>
          run(async () => {
            await publishAdminContent({ data: { contentId: hero.contentId, to } });
            return to === "published"
              ? "Published."
              : to === "archived"
                ? "Archived (never hard-deleted)."
                : "Moved back to draft.";
          })
        }
      />
      <p className="mt-6 text-sm">
        <Link to="/admin/heroes" className="underline">
          Back to heroes
        </Link>
      </p>
    </main>
  );
}

function FullHeroForm(props: {
  hero: Awaited<ReturnType<typeof getAdminHero>>["hero"];
  onRun: (action: () => Promise<string>) => Promise<void>;
  reload: () => Promise<void>;
  onPublish: (to: "published" | "draft" | "archived") => Promise<void>;
}) {
  const hero = props.hero;
  const [heroClass, setHeroClass] = useState(hero.heroClass);
  const [category, setCategory] = useState(hero.category ?? "");
  const [popularity, setPopularity] = useState(String(hero.popularity));
  const [sortOrder, setSortOrder] = useState(String(hero.sortOrder));
  const [portraitAssetId, setPortraitAssetId] = useState(hero.portraitAssetId ?? "");
  const [bannerAssetId, setBannerAssetId] = useState(hero.bannerAssetId ?? "");
  const [locale, setLocale] = useState(hero.defaultLocale);
  const active = hero.translations.find((t) => t.locale === locale) ?? hero.translations[0];
  const [title, setTitle] = useState(active?.title ?? "");
  const [body, setBody] = useState(active?.body ?? "");
  const [seoTitle, setSeoTitle] = useState(active?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(active?.seoDescription ?? "");
  const [abilityKey, setAbilityKey] = useState("");
  const [abilityName, setAbilityName] = useState("");

  return (
    <div className="mt-4 space-y-6 text-sm">
      <section>
        <h2 className="text-lg font-semibold">Identity</h2>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block">
            Class{" "}
            <select
              className="rounded border px-2 py-1"
              value={heroClass}
              onChange={(e) => setHeroClass(e.target.value)}
            >
              <option value="soldier">Soldier</option>
              <option value="constructor">Constructor</option>
              <option value="ninja">Ninja</option>
              <option value="outlander">Outlander</option>
            </select>
          </label>
          <label>
            Category{" "}
            <select
              className="rounded border px-2 py-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">None</option>
              <option value="assault">Assault</option>
              <option value="support">Support</option>
              <option value="recon">Recon</option>
              <option value="defense">Defense</option>
              <option value="special">Special</option>
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
            Portrait asset id{" "}
            <input
              className="w-44 rounded border px-2 py-1"
              value={portraitAssetId}
              placeholder="media_… (optional)"
              onChange={(e) => setPortraitAssetId(e.target.value)}
            />
          </label>
          <label>
            Banner asset id{" "}
            <input
              className="w-44 rounded border px-2 py-1"
              value={bannerAssetId}
              placeholder="media_… (optional)"
              onChange={(e) => setBannerAssetId(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="mt-2 rounded bg-primary px-3 py-1 text-primary-foreground"
          onClick={() =>
            props.onRun(async () => {
              await updateAdminHero({
                data: {
                  contentId: hero.contentId,
                  heroClass,
                  category: category === "" ? null : category,
                  popularity: Number(popularity),
                  sortOrder: Number(sortOrder),
                  portraitAssetId: portraitAssetId.trim() === "" ? null : portraitAssetId.trim(),
                  bannerAssetId: bannerAssetId.trim() === "" ? null : bannerAssetId.trim(),
                },
              });
              return "Identity saved.";
            })
          }
        >
          Save identity
        </button>
      </section>

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
                const t = hero.translations.find((x) => x.locale === e.target.value);
                setTitle(t?.title ?? "");
                setBody(t?.body ?? "");
                setSeoTitle(t?.seoTitle ?? "");
                setSeoDescription(t?.seoDescription ?? "");
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
            Description{" "}
            <textarea
              className="w-full rounded border px-2 py-1"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <label className="block">
            SEO title{" "}
            <input
              className="w-full rounded border px-2 py-1"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
            />
          </label>
          <label className="block">
            SEO description{" "}
            <input
              className="w-full rounded border px-2 py-1"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded bg-primary px-3 py-1 text-primary-foreground"
            onClick={() =>
              props.onRun(async () => {
                if (title.trim() === "") throw new Error("Title is required.");
                await upsertAdminTranslation({
                  data: {
                    contentId: hero.contentId,
                    locale,
                    title: title.trim(),
                    body,
                    seoTitle: seoTitle.trim() === "" ? null : seoTitle.trim(),
                    seoDescription: seoDescription.trim() === "" ? null : seoDescription.trim(),
                  },
                });
                return "Translation saved.";
              })
            }
          >
            Save translation
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Abilities ({hero.abilities.length})</h2>
        {hero.abilities.length === 0 ? (
          <p className="mt-2 text-muted-foreground">No abilities yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {hero.abilities.map((ability) => (
              <li key={ability.id} className="flex flex-wrap items-center gap-2 border-b pb-2">
                <span className="font-mono text-xs">{ability.abilityKey}</span>
                <span className="text-muted-foreground">
                  {ability.translations.map((t) => `${t.locale}:${t.name}`).join(" · ") ||
                    "untranslated"}
                </span>
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove ability ${ability.abilityKey}? Its translations go with it; this cannot be undone.`,
                      )
                    ) {
                      void props.onRun(async () => {
                        await deleteAdminAbility({ data: { abilityId: ability.id } });
                        return "Ability removed.";
                      });
                    }
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="rounded border px-2 py-1"
            value={abilityKey}
            onChange={(e) => setAbilityKey(e.target.value)}
            placeholder="ability key"
          />
          <input
            className="rounded border px-2 py-1"
            value={abilityName}
            onChange={(e) => setAbilityName(e.target.value)}
            placeholder="ability name"
          />
          <button
            type="button"
            className="rounded border px-3 py-1"
            onClick={() =>
              props.onRun(async () => {
                if (abilityKey.trim() === "") throw new Error("Ability key is required.");
                const trimmed = abilityName.trim();
                await upsertAdminAbility({
                  data: {
                    heroContentId: hero.contentId,
                    abilityKey: abilityKey.trim(),
                    ...(trimmed === "" ? {} : { name: trimmed }),
                    locale,
                  },
                });
                setAbilityKey("");
                setAbilityName("");
                return "Ability saved.";
              })
            }
          >
            Add ability
          </button>
        </div>
      </section>

      <section className="flex flex-wrap gap-2 border-t pt-4">
        <button
          type="button"
          className="rounded bg-primary px-3 py-1 text-primary-foreground"
          onClick={() => props.onPublish("published")}
        >
          Publish
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={() => props.onPublish("draft")}
        >
          Unpublish
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={() => props.onPublish("archived")}
        >
          Archive
        </button>
      </section>
    </div>
  );
}
