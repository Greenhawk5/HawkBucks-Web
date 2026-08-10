import { ASSETS } from "@/lib/assets";

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <section className="glass-panel relative overflow-hidden rounded-2xl border-destructive/40 px-6 py-14 text-center">
      <div className="relative mx-auto grid h-24 w-24 place-items-center">
        <span className="animate-ring-pulse absolute inset-0 rounded-full border border-destructive/50" />
        <span
          className="animate-ring-pulse absolute inset-0 rounded-full border border-destructive/30"
          style={{ animationDelay: "1.2s" }}
        />
        <img src={ASSETS.vbucks} alt="" aria-hidden className="h-16 w-16 opacity-70 grayscale" />
      </div>
      <h2 className="mt-8 font-display text-2xl font-extrabold uppercase leading-tight sm:text-3xl">
        <span className="text-destructive">Mission</span> Feed Unavailable
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
        HawkBucks could not reach the mission service. Please try again in a moment.
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center rounded-full border border-panel-border bg-background/50 px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-primary transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-glow)]"
        >
          Retry
        </button>
      ) : null}
    </section>
  );
}
