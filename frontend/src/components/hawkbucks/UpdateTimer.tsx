import { useEffect, useState } from "react";
import { formatUtc, formatUtcTime, nextUpdate } from "@/lib/missions";

function countdown(target: Date, now: Date) {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function UpdateTimer({ lastUpdated }: { lastUpdated: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = nextUpdate(now ?? new Date(lastUpdated));

  return (
    <div className="glass-panel grid gap-3 rounded-xl px-4 py-3 text-xs sm:grid-cols-3 sm:items-center">
      <div>
        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Last Updated
        </span>
        <span className="font-display font-bold tabular-nums">
          {formatUtc(new Date(lastUpdated))}
        </span>
      </div>
      <div className="sm:text-center">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Next Update
        </span>
        <span className="font-display font-bold tabular-nums">{formatUtcTime(next)}</span>
      </div>
      <div className="sm:text-right">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Refresh In
        </span>
        <span className="font-display font-bold tabular-nums text-primary">
          {now ? countdown(next, now) : "--:--"}
        </span>
      </div>
    </div>
  );
}
