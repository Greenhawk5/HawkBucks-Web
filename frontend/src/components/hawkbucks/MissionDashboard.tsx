import { groupByArea } from "@/lib/missions";
import type { Mission } from "@/lib/missions.types";
import { MissionCard } from "./MissionCard";

export function MissionDashboard({ missions }: { missions: Mission[] }) {
  const areas = groupByArea(missions);
  let cardIndex = 0;

  return (
    <section className="space-y-6" aria-label="Today's V-Bucks missions">
      {areas.map((group, i) => (
        <div key={group.area} className="space-y-3">
          <div className="glass-panel flex items-center justify-between rounded-xl px-4 py-2.5">
            <h2 className="font-display text-base font-extrabold uppercase tracking-wide sm:text-lg">
              {group.area}
            </h2>
            <span className="font-display text-sm font-bold tabular-nums text-primary">
              {String(i + 1).padStart(2, "0")}
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
