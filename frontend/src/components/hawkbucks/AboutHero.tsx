import logo from "@/assets/logo.png.asset.json";

export function AboutHero() {
  return (
    <section className="relative py-12 text-center lg:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-40 w-40 rounded-full bg-primary/15 blur-3xl"
      />
      <img
        src={logo.url}
        alt="HawkBucks logo"
        className="relative mx-auto h-20 w-20 rounded-2xl shadow-[var(--shadow-glow)]"
      />
      <h1 className="relative mt-6 font-display text-3xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">
        What is HawkBucks?
      </h1>
      <p className="relative mx-auto mt-4 max-w-2xl font-display text-sm font-bold uppercase tracking-widest text-primary sm:text-base">
        Your daily Fortnite Save The World V-Bucks mission intelligence dashboard.
      </p>
      <p className="relative mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        HawkBucks automatically analyzes Fortnite Save The World mission alerts and shows players
        where V-Bucks missions are available, including reward amount, location, mission type, zone
        and power level — without opening the game.
      </p>
    </section>
  );
}
