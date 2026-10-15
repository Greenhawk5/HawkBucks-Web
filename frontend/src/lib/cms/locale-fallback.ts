/**
 * Site-wide CMS localization fallback policy (single source of truth).
 *
 * English (`en`) is the canonical fallback locale. Every public content
 * pipeline resolves: requested locale -> content default_locale -> English.
 *
 * Record-level: pick ONE translation row per entity (never duplicates).
 * Field-level: blank requested field falls back to the default-locale field,
 * then the English field. At the SQL layer '' counts as missing (NULLIF);
 * whitespace-only is NOT blank in SQL — the JS mergeTranslationRows trims and
 * is used only on single-row reads where trimming is safe.
 * SQL: LEFT JOIN requested + default_locale + English and COALESCE per
 * column, never an inner `t.locale = ?` join (that exact bug hid
 * untranslated heroes).
 *
 * Pure logic + tiny SQL builders. No framework imports — SSR/test safe.
 */

export const FALLBACK_LOCALE = "en" as const;

/** Normalize a requested locale: trimmed non-empty string, else English. */
export function normalizeContentLocale(locale: unknown): string {
  if (typeof locale === "string" && locale.trim() !== "") return locale.trim();
  return FALLBACK_LOCALE;
}

/** Ordered chain: requested -> default -> English, deduped, blanks dropped. */
export function fallbackLocaleChain(requested: unknown, defaultLocale?: unknown): string[] {
  const req = normalizeContentLocale(requested);
  const chain: string[] = [req];
  const def =
    typeof defaultLocale === "string" && defaultLocale.trim() !== "" ? defaultLocale.trim() : "";
  if (def !== "" && !chain.includes(def)) chain.push(def);
  if (!chain.includes(FALLBACK_LOCALE)) chain.push(FALLBACK_LOCALE);
  return chain;
}

/** A row carrying at least a locale discriminator. */
export interface LocaleRow {
  locale: string;
}

/** Pick ONE row: requested -> default -> English -> first -> none. */
export function pickFallbackTranslation<T extends LocaleRow>(
  rows: readonly T[],
  requested: unknown,
  defaultLocale?: unknown,
): T | undefined {
  if (rows.length === 0) return undefined;
  for (const locale of fallbackLocaleChain(requested, defaultLocale)) {
    const found = rows.find((r) => r.locale === locale);
    if (found) return found;
  }
  return rows[0];
}

/** Human-text presence: non-empty string (whitespace-only = missing). */
export function isPresentText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** Per-field merge: requested when present, else English, else graceful miss. */
export function fallbackField(requested: unknown, english: unknown): unknown {
  if (isPresentText(requested)) return requested;
  if (requested !== null && requested !== undefined && typeof requested !== "string")
    return requested;
  if (isPresentText(english)) return english;
  if (english !== null && english !== undefined && typeof english !== "string") return english;
  if (typeof requested === "string" || typeof english === "string")
    return ((english as string) ?? (requested as string) ?? "") as unknown;
  return (english ?? requested ?? null) as unknown;
}

/** Effective locale label for a picked row (hreflang honesty). */
export function resolvedLocaleOf<T extends LocaleRow>(
  picked: T | undefined,
  requested: unknown,
): { resolvedLocale: string | undefined; wasFallback: boolean } {
  if (!picked) return { resolvedLocale: undefined, wasFallback: false };
  const req = normalizeContentLocale(requested);
  return { resolvedLocale: picked.locale, wasFallback: picked.locale !== req };
}

/**
 * LEFT JOIN triple resolving one translation per entity with full fallback.
 * Binds: [requestedLocale] (default_locale comes from c.default_locale via
 * the join condition; English side is the literal 'en', no bind).
 * Search/sort MUST reference the COALESCE aliases so fallback text matches.
 *
 * Priority: requested -> default_locale -> English. The default_locale join
 * is what keeps content alive when default_locale is neither the requested
 * locale nor English (e.g. a fr-authored entity browsed in es).
 */
