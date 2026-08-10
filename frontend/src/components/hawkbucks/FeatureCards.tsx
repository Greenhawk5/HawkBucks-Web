import { Gift, RefreshCw, ScanSearch, Zap } from "lucide-react";

const features = [
  {
    icon: ScanSearch,
    title: "Automatic Tracking",
    detail:
      "Mission alerts are checked automatically so you never miss daily V-Bucks opportunities.",
  },
  {
    icon: RefreshCw,
    title: "Real-Time Updates",
    detail: "Updated every 30 minutes according to Fortnite UTC reset schedule.",
  },
  {
    icon: Zap,
    title: "Instant Overview",
    detail: "See reward, location, zone and power level in seconds.",
  },
  {
    icon: Gift,
    title: "Free Community Tool",
    detail: "No account, no ads, no paywall. Built for the Save The World community.",
  },
];

export function FeatureCards() {
  return (
    <section>
      <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.25em] text-primary">
        Capabilities
      </p>
      <h2 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-wide sm:text-3xl">
        Features
      </h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="glass-panel glass-panel-hover animate-rise group relative overflow-hidden rounded-2xl p-6 sm:p-7"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/15 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
            <span className="relative grid h-12 w-12 place-items-center rounded-xl border border-panel-border bg-background/60 transition-all duration-300 group-hover:border-primary group-hover:shadow-[var(--shadow-glow)]">
              <f.icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
            </span>
            <h3 className="relative mt-6 font-display text-base font-extrabold uppercase tracking-wide transition-colors duration-300 group-hover:text-primary">
              {f.title}
            </h3>
            <p className="relative mt-2.5 text-sm leading-relaxed text-muted-foreground">
              {f.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
