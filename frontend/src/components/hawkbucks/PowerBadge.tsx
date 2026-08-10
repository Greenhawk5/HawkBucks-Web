import { ASSETS } from "@/lib/assets";

export function PowerBadge({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-2xl font-extrabold tabular-nums leading-none sm:text-3xl">
        {level}
      </span>
      <span className="flex flex-col items-center border-l border-border/70 pl-2">
        <img src={ASSETS.power} alt="" aria-hidden className="h-4 w-4" />
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          Power
        </span>
      </span>
    </div>
  );
}
