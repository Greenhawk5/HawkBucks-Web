import { Radio } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import { dailyQuoteQueryOptions } from "@/services/missions.loader";

export function DailyQuoteSection() {
  const { t } = useI18n();
  const { data, isPending, isError } = useQuery(dailyQuoteQueryOptions());
  const quote = data?.quote;

  return (
    <section className="mt-10" aria-labelledby="daily-quote-heading">
      <div className="glass-panel relative overflow-hidden rounded-2xl border-primary/40 px-5 py-7 shadow-[var(--shadow-panel)] sm:px-8 sm:py-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -end-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary">
            <Radio className="h-4 w-4" aria-hidden />
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em]">
              {t("quote.heading")}
            </p>
          </div>
          <h2 id="daily-quote-heading" className="sr-only">
            {t("quote.heading")}
          </h2>
          {quote ? (
            <p className="mt-5 max-w-3xl font-display text-lg font-semibold leading-8 tracking-tight sm:text-2xl sm:leading-10">
              {quote}
            </p>
          ) : (
            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              {isPending ? t("quote.pending") : isError ? t("quote.error") : t("quote.empty")}
            </p>
          )}
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {t("quote.credit")}
          </p>
        </div>
      </div>
    </section>
  );
}
