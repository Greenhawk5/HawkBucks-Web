/**
 * Phase 4 — centralized frontend local-time system for HawkBucks.
 *
 * Architecture:
 *
 *   Worker / D1 / backend  →  UTC (authoritative)  →  this module  →  user's
 *   local timezone (presentation only)
 *
 * The backend remains timezone-independent: D1 timestamps, `date_utc`,
 * mission day boundaries, cron semantics, and availability calculations all
 * stay in UTC. Only the presentation layer converts to local time, and only
 * through the functions in this module — components must never call
 * `toLocaleString()` / `new Date(...)` ad hoc for display.
 *
 * Rules:
 *
 * - The browser timezone comes solely from
 *   `Intl.DateTimeFormat().resolvedOptions().timeZone`. Never IP, locale,
 *   geolocation, hardcoding, or the server timezone. No timezone is persisted
 *   (no cookie / D1 column / preference entry).
 * - UTC identity is never reinterpreted: `parseUtcDate("2026-09-24")` means
 *   UTC midnight, and history grouping keys stay UTC calendar dates. Local
 *   conversion is display-only and must never move a mission between UTC days.
 * - Countdowns use absolute epoch-millisecond arithmetic, never local
 *   calendar arithmetic, so DST transitions cannot skew them.
 * - SSR safety: nothing in this module touches browser APIs at module scope.
 *   `getUserTimeZone()` guards with `typeof Intl === "undefined"` and
 *   try/catch, returning `undefined` when detection is unavailable so the
 *   caller can render a stable SSR fallback. All formatters accept an explicit
 *   `timeZone` option (deterministic in tests); when omitted they resolve the
 *   runtime timezone and fall back to UTC formatting rather than throwing.
 * - Phase 5 hook: every formatter accepts `locale` (default `"en-US"`). A
 *   future i18n runtime passes the user's locale through without rewriting
 *   this module.
 */

export const FALLBACK_TIME_DISPLAY = "—";

const DEFAULT_LOCALE = "en-US";

/** YYYY-MM-DD — always interpreted as a UTC calendar date, never local. */
const UTC_DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface FormatTimeOptions {
  /** IANA timezone. Defaults to the browser timezone, then UTC. */
  timeZone?: string;
  /** BCP 47 locale for Phase 5. Defaults to "en-US". */
  locale?: string;
}

/**
 * The user's IANA timezone (e.g. "America/New_York"), or `undefined` when
 * detection is unavailable (SSR, missing Intl) or invalid. Never throws and
 * never invents a timezone — callers render a stable fallback instead.
 */
export function getUserTimeZone(): string | undefined {
  try {
    if (typeof Intl === "undefined" || !Intl.DateTimeFormat) return undefined;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(detected) ? detected : undefined;
  } catch {
    return undefined;
  }
}

function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the effective timezone: explicit option when valid, otherwise the
 * browser timezone, otherwise UTC. Exported for tests; components normally
 * just omit `timeZone` in FormatTimeOptions.
 */
export function resolveTimeZone(explicit?: string): string {
  if (isValidTimeZone(explicit)) return explicit as string;
  return getUserTimeZone() ?? "UTC";
}

/**
 * Coerce unknown timestamp input to a valid Date. A bare "YYYY-MM-DD" string
 * is UTC midnight (see parseUtcDate) — never local midnight. Returns
 * `undefined` for missing/invalid values instead of throwing.
 */
