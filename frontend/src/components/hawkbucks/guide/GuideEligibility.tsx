import { useState } from "react";
import { Check, X } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

type PlayerType = "founder" | "f2p";

interface EligibilityRow {
  labelKey: "guide.eligibilityAccessLabel" | "guide.eligibilityVbucksLabel";
  /** Which player types the row is affirmative for. */
  yes: readonly PlayerType[];
}

const ROWS: readonly EligibilityRow[] = [
  { labelKey: "guide.eligibilityAccessLabel", yes: ["founder", "f2p"] },
  { labelKey: "guide.eligibilityVbucksLabel", yes: ["founder"] },
];

/**
 * Founder vs new free-to-play eligibility, as a two-tab switcher.
 *
 * A beginner's most valuable question ("can I earn V-Bucks?") is answered here
 * with an icon AND a text label per cell, so the answer never depends on
 * color alone. Uses native buttons + `aria-pressed` rather than a custom tab
 * widget: two mutually exclusive choices need no more, and this keeps
 * keyboard and screen-reader behavior correct without a focus-management
 * layer. All cells stay in the DOM for both tabs, so the full comparison is
 * also present in server-rendered HTML.
 */
export function GuideEligibility() {
  const { t } = useI18n();
  const [player, setPlayer] = useState<PlayerType>("founder");

  const tabs: ReadonlyArray<{
    id: PlayerType;
    labelKey: "guide.eligibilityFounderTab" | "guide.eligibilityF2pTab";
  }> = [
    { id: "founder", labelKey: "guide.eligibilityFounderTab" },
    { id: "f2p", labelKey: "guide.eligibilityF2pTab" },
  ];

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6">
      <h2
        id="guide-eligibility-heading"
        className="break-words font-display text-lg font-extrabold tracking-tight sm:text-xl"
      >
        {t("guide.eligibilityTitle")}
      </h2>
      <p className="mt-2 max-w-prose break-words text-sm leading-6 text-muted-foreground">
        {t("guide.eligibilityDesc")}
      </p>

      <div
        role="group"
        aria-labelledby="guide-eligibility-heading"
        className="mt-4 inline-flex flex-wrap gap-1 rounded-xl border border-panel-border bg-background/40 p-1"
      >
        {tabs.map((tab) => {
          const active = player === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={active}
              onClick={() => setPlayer(tab.id)}
              className={cn(
                "min-h-[40px] cursor-pointer rounded-lg px-3.5 py-2 font-display text-xs font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <dl className="mt-4 grid gap-2">
        {ROWS.map((row) => {
          const allowed = row.yes.includes(player);
          return (
            <div
              key={row.labelKey}
              className="flex items-center justify-between gap-4 rounded-xl border border-panel-border bg-background/30 px-4 py-3"
            >
              <dt className="min-w-0 break-words text-sm font-semibold">{t(row.labelKey)}</dt>
              <dd
                className={cn(
                  "flex shrink-0 items-center gap-2 font-display text-sm font-extrabold",
                  allowed ? "text-primary" : "text-muted-foreground",
                )}
              >
                {allowed ? (
                  <Check aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <X aria-hidden="true" className="h-4 w-4" />
                )}
                {t(allowed ? "guide.eligibilityYes" : "guide.eligibilityNo")}
              </dd>
            </div>
          );
        })}
      </dl>

      <p
        className="mt-4 max-w-prose break-words border-t border-border/50 pt-4 text-[13px] leading-6 text-muted-foreground"
        aria-live="polite"
      >
        {t(player === "founder" ? "guide.eligibilityFounderNote" : "guide.eligibilityF2pNote")}
      </p>
    </div>
  );
}
