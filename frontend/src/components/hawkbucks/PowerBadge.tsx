import { ASSETS } from "@/lib/assets";

export function PowerBadge({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-2xl font-extrabold tabular-nums leading-none sm:text-3xl">
        {level}
      </span>
      <span className="flex flex-col items-center border-l border-border/70 pl-2">
        {/* Purely decorative icon next to the visible "Power" label: rendered as a
            CSS background (same approved asset, same 16px size) so it stays out of
            the accessibility tree and is not announced redundantly. */}
        <span
          aria-hidden="true"
          className="block h-4 w-4 shrink-0 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${ASSETS.power})` }}
        />
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          Power
        </span>
      </span>
    </div>
  );
}