export function toInstant(value: Date | string | number | null | undefined): Date | undefined {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const trimmed = value.trim();
  const utcDate = parseUtcDate(trimmed);
  if (utcDate) return utcDate;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Interpret "YYYY-MM-DD" as midnight UTC on that calendar date. Returns
 * `undefined` for anything else (including impossible dates like month 13).
 * Use this — never bare `new Date("2026-09-24")` — when a value represents a
 * UTC calendar date, so the meaning stays explicit.
 */
export function parseUtcDate(value: string): Date | undefined {
  const match = UTC_DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const instant = new Date(Date.UTC(year, month - 1, day));
  if (
    instant.getUTCFullYear() !== year ||
    instant.getUTCMonth() !== month - 1 ||
    instant.getUTCDate() !== day
  ) {
    return undefined;
  }
  return instant;
}

/** UTC midnight instant for a UTC calendar date ("YYYY-MM-DD"). */
export function utcMidnightInstant(dateUtc: string): Date | undefined {
  return parseUtcDate(dateUtc);
}

function partsOf(instant: Date, locale: string, timeZone: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(instant)) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return out;
}

function formatWithParts(
  value: Date | string | number | null | undefined,
  pick: (parts: Record<string, string>) => string,
  options?: FormatTimeOptions,
): string {
  const instant = toInstant(value);
  if (!instant) return FALLBACK_TIME_DISPLAY;
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const timeZone = resolveTimeZone(options?.timeZone);
  try {
    return pick(partsOf(instant, locale, timeZone));
  } catch {
    return FALLBACK_TIME_DISPLAY;
  }
}

/** UTC instant → "24 Sep 2026 - 04:30" in the user's local timezone. */
export function formatLocalDateTime(
  value: Date | string | number | null | undefined,
  options?: FormatTimeOptions,
): string {
  return formatWithParts(
    value,
    (p) => `${p["day"]} ${p["month"]} ${p["year"]} - ${p["hour"]}:${p["minute"]}`,
    options,
  );
}

/** UTC instant → "24 Sep 2026" in the user's local timezone. */
export function formatLocalDate(
  value: Date | string | number | null | undefined,
  options?: FormatTimeOptions,
): string {
  return formatWithParts(value, (p) => `${p["day"]} ${p["month"]} ${p["year"]}`, options);
}

/** UTC instant → "04:30" in the user's local timezone. */
export function formatLocalTime(
  value: Date | string | number | null | undefined,
  options?: FormatTimeOptions,
): string {
  return formatWithParts(value, (p) => `${p["hour"]}:${p["minute"]}`, options);
}

export interface UtcMidnightWithLocal {
  /** Explicitly labeled UTC side, e.g. "00:00 UTC". */
  utc: string;
  /** Local equivalent, e.g. "04:30 local". Falls back to "—" on bad input. */
  local: string;
  /** Effective IANA timezone used for the local side. */
  timeZone: string;
}

/**
 * "00:00 UTC → <local>" pair for a UTC calendar date. The UTC instant stays
 * authoritative; the local side is display-only. The offset is always derived
 * from the browser timezone — never hardcoded — so half-hour, quarter-hour,
 * and DST zones resolve correctly.
 */
export function formatUtcMidnightWithLocalEquivalent(
  dateUtc: string,
  options?: FormatTimeOptions,
): UtcMidnightWithLocal {
  const timeZone = resolveTimeZone(options?.timeZone);
  const instant = utcMidnightInstant(dateUtc);
  return {
    utc: "00:00 UTC",
    local: instant
      ? `${formatLocalTime(instant, { ...options, timeZone })} local`
      : FALLBACK_TIME_DISPLAY,
    timeZone,
  };
}

/**
 * Absolute duration between two instants as "MM:SS" (durations ≥ 1h render
 * "H:MM:SS"). Pure epoch-millisecond arithmetic — local calendar fields are
 * never consulted, so DST transitions cannot skew the countdown. Invalid
 * input yields "--:--".
 */
export function formatCountdown(
  target: Date | string | number | null | undefined,
  now: Date | string | number | null | undefined,
): string {
  const targetInstant = toInstant(target);
  const nowInstant = toInstant(now);
  if (!targetInstant || !nowInstant) return "--:--";
  const whole = Math.max(0, Math.floor((targetInstant.getTime() - nowInstant.getTime()) / 1000));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const mm = String(hours > 0 ? minutes : Math.floor(whole / 60)).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
