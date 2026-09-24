import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import type { TranslationKey } from "@/i18n/types";
import { VbucksIcon } from "./RewardBadge";
import type { HistoryPeriod, MissionsHistoryResponse } from "@/lib/missions.types";
import { missionsHistoryQueryOptions } from "@/services/missions.loader";

const periods: Array<{
  key: keyof Omit<MissionsHistoryResponse, "success" | "date">;
  labelKey: TranslationKey;
}> = [
  { key: "today", labelKey: "missions.periodToday" },
  { key: "yesterday", labelKey: "missions.periodYesterday" },
  { key: "last7Days", labelKey: "missions.periodWeek" },
  { key: "last30Days", labelKey: "missions.periodMonth" },
  { key: "thisYear", labelKey: "missions.periodYear" },
];

function formatComparison(period: HistoryPeriod) {
  if (!period.comparison) return "—";
  const sign = period.comparison.percent > 0 ? "+" : "";
  return `${sign}${period.comparison.percent}%`;
}

export function MissionsHistory() {
  const { t } = useI18n();
  const { data, isPending, isError } = useQuery(missionsHistoryQueryOptions());

  return (
    <section className="mt-12" aria-labelledby="mission-history-heading">
      <div className="mb-4">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          {t("missions.historyEyebrow")}
        </p>
        <h2
          id="mission-history-heading"
          className="mt-2 font-display text-xl font-bold tracking-tight"
        >
          {t("missions.historyTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("missions.historyDesc")}</p>
      </div>

      {isPending ? (
        <div className="glass-panel rounded-xl px-4 py-5 text-sm text-muted-foreground">
          {t("missions.historyLoading")}
        </div>
      ) : isError || !data?.success ? (
        <div className="glass-panel rounded-xl px-4 py-5 text-sm text-muted-foreground">
          {t("missions.historyUnavailable")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {periods.map(({ key, labelKey }) => {
            const period = data[key];
            const hasData = period.daysWithData > 0 && period.totalVbucks !== null;

            return (
              <article
                key={key}
                tabIndex={0}
                className="glass-panel glass-panel-hover rounded-xl p-4 outline-none transition-all duration-300 focus-visible:border-primary focus-visible:shadow-[var(--shadow-glow)] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {t(labelKey)}
                </h3>
                <div className="mt-3 flex items-center gap-2">
                  <VbucksIcon className="h-7 w-7 shrink-0" />
                  <p className="font-display text-2xl font-extrabold tabular-nums text-primary">
                    {hasData ? period.totalVbucks : "—"}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasData && period.missionCount !== null
                    ? `${period.missionCount} ${t(period.missionCount === 1 ? "common.missionOne" : "common.missionOther")}`
                    : t("common.noRecordedData")}
                </p>
                {
                  <p
                    className="mt-3 text-xs font-semibold text-foreground/80"
                    title={t("common.vsPreviousPeriod")}
                  >
                    <span
                      className={
                        !period.comparison
                          ? "text-muted-foreground"
                          : period.comparison.percent > 0
                            ? "text-primary"
                            : period.comparison.percent < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                      }
                    >
                      {formatComparison(period)}
                    </span>
                    <span className="ml-1 font-normal text-muted-foreground">
                      {t("common.vsPreviousPeriod")}
                      {period.comparison && ` · ${period.comparison.baselineTotalVbucks} V-Bucks`}
                    </span>
                  </p>
                }
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
