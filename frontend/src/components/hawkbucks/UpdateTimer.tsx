import { useEffect, useState } from "react";
import { formatUtc, formatUtcTime } from "@/lib/missions";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";

export function UpdateTimer({ lastUpdated }: { lastUpdated: string }) {
  const { next, refreshIn } = useRefreshCountdown(lastUpdated);

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
        <span className="font-display font-bold tabular-nums text-primary">{refreshIn}</span>
      </div>
    </div>
  );
}
