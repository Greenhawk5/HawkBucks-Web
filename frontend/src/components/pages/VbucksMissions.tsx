import { useSuspenseQuery } from "@tanstack/react-query";
import { Clock3, History, Layers, RefreshCw } from "lucide-react";
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

export function VbucksMissionsPage() {
  const { t, locale } = useI18n();
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
      <section className="grid items-end gap-6 border-b border-border/60 pb-7 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            {t("missions.pageEyebrow")}
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("missions.pageTitle")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {t("missions.pageDesc")}
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
