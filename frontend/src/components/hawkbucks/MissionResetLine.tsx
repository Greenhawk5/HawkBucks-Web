import { formatUtcMidnightWithLocalEquivalent } from "@/lib/local-time";
import { useUserTimeZone } from "@/hooks/use-user-timezone";
import { useI18n } from "@/i18n";

/**
 * Phase 4 — "00:00 UTC → <local>" reset line via the centralized time
 * system. The UTC side is always explicitly labeled; the local side derives
 * from the browser timezone (SSR renders the UTC-stable "—" until hydrated).
 */
export function MissionResetLine({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const timeZone = useUserTimeZone();
  const todayUtc = new Date().toISOString().slice(0, 10);
  // Explicit UTC fallback until hydrated: SSR HTML and the first client paint
  // agree, then the browser timezone resolves post-hydration.
  const pair = formatUtcMidnightWithLocalEquivalent(todayUtc, {
    timeZone: timeZone ?? "UTC",
    locale,
  });

  return (
    <p
      className={className}
      title={
        timeZone
          ? t("time.resetTooltip", {
              local: pair.local.replace(" local", ""),
              timeZone,
            })
          : t("time.resetTooltipFallback")
      }
    >
      {t("time.dailyResetsAt")} {pair.utc}
      {pair.local !== "—" ? ` → ${pair.local.toUpperCase()}` : ""}
    </p>
  );
}
