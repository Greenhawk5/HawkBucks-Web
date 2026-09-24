import { ASSETS } from "@/lib/assets";
import { StatusBadge } from "./StatusBadge";
import { MissionResetLine } from "./MissionResetLine";
import { formatLocalDate } from "@/lib/local-time";
import { useUserTimeZone } from "@/hooks/use-user-timezone";
import { useI18n } from "@/i18n";

export function HeroSection({ total, missionCount }: { total: number; missionCount: number }) {
  const { t, locale } = useI18n();
  const timeZone = useUserTimeZone();
  const today = new Date().toISOString();
  const todayLocal = formatLocalDate(today, { timeZone: timeZone ?? "UTC", locale });
  const todayTitle = timeZone ? t("time.todayTitle", { timeZone }) : t("time.todayTitleFallback");

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:py-14">
      <div className="flex min-w-0 items-center gap-4">
        <img
          src={ASSETS.logo}
          alt={t("seo.logoAlt")}
          className="h-16 w-16 shrink-0 rounded-2xl shadow-[var(--shadow-glow)] sm:h-20 sm:w-20"
        />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mt-2 font-display text-base font-bold uppercase tracking-widest text-primary sm:text-xl">
            {t("hero.subtitle")}
          </p>
        </div>
      </div>

      <div className="lg:justify-self-end">
        <StatusBadge total={total} />
      </div>

      <div className="col-span-full border-t border-border/60 pt-4">
        <p
          className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground sm:text-sm"
          title={todayTitle}
        >
          {todayLocal} · {missionCount}{" "}
          {t(missionCount === 1 ? "common.missionOne" : "common.missionOther")}
        </p>
        <MissionResetLine className="mt-1 font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60" />
      </div>
    </section>
  );
}
