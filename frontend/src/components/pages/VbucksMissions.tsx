import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, Clock3, History, Layers, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n";
import { EmptyState } from "@/components/hawkbucks/EmptyState";
import { MissionDashboard } from "@/components/hawkbucks/MissionDashboard";
import { MissionsHistory } from "@/components/hawkbucks/MissionsHistory";
import { StatusBadge } from "@/components/hawkbucks/StatusBadge";
import { LocalizedTime } from "@/components/hawkbucks/LocalizedTime";
import { VbucksIcon } from "@/components/hawkbucks/RewardBadge";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { useUserTimeZone } from "@/hooks/use-user-timezone";
import { formatUtcTime } from "@/lib/missions";
import { formatUtcMidnightWithLocalEquivalent } from "@/lib/local-time";
import { missionsQueryOptions } from "@/services/missions.loader";
import { localizePath, splitLocalePath } from "@/lib/locale-urls";

export function VbucksMissionsPage() {
  const { t, locale, currentLanguage } = useI18n();
  const { pathname } = useLocation();
  const guideTo = localizePath(
    "/missions-guide",
    splitLocalePath(pathname).locale ?? currentLanguage,
  );
  const { data } = useSuspenseQuery(missionsQueryOptions());
  const hasMissions = data.status === "available" && data.missions.length > 0;
  const { next, refreshIn } = useRefreshCountdown(data.lastUpdated);
  const timeZone = useUserTimeZone();
  const boundaryUtc = new Date(next);
  boundaryUtc.setUTCHours(0, 0, 0, 0);
  const resetPair = formatUtcMidnightWithLocalEquivalent(
    boundaryUtc.toISOString().slice(0, 10),
    timeZone ? { timeZone, locale } : { locale },
  );

  return (
    <div className="px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      {/* Phase 9: live-tracker identity — explicit badge + guide pointer so the
          tracker is never mistaken for the Phase 10 educational guide. */}
      <section
        aria-labelledby="tracker-heading"
        className="grid items-end gap-6 border-b border-border/60 pb-7 lg:grid-cols-[1fr_auto]"
      >
        <div className="min-w-0 max-w-2xl">
          <p className="flex flex-wrap items-center gap-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <span>{t("missions.pageEyebrow")}</span>
            <span className="inline-flex min-h-[24px] items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 normal-case tracking-normal">
              <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {t("missions.trackerBadge")}
            </span>
          </p>
          <h1
            id="tracker-heading"
            className="mt-3 break-words font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            {t("missions.pageTitle")}
          </h1>
          <p className="mt-3 break-words text-sm leading-6 text-muted-foreground sm:text-base">
            {t("missions.pageDesc")}
          </p>
          <p className="mt-4">
            <Link
              to={guideTo}
              className="group inline-flex min-h-[44px] items-center gap-1.5 rounded-md text-xs font-semibold text-primary outline-none transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("missions.guidePointer")}
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none rtl:group-hover:-translate-x-0.5 rtl:rotate-180"
              />
            </Link>
          </p>
        </div>

        <StatusBadge total={data.totalVbucks} />
      </section>

      <MissionsHistory />

      <section className="mt-10" aria-labelledby="today-missions-heading">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="today-missions-heading"
              className="font-display text-xl font-bold tracking-tight"
            >
              {t("missions.todayHeading")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("missions.todayDesc")}</p>
          </div>
          {hasMissions && (
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              {t("common.alertsFound", { count: data.missions.length })}
            </span>
          )}
        </div>
        <div className="mb-6 grid overflow-hidden rounded-2xl border border-panel-border bg-background/20 lg:grid-cols-[1.15fr_1fr] lg:divide-x lg:divide-border/40">
          <section className="px-5 py-4 sm:px-6" aria-label={t("missions.updateStatus")}>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t("missions.updateStatus")}
            </p>
            <dl className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <History className="h-3.5 w-3.5" aria-hidden />
                  {t("time.updated")}
                </dt>
                <dd
                  className="mt-1.5 text-[13px] font-semibold tabular-nums"
                  title={
                    timeZone
                      ? t("time.lastUpdatedTitle", { timeZone })
                      : t("time.lastUpdatedTitleFallback")
                  }
                >
                  <LocalizedTime value={data.lastUpdated} kind="datetime" /> {t("common.localTime")}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden />
                  {t("time.nextUpdate")}
                </dt>
                <dd
                  className="mt-1.5 text-[13px] font-semibold tabular-nums"
                  title={
                    timeZone
                      ? t("time.nextUpdateTitle", { utc: formatUtcTime(next), timeZone })
                      : t("time.nextUpdateTitleFallback")
                  }
                >
                  <LocalizedTime value={next} kind="datetime" /> {t("common.local")}
                </dd>
                <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {resetPair.utc} → {resetPair.local}
                </p>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  {t("time.refreshIn")}
                </dt>
                <dd className="mt-1.5 font-display text-sm font-bold tabular-nums text-primary">
                  {refreshIn}
                </dd>
              </div>
            </dl>
          </section>

          <section
            className="flex items-center justify-around gap-6 border-t border-border/40 px-5 py-5 sm:px-6 lg:border-t-0"
            aria-label={t("missions.updateStatus")}
          >
            <div className="text-center">
              <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Layers className="h-3.5 w-3.5" aria-hidden />
                {t("missions.missionsLabel")}
              </p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular-nums leading-none">
                {data.missions.length}
              </p>
            </div>
            <div className="h-10 w-px bg-border/40" role="presentation" />
            <div className="text-center">
              <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <VbucksIcon className="h-3.5 w-3.5" />
                {t("missions.vbucksLabel")}
              </p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular-nums leading-none text-primary">
                {data.totalVbucks}
              </p>
            </div>
          </section>
        </div>
        {hasMissions ? <MissionDashboard missions={data.missions} /> : <EmptyState />}
      </section>
    </div>
  );
}
