import vbucks from "@/assets/vbucks.png.asset.json";
import { cn } from "@/lib/utils";

export function VbucksIcon({ className }: { className?: string }) {
  return <img src={vbucks.url} alt="V-Bucks" className={cn("h-5 w-5", className)} />;
}

export function RewardBadge({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-panel-border bg-background/50 px-3 py-1.5 font-display text-base font-extrabold tabular-nums text-foreground">
      {amount}
      <VbucksIcon />
    </span>
  );
}
