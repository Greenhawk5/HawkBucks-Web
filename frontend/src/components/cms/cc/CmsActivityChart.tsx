import { lazy, Suspense, useState } from "react";

import type { ActivitySeriesPoint } from "@/lib/cms/activity-intel.loader";

/**
 * Wave 2 — Activity trend chart (route-level lazy, client-only).
 *
 * Recharts is already a dependency (components/ui/chart.tsx); this module is
 * imported via React.lazy from the Activity route only, so no other CMS page
 * pays for the charting library. Multi-series area chart with interactive
 * legend selection (click a series to isolate, click again to restore),
 * hover tooltips, and gradient area fills in the HawkBucks palette.
 * Data is real per-day buckets from getActivitySeries — zeros render as
 * zeros, honestly.
 */

const LazyChart = lazy(() =>
  import("recharts").then((m) => ({
    default: function ActivityRechart(props: { days: ActivitySeriesPoint[] }) {
      const [hidden, setHidden] = useState<Set<string>>(new Set());
      const toggle = (key: string) =>
        setHidden((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      const allHidden = hidden.size >= 4;
      const series = [
        { key: "successfulLogins", label: "Successful logins", color: "var(--cc-accent)" },
        { key: "failedLogins", label: "Failed logins", color: "var(--cc-danger)" },
        { key: "contentChanges", label: "Content changes", color: "var(--cc-cyan)" },
        { key: "mediaOperations", label: "Media ops", color: "var(--cc-amber)" },
      ] as const;
      const data = props.days.map((d) => ({
        day: d.day.slice(5),
        successfulLogins: d.successfulLogins,
        failedLogins: d.failedLogins,
        contentChanges: d.contentChanges,
        mediaOperations: d.mediaOperations,
      }));
      const { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } =
        m;
      return (
        <div>
          <div style={{ width: "100%", height: 260 }} dir="ltr">
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  {series.map((s) => (
                    <linearGradient key={s.key} id={`cc-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="var(--cc-edge)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "var(--cc-mist)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: "var(--cc-mist)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--cc-panel-2)",
                    border: "1px solid var(--cc-edge)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "var(--cc-frost)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px" }}
                  onClick={(e) => {
                    const key = typeof e.dataKey === "string" ? e.dataKey : String(e.value ?? "");
                    const found = series.find((s) => s.key === key || s.label === e.value);
                    if (found) toggle(found.key);
                  }}
                />
                {series.map((s) =>
                  hidden.has(s.key) ? null : (
                    <Area
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={2}
                      fill={`url(#cc-grad-${s.key})`}
                      dot={false}
                      activeDot={{ r: 3 }}
                      opacity={allHidden ? 1 : hidden.size > 0 ? 1 : 0.9}
                    />
                  ),
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] opacity-60">
            Click a legend entry to isolate a series; click again to restore. Days with no events
            render as zero — absence of data is shown, not filled in.
          </p>
        </div>
      );
    },
  })),
);

export function CmsActivityChart(props: { days: ActivitySeriesPoint[] }) {
  const total = props.days.reduce(
    (n, d) => n + d.successfulLogins + d.failedLogins + d.contentChanges + d.mediaOperations,
    0,
  );
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-8 text-center">
        <p className="text-sm font-medium">No activity in this period yet</p>
        <p className="max-w-sm text-xs leading-relaxed opacity-70">
          The chart appears once login, content, or media events are recorded. New events are
          tracked going forward — history is never backfilled.
        </p>
      </div>
    );
  }
  return (
    <Suspense
      fallback={
        <div className="grid h-[260px] place-items-center" role="status" aria-label="Loading chart">
          <p className="text-xs opacity-60">Loading chart…</p>
        </div>
      }
    >
      <LazyChart days={props.days} />
    </Suspense>
  );
}
