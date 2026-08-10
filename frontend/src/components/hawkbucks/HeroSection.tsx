import { ASSETS } from "@/lib/assets";
import { StatusBadge } from "./StatusBadge";

export function HeroSection({ total, missionCount }: { total: number; missionCount: number }) {
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:py-14">
      <div className="flex min-w-0 items-center gap-4">
        <img
          src={ASSETS.logo}
          alt="HawkBucks logo"
          className="h-16 w-16 shrink-0 rounded-2xl shadow-[var(--shadow-glow)] sm:h-20 sm:w-20"
        />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">
            Save The World
          </h1>
          <p className="mt-2 font-display text-base font-bold uppercase tracking-widest text-primary sm:text-xl">
            V-Bucks Missions Tracker
          </p>
        </div>
      </div>

      <div className="lg:justify-self-end">
        <StatusBadge total={total} />
      </div>

      <div className="col-span-full border-t border-border/60 pt-4">
        <p className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground sm:text-sm">
          {today} · {missionCount} {missionCount === 1 ? "Mission" : "Missions"}
        </p>
        <p className="mt-1 font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
          DAILY RESETS ARE AT 00:00 UTC
        </p>
      </div>
    </section>
  );
}
