import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { VbucksIcon } from "./RewardBadge";

export function StatusBadge({ total }: { total: number }) {
  const { t } = useI18n();
  const available = total > 0;

  return (
    <div
      className={cn(
        "glass-panel animate-glow-pulse inline-flex items-center gap-3 rounded-2xl px-4 py-3",
        !available && "border-destructive/60",
      )}
    >
      <VbucksIcon className="h-9 w-9" />
      {available ? (
        <div className="text-start">
          <div className="font-display text-3xl font-extrabold leading-none tabular-nums text-primary text-glow">
            {total}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("missions.totalVbucks")}
          </div>
        </div>
      ) : (
        <div className="text-start">
          <div className="font-display text-2xl font-extrabold uppercase leading-none text-destructive">
            {t("missions.noneTitle")}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("missions.noneSubtitle")}
          </div>
        </div>
      )}
    </div>
  );
}
