import { Radio } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import { dailyQuoteQueryOptions } from "@/services/missions.loader";

/**
 * Homebase transmission console — the daily Save the World quote.
 *
 * Keeps the existing dark-green identity (glass panel, thin green border,
 * uppercase label, display-font quote, small attribution). Pure-CSS,
 * GPU-friendly entrance runs once on mount; hover only brightens the surface.
 * The card is NOT actionable: no button, no link, no click target.
 */
export function DailyQuoteSection() {
  const { t } = useI18n();
  const { data, isPending, isError } = useQuery(dailyQuoteQueryOptions());
  const quote = data?.quote;

  return (
    <section className="mt-10" aria-labelledby="daily-quote-heading">
      <div className="hb-quote-console glass-panel group relative animate-rise overflow-hidden rounded-2xl border-primary/40 px-5 py-7 shadow-[var(--shadow-panel)] transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[var(--shadow-panel-hover)] motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:transform-none sm:px-8 sm:py-9">
        {/* Decorative atmosphere only: glow + gradient + faint scanlines. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-[8%] top-[30%] h-48 w-[70%] rounded-full bg-primary/[0.07] opacity-70 blur-3xl transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.82_0.23_145/0.05),transparent_45%)]" />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent_0_3px,oklch(0.82_0.23_145/0.6)_3px_4px)] opacity-[0.05]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -end-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex items-center gap-2 text-primary">
              <Radio className="h-4 w-4" aria-hidden />
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em]">
                {t("quote.heading")}
              </p>
            </span>
            <span
              aria-hidden
              className="hb-quote-signal inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary/80"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Live
            </span>
          </div>
          <h2 id="daily-quote-heading" className="sr-only">
            {t("quote.heading")}
          </h2>
          {quote ? (
            <figure
              key={quote}
              className="hb-quote-body mt-5 animate-rise [animation-delay:120ms] motion-reduce:animate-none"
            >
              <blockquote className="relative max-w-3xl ps-5 sm:ps-6">
                <span
                  aria-hidden
                  className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-primary/60"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-4 start-5 select-none font-display text-6xl font-extrabold leading-none text-primary/[0.12] sm:-top-5 sm:text-7xl"
                >
                  &ldquo;
                </span>
                <p className="font-display text-lg font-semibold leading-8 tracking-tight text-foreground sm:text-2xl sm:leading-10">
                  {quote}
                </p>
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <span aria-hidden className="h-px w-8 bg-primary/30" />
                {t("quote.credit")}
              </figcaption>
            </figure>
          ) : (
            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              {isPending ? t("quote.pending") : isError ? t("quote.error") : t("quote.empty")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
