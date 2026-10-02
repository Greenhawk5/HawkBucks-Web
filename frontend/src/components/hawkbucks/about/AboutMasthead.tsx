import { Globe, Server, Users, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n";
import { ASSETS } from "@/lib/assets";

/**
 * About HawkBucks masthead.
 *
 * Left-aligned and flat: the page's argument is information, so the opening
 * is a title, one positioning sentence, and three verifiable facts about the
 * project. No centered logo block, no glow, no marketing superlatives — the
 * logo appears once, small, as a mark of authorship rather than decoration.
 */
export function AboutMasthead() {
  const { t } = useI18n();

  const facts: { label: string; value: string; Icon: LucideIcon | null }[] = [
    { label: t("about.glanceTypeLabel"), value: t("about.glanceTypeValue"), Icon: Users },
    { label: t("about.glanceStackLabel"), value: t("about.glanceStackValue"), Icon: Server },
    { label: t("about.glanceLangLabel"), value: t("about.glanceLangValue"), Icon: Globe },
  ];

  return (
    <header className="border-b border-border/60 pb-9">
      <div className="flex items-center gap-3">
        <img
          src={ASSETS.logo}
          alt={t("seo.logoAlt")}
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-lg"
        />
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          {t("about.kicker")}
        </p>
      </div>

      <h1 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
        {t("about.pageTitle")}
      </h1>

      <p className="mt-5 max-w-[62ch] text-base leading-8 text-muted-foreground sm:text-lg">
        {t("about.lede")}
      </p>

      {/* Facts, not stats: each value is a property of the project that the
          repository and the content source of truth actually support. */}
      <dl className="mt-9 grid gap-x-10 gap-y-6 sm:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="border-t border-border/50 pt-3">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {f.Icon ? <f.Icon aria-hidden className="h-3.5 w-3.5" /> : null}
              {f.label}
            </dt>
            <dd className="mt-1.5 text-sm leading-6 text-foreground">{f.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
