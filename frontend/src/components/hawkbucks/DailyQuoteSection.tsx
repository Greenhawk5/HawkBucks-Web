import { Radio } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dailyQuoteQueryOptions } from "@/services/missions.api";

export function DailyQuoteSection() {
  const { data } = useQuery(dailyQuoteQueryOptions());

  if (!data?.quote) return null;

  return (
    <section className="mt-10" aria-labelledby="daily-quote-heading">
      <div className="glass-panel relative overflow-hidden rounded-2xl border-primary/40 px-5 py-7 shadow-[var(--shadow-panel)] sm:px-8 sm:py-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary">
            <Radio className="h-4 w-4" aria-hidden />
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em]">
              Daily Save the World Quote
            </p>
          </div>
          <h2 id="daily-quote-heading" className="sr-only">
            Daily Save the World Quote
          </h2>
          <p className="mt-5 max-w-3xl font-display text-lg font-semibold leading-8 tracking-tight sm:text-2xl sm:leading-10">
            {data.quote}
          </p>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            HawkBucks · Daily Transmission
          </p>
        </div>
      </div>
    </section>
  );
}
