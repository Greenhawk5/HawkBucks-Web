import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/cms/admin.loader";
import { getAdminHero } from "@/lib/cms/heroes-admin.loader";
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
  component: HeroEditor,
});
import {
  publishAdminContent,
  updateAdminHero,
  upsertAdminTranslation,
} from "@/lib/cms/heroes-admin.loader";
import { upsertAdminAbility } from "@/lib/cms/loadouts-admin.loader";
function HeroEditor() {
  type HeroDetail = Awaited<ReturnType<typeof getAdminHero>>["hero"];
  const { session, hero } = Route.useLoaderData() as {
    session: { authenticated: boolean };
    hero: HeroDetail;
  };
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  if (!session.authenticated || !hero)
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm">
          <Link to="/admin/heroes" className="underline">
            Back
          </Link>
          .
        </p>
      </main>
    );
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold">Edit hero</h1>
      <p className="mt-2 text-sm">
        Status: {hero.status}. Abilities: {hero.abilities.length}. Locales:{" "}
        {hero.locales.join(", ") || "none"}.
      </p>
      {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
      <FullHeroForm hero={hero} onMsg={setMsg} reload={() => router.invalidate()} />
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
  onMsg: (m: string) => void;
  reload: () => Promise<void>;
}) {
  const hero = props.hero;
  const [heroClass, setHeroClass] = useState(hero.heroClass);
  const [locale, setLocale] = useState(hero.defaultLocale);
  const active = hero.translations.find((t) => t.locale === locale) ?? hero.translations[0];
  const [title, setTitle] = useState(active?.title ?? "");
  const [body, setBody] = useState(active?.body ?? "");
  const [abilityKey, setAbilityKey] = useState("");
  const [abilityName, setAbilityName] = useState("");
  return (
    <div className="mt-4 space-y-4 text-sm">
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
      <button
        type="button"
        className="rounded bg-primary px-3 py-1 text-primary-foreground"
        onClick={async () => {
          await updateAdminHero({ data: { contentId: hero.contentId, heroClass } });
          props.onMsg("Identity saved.");
          await props.reload();
        }}
      >
        Save identity
      </button>
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
      <button
        type="button"
        className="rounded bg-primary px-3 py-1 text-primary-foreground"
        onClick={async () => {
          await upsertAdminTranslation({
            data: { contentId: hero.contentId, locale, title, body },
          });
          props.onMsg("Translation saved.");
          await props.reload();
        }}
      >
        Save translation
      </button>
      <div className="flex flex-wrap gap-2">
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
          onClick={async () => {
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
            props.onMsg("Ability saved.");
            await props.reload();
          }}
        >
          Add ability
        </button>
      </div>
    </div>
  );
}
