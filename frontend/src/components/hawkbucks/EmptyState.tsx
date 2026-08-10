import vbucks from "@/assets/vbucks.png.asset.json";

export function EmptyState() {
  return (
    <section className="glass-panel relative overflow-hidden rounded-2xl border-destructive/40 px-6 py-14 text-center">
      <div className="relative mx-auto grid h-24 w-24 place-items-center">
        <span className="animate-ring-pulse absolute inset-0 rounded-full border border-destructive/50" />
        <span
          className="animate-ring-pulse absolute inset-0 rounded-full border border-destructive/30"
          style={{ animationDelay: "1.2s" }}
        />
        <img src={vbucks.url} alt="" aria-hidden className="h-16 w-16 opacity-70 grayscale" />
      </div>
      <h2 className="mt-8 font-display text-2xl font-extrabold uppercase leading-tight sm:text-3xl">
        <span className="text-destructive">No</span> V-Bucks Missions Available Today
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
        Check again after the next Fortnite reset — HawkBucks re-scans every 30 minutes.
      </p>
    </section>
  );
}
