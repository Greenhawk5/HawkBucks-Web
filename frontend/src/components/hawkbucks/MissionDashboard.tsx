import { useI18n } from "@/i18n";
import { formatZoneMissionCount, groupByArea } from "@/lib/missions";
import type { Mission } from "@/lib/missions.types";
import { MissionCard } from "./MissionCard";

export function MissionDashboard({ missions }: { missions: Mission[] }) {
  const { t } = useI18n();
  const areas = groupByArea(missions);
  let cardIndex = 0;

  return (
    <section className="space-y-6" aria-label={t("missions.dashboardLabel")}>
      {areas.map((group) => (
        <div key={group.area} className="space-y-3">
          <div className="glass-panel flex items-center justify-between rounded-xl px-4 py-2.5">
            <h2 className="font-display text-base font-extrabold uppercase tracking-wide sm:text-lg">
              {group.area}
            </h2>
            {/* The badge shows the number of rendered missions in this zone,
                never the zone's positional order. */}
            <span
              className="font-display text-sm font-bold tabular-nums text-primary"
              aria-label={t("missions.groupAria", {
                area: group.area,
                count: group.missions.length,
              })}
            >
              {formatZoneMissionCount(group.missions.length)}
            </span>
          </div>
          <div className="space-y-3">
            {group.missions.map((mission) => (
              <MissionCard key={mission.id} mission={mission} index={cardIndex++} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
