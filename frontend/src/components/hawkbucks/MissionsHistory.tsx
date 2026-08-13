import { useQuery } from "@tanstack/react-query";
import type { HistoryPeriod, MissionsHistoryResponse } from "@/lib/missions.types";
import { missionsHistoryQueryOptions } from "@/services/missions.api";

const periods: Array<{
  key: keyof Omit<MissionsHistoryResponse, "success" | "date">;
  label: string;
}> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7Days", label: "Last 7 Days" },
  { key: "last30Days", label: "Last 30 Days" },
  { key: "thisYear", label: "This Year" },
];

function formatComparison(period: HistoryPeriod) {
  if (!period.comparison) return "—";
  const sign = period.comparison.percent > 0 ? "+" : "";
  return `${sign}${period.comparison.percent}%`;
}

export function MissionsHistory() {
  const { data, isPending, isError } = useQuery(missionsHistoryQueryOptions());

  return (
    <section className="mt-12" aria-labelledby="mission-history-heading">
      <div className="mb-4">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Daily archive
        </p>
        <h2
          id="mission-history-heading"
          className="mt-2 font-display text-xl font-bold tracking-tight"
        >
          V-Bucks Missions History
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Historical totals from recorded Fortnite Save the World mission alerts.
        </p>
      </div>

      {isPending ? (
        <div className="glass-panel rounded-xl px-4 py-5 text-sm text-muted-foreground">
          Loading mission history…
        </div>
      ) : isError || !data?.success ? (
        <div className="glass-panel rounded-xl px-4 py-5 text-sm text-muted-foreground">
          History is not available yet. New daily records will appear after the next successful
          refresh.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {periods.map(({ key, label }) => {
            const period = data[key];
            const hasData = period.daysWithData > 0 && period.totalVbucks !== null;

            return (
              <article key={key} className="glass-panel rounded-xl p-4">
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </h3>
                <p className="mt-3 font-display text-2xl font-extrabold tabular-nums text-primary">
                  {hasData ? `${period.totalVbucks} V-Bucks` : "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasData && period.missionCount !== null
                    ? `${period.missionCount} mission${period.missionCount === 1 ? "" : "s"}`
                    : "No recorded data"}
                </p>
                {key !== "today" && key !== "yesterday" && (
                  <p
                    className="mt-3 text-xs font-semibold text-foreground/80"
                    title="Compared with the previous equivalent period"
                  >
                    {formatComparison(period)}
                    <span className="ml-1 font-normal text-muted-foreground">
                      vs previous period
                    </span>
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
