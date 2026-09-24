import * as React from "react";
import {
  FALLBACK_TIME_DISPLAY,
  formatLocalDate,
  formatLocalDateTime,
  formatLocalTime,
  type FormatTimeOptions,
} from "@/lib/local-time";
import { useUserTimeZone } from "@/hooks/use-user-timezone";
import { useI18n } from "@/i18n";

interface LocalizedTimeProps extends FormatTimeOptions {
  value: Date | string | number | null | undefined;
  kind?: "datetime" | "date" | "time";
  fallback?: string;
  className?: string;
  title?: string;
}

const FORMATTERS = {
  datetime: formatLocalDateTime,
  date: formatLocalDate,
  time: formatLocalTime,
} as const;

/**
 * Phase 4 — hydration-safe localized timestamp.
 *
 * SSR and the first client paint render the stable UTC fallback (never the
 * server timezone), so direct page loads cannot hydration-mismatch. After
 * hydration the browser timezone resolves and the localized value replaces
 * the fallback without layout shift (same element, tabular-nums upstream).
 *
 * Phase 5: the active i18n locale flows into the Phase 4 formatters via the
 * existing `FormatTimeOptions.locale` parameter — UTC semantics unchanged.
 * An explicit `locale` prop still wins over the context value.
 */
export function LocalizedTime({
  value,
  kind = "datetime",
  fallback = FALLBACK_TIME_DISPLAY,
  timeZone: explicitTimeZone,
  locale: explicitLocale,
  className,
  title,
}: LocalizedTimeProps) {
  const browserTimeZone = useUserTimeZone();
  // LocalizedTime only renders inside the app tree where I18nProvider exists.
  const { locale: contextLocale } = useI18n();
  const effectiveTimeZone = explicitTimeZone ?? browserTimeZone;
  const effectiveLocale = explicitLocale ?? contextLocale;

  const display = React.useMemo(() => {
    if (effectiveTimeZone === undefined && explicitTimeZone === undefined) {
      return formatLocalFallback(value, kind, fallback);
    }
    return FORMATTERS[kind](
      value,
      ...(effectiveTimeZone === undefined && effectiveLocale === undefined
        ? []
        : [
            {
              ...(effectiveTimeZone !== undefined ? { timeZone: effectiveTimeZone } : {}),
              ...(effectiveLocale !== undefined ? { locale: effectiveLocale } : {}),
            },
          ]),
    );
  }, [value, kind, fallback, effectiveTimeZone, explicitTimeZone, effectiveLocale]);

  return (
    <span className={className} title={title}>
      {display}
    </span>
  );
}

function formatLocalFallback(
  value: Date | string | number | null | undefined,
  kind: LocalizedTimeProps["kind"],
  fallback: string,
): string {
  const formatted = FORMATTERS[kind ?? "datetime"](value, { timeZone: "UTC" });
  return formatted === FALLBACK_TIME_DISPLAY ? fallback : `${formatted} UTC`;
}
