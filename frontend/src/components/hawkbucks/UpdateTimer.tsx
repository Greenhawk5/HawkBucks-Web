import { formatUtcTime } from "@/lib/missions";
import { formatUtcMidnightWithLocalEquivalent } from "@/lib/local-time";
import { useUserTimeZone } from "@/hooks/use-user-timezone";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { useI18n } from "@/i18n";
import { LocalizedTime } from "./LocalizedTime";

export function UpdateTimer({ lastUpdated }: { lastUpdated: string }) {
  const { t, locale } = useI18n();
  const { next, refreshIn } = useRefreshCountdown(lastUpdated);
  const timeZone = useUserTimeZone();

  return (
    <div className="glass-panel grid gap-3 rounded-xl px-4 py-3 text-xs sm:grid-cols-3 sm:items-center">
      <div>
        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("time.lastUpdated")}
        </span>
        <span className="font-display font-bold tabular-nums">
          <LocalizedTime
            value={lastUpdated}
            kind="datetime"
            title={
              timeZone
                ? t("time.lastUpdatedTitle", { timeZone })
                : t("time.lastUpdatedTitleFallback")
            }
          />{" "}
          <span className="font-normal text-muted-foreground">{t("common.localTime")}</span>
        </span>
      </div>
      <div className="sm:text-center">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("time.nextUpdate")}
        </span>
        <span
          className="font-display font-bold tabular-nums"
          title={
            timeZone
              ? t("time.nextUpdateTitle", { utc: formatUtcTime(next), timeZone })
              : t("time.nextUpdateTitleFallback")
          }
        >
          <LocalizedTime value={next} kind="datetime" />{" "}
          <span className="font-normal text-muted-foreground">{t("common.local")}</span>
        </span>
        <span className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground">
          {formatUtcMidnightWithLocalEquivalentForBoundary(next, timeZone, locale)}
        </span>
      </div>
      <div className="sm:text-end">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("time.refreshIn")}
        </span>
        <span className="font-display font-bold tabular-nums text-primary">{refreshIn}</span>
      </div>
    </div>
  );
}

function formatUtcMidnightWithLocalEquivalentForBoundary(
  next: Date,
  timeZone: string | undefined,
  locale: string,
): string {
  const utcBoundary = new Date(next);
  utcBoundary.setUTCHours(0, 0, 0, 0);
  const pair = formatUtcMidnightWithLocalEquivalent(
    utcBoundary.toISOString().slice(0, 10),
    timeZone ? { timeZone, locale } : { locale },
  );
  return `${pair.utc} → ${pair.local}`;
}
