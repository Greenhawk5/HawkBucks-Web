import { cn } from "@/lib/utils";
import { VbucksIcon } from "./RewardBadge";

export function StatusBadge({ total }: { total: number }) {
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
        <div className="text-left">
          <div className="font-display text-3xl font-extrabold leading-none tabular-nums text-primary text-glow">
            {total}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Total V-Bucks
          </div>
        </div>
      ) : (
        <div className="text-left">
          <div className="font-display text-2xl font-extrabold uppercase leading-none text-destructive">
            No
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            V-Bucks Today
          </div>
        </div>
      )}
    </div>
  );
}
