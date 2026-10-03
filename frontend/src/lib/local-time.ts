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

export interface DailyRotationBoundary {
  /**
   * The authoritative rotation time on the UTC clock. Always "00:00" — it is a
   * fixed daily boundary, never a computed or remaining time.
   */
  utcTime: string;
  /** The same boundary on the user's clock, e.g. "08:00". */
  localTime: string;
  /** Local calendar date of the boundary, e.g. "24 Sep 2026". */
  localDate: string;
  /** UTC calendar date of the boundary, e.g. "24 Sep 2026". */
  utcDate: string;
  /**
   * True when the boundary falls on a different local calendar day than its UTC
   * day — which happens for every timezone whose offset is not a whole number
   * of hours, and either side of the UTC date line.
   */
  localDateDiffers: boolean;
  /** Effective IANA timezone used for the local side. */
  timeZone: string;
}

/**
 * The daily Mission Alert rotation boundary: 00:00 UTC, plus that same instant
 * expressed on the reader's own clock.
 *
 * This is deliberately NOT a countdown. The rotation happens at a fixed
 * wall-clock time every day, so the UTC side never changes and must never be
 * derived from the 30-minute data-refresh interval — a reader asking "when does
 * it rotate?" wants the time of day, not time remaining.
 *
 * The date boundary is handled explicitly: a reader whose timezone is ahead of
 * UTC sees the boundary on a later local calendar day (and behind UTC, on an
 * earlier one), so `localDateDiffers` lets the UI say so rather than letting
 * the two dates silently contradict each other.
 *
 * `reference` selects which rotation day is described. Callers should pass a
 * stable server-provided timestamp (or omit it for "now"); the offset is always
 * resolved from the browser timezone, never hardcoded.
 */
export function formatDailyRotationBoundary(
  reference?: Date | string | number | null,
  options?: FormatTimeOptions,
): DailyRotationBoundary {
  const timeZone = resolveTimeZone(options?.timeZone);
  const instant = toInstant(reference) ?? new Date();
  // The UTC calendar day of the reference decides which rotation is described.
  // Derive it from the instant itself so the local side can never shift which
  // day is being talked about.
  const boundary = utcMidnightInstant(instant.toISOString().slice(0, 10)) ?? instant;
  const localTime = formatLocalTime(boundary, { ...options, timeZone });
  const localDate = formatLocalDate(boundary, { ...options, timeZone });
  const utcDate = formatLocalDate(boundary, { ...options, timeZone: "UTC" });
  return {
    utcTime: "00:00",
    localTime,
    localDate,
    utcDate,
    localDateDiffers: localDate !== utcDate,
    timeZone,
  };
}

/**
 * The next 00:00 UTC boundary strictly after `from`.
 *
 * Pure UTC calendar arithmetic on the instant itself: the local calendar is
 * never consulted, so a reader's timezone can never shift which rotation is
 * being counted down to. At exactly 00:00:00.000 this rolls forward a full day
 * (24:00:00 remaining), which is the correct rollover into the next rotation.
 */
export function nextUtcMidnight(from: Date | string | number | null | undefined): Date | undefined {
  const instant = toInstant(from);
  if (!instant) return undefined;
  const next = new Date(instant.getTime());
  // setUTCHours(24) normalises to 00:00 UTC on the following day.
  next.setUTCHours(24, 0, 0, 0);
  return next;
}

/** Placeholder before the first client tick, mirroring the countdown fallback. */
export const FALLBACK_UTC_COUNTDOWN = "--:--:--";

/**
 * Time remaining until the next 00:00 UTC boundary as "HH:MM:SS".
 *
 * Always UTC — the value is a countdown to a UTC boundary, so it must never be
 * derived from the reader's timezone. Hours are zero-padded to two digits and
 * the field count is fixed at three, so the string width never changes while it
 * ticks. Returns the fallback for missing input (SSR renders the stable
 * placeholder, so hydration cannot mismatch).
 */
export function formatUtcMidnightCountdown(now: Date | string | number | null | undefined): string {
  const instant = toInstant(now);
  if (!instant) return FALLBACK_UTC_COUNTDOWN;
  const target = nextUtcMidnight(instant);
  if (!target) return FALLBACK_UTC_COUNTDOWN;
  const whole = Math.max(0, Math.floor((target.getTime() - instant.getTime()) / 1000));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
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
