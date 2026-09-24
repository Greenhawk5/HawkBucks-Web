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
        <div
          role="status"
          aria-live="polite"
          className="glass-panel rounded-xl px-4 py-5 text-sm text-muted-foreground"
        >
          {t("missions.historyLoading")}
        </div>
      ) : isError || !data?.success ? (
        <div
          role="alert"
          className="glass-panel rounded-xl px-4 py-5 text-sm text-muted-foreground"
        >
          {t("missions.historyUnavailable")}
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {periods.map(({ key, labelKey }) => {
            const period = data[key];
            const hasData = period.daysWithData > 0 && period.totalVbucks !== null;

            return (
              <article
                key={key}
                className="glass-panel glass-panel-hover min-w-0 rounded-xl p-4 outline-none transition-all duration-300 focus-visible:border-primary focus-visible:shadow-[var(--shadow-glow)] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <h3 className="break-words font-display text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {t(labelKey)}
                </h3>
                <div className="mt-3 flex min-w-0 items-center gap-2">
                  <VbucksIcon className="h-7 w-7 shrink-0" />
                  <p className="min-w-0 break-words font-display text-2xl font-extrabold tabular-nums text-primary">
                    {hasData ? period.totalVbucks : "—"}
                  </p>
                </div>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {hasData && period.missionCount !== null
                    ? `${period.missionCount} ${t(period.missionCount === 1 ? "common.missionOne" : "common.missionOther")}`
                    : t("common.noRecordedData")}
                </p>
                {
                  <p className="mt-3 break-words text-xs font-semibold text-foreground/80">
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
                    </span>{" "}
                    <span className="font-normal text-muted-foreground">
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
