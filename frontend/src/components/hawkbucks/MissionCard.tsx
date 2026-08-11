import { useEffect, useRef, useState } from "react";
import { missionIcon, MISSION_ICON_FALLBACK } from "@/lib/mission-icons";
import type { Mission } from "@/lib/missions.types";
import { PowerBadge } from "./PowerBadge";
import { RewardBadge } from "./RewardBadge";

export function ZoneBadge({ zone }: { zone: string }) {
  return (
    <span className="inline-flex rounded-full border border-panel-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
      {zone}
    </span>
  );
}

function MissionIcon({ mission }: { mission: Mission }) {
  const [src, setSrc] = useState(missionIcon(mission.type));
  const ref = useRef<HTMLImageElement>(null);

  const handleFallback = () => setSrc((s) => (s === MISSION_ICON_FALLBACK ? s : MISSION_ICON_FALLBACK));

  // Covers images that already failed before hydration attached onError.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) handleFallback();
  }, [src]);

  return (
    <img ref={ref} src={src} alt="" aria-hidden className="h-9 w-9" onError={handleFallback} />
  );
}


export function MissionCard({ mission, index }: { mission: Mission; index: number }) {
  return (
    <article
      className="glass-panel animate-rise grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-glow)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-panel-border bg-background/40">
        <MissionIcon mission={mission} />
      </div>

      <div className="min-w-0">
        <h3 className="truncate font-display text-lg font-extrabold uppercase leading-tight sm:text-xl">
          {mission.name}
        </h3>
        <div className="mt-2">
          <ZoneBadge zone={mission.zone} />
        </div>
      </div>

      <div className="col-span-2 flex items-center justify-between gap-4 border-t border-border/60 pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:gap-2 sm:border-0 sm:pt-0">
        <PowerBadge level={mission.powerLevel} />
        <RewardBadge amount={mission.vbucks} />
      </div>
    </article>
  );
}