export function translationFallbackJoins(
  contentAlias = "c",
  requestedAlias = "t",
  englishAlias = "te",
  defaultAlias = "td",
): { joinSql: string; aliveSql: string } {
  return {
    joinSql:
      `LEFT JOIN cms_content_translations ${requestedAlias} ` +
      `ON ${requestedAlias}.content_id = ${contentAlias}.id AND ${requestedAlias}.locale = ? ` +
      `LEFT JOIN cms_content_translations ${defaultAlias} ` +
      `ON ${defaultAlias}.content_id = ${contentAlias}.id AND ${defaultAlias}.locale = ${contentAlias}.default_locale ` +
      `LEFT JOIN cms_content_translations ${englishAlias} ` +
      `ON ${englishAlias}.content_id = ${contentAlias}.id AND ${englishAlias}.locale = '${FALLBACK_LOCALE}'`,
    aliveSql: `(${requestedAlias}.id IS NOT NULL OR ${defaultAlias}.id IS NOT NULL OR ${englishAlias}.id IS NOT NULL)`,
  };
}

/** COALESCE expr: requested column wins, then default_locale, then English. '' counts as missing. */
export function fallbackColumn(
  requestedAlias: string,
  englishAlias: string,
  column: string,
  defaultAlias?: string,
): string {
  if (defaultAlias) {
    return `COALESCE(NULLIF(${requestedAlias}.${column},''), NULLIF(${defaultAlias}.${column},''), ${englishAlias}.${column})`;
  }
  return `COALESCE(NULLIF(${requestedAlias}.${column},''), ${englishAlias}.${column})`;
}

/** Effective-locale expression for a row (drives isLocaleFallback badges). */
export function resolvedLocaleExpr(
  requestedAlias: string,
  englishAlias: string,
  defaultAlias?: string,
): string {
  if (defaultAlias) {
    return (
      `CASE WHEN ${requestedAlias}.id IS NOT NULL THEN ${requestedAlias}.locale ` +
      `WHEN ${defaultAlias}.id IS NOT NULL THEN ${defaultAlias}.locale ` +
      `ELSE ${englishAlias}.locale END`
    );
  }
  return `CASE WHEN ${requestedAlias}.id IS NOT NULL THEN ${requestedAlias}.locale ELSE ${englishAlias}.locale END`;
}

/** Merge two translation rows (same content_id) into one effective row. */
export function mergeTranslationRows<T extends Record<string, unknown>>(
  requested: T | null | undefined,
  english: T | null | undefined,
  textColumns: readonly (keyof T)[] = ["title", "body", "slug"] as unknown as readonly (keyof T)[],
): { row: T | null; resolvedLocale: string | undefined; wasFallback: boolean } {
  const base = (requested ?? english) as T | null | undefined;
  if (!base) return { row: null, resolvedLocale: undefined, wasFallback: false };
  const other = requested ? english : null;
  const merged: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const col of textColumns) {
    const key = col as string;
    if (!isPresentText((base as Record<string, unknown>)[key]) && other) {
      const fb = (other as Record<string, unknown>)[key];
      if (fb !== undefined) merged[key] = fb;
    }
  }
  for (const key of Object.keys(merged)) {
    if (key === "locale" || key === "id" || key === "content_id") continue;
    if ((textColumns as readonly unknown[]).includes(key)) continue;
    if (key.startsWith("seo_") || key.startsWith("og_")) {
      if (!isPresentText(merged[key]) && other) {
        const fb = (other as Record<string, unknown>)[key];
        if (fb !== undefined && (fb === null || isPresentText(fb))) merged[key] = fb;
      }
    }
  }
  const reqLocale = (requested as { locale?: unknown } | null)?.locale;
  const enLocale = (english as { locale?: unknown } | null)?.locale;
  const resolvedLocale =
    typeof reqLocale === "string" ? reqLocale : typeof enLocale === "string" ? enLocale : undefined;
  return {
    row: merged as T,
    resolvedLocale,
    wasFallback: Boolean(requested == null && english != null),
  };
}

/** Per-key merge for static dictionaries: blank override keeps English. */
export function withEnglishFallback<T extends Record<string, string>>(
  en: T,
  override: Partial<T> | undefined,
): T {
  const out: Record<string, string> = { ...en };
  if (!override) return out as T;
  for (const [k, v] of Object.entries(override)) {
    if (isPresentText(v)) out[k] = v as string;
  }
  return out as T;
}
