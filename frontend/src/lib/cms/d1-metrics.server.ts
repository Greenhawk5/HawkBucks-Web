/**
 * D1 read-metrics wrapper (SERVER-ONLY) — observability companion to
 * `public-cache.server.ts` for the D1 read-load reduction effort.
 *
 * This module must NEVER be imported by browser/client code.
 *
 * Every D1 binding resolved through `resolveRequestCmsDb` is wrapped so each
 * query's `meta.rows_read` / `rows_written` / `duration` are aggregated per
 * request invocation. When an invocation reads more than
 * `ALARM_ROWS_READ_THRESHOLD` rows, one aggregate warning is logged — no SQL
 * text, no bound parameters, no user data (runtime log dimensions must never
 * include user content).
 *
 * The wrapper is transparent: it delegates everything it does not explicitly
 * intercept (e.g. `batch`) to the real binding, unwrapping previously wrapped
 * statements so the real binding always receives native statement objects.
 * Test doubles without `meta` on results are counted as statements with zero
 * rows, so the wrapper is safe for the whole test suite.
 */

import "@tanstack/react-start/server-only";

import type { D1Database, D1Statement } from "./db.server";

/** Per-invocation alarm threshold for aggregate rows_read. */
export const ALARM_ROWS_READ_THRESHOLD = 25_000;

interface D1QueryMeta {
  duration?: number;
  rows_read?: number;
  rows_written?: number;
}

export interface D1MetricsSnapshot {
  statements: number;
  rowsRead: number;
  rowsWritten: number;
  durationMs: number;
}

/** Cumulative state (isolate lifetime; tests may reset). */
let cumulative: D1MetricsSnapshot = {
  statements: 0,
  rowsRead: 0,
  rowsWritten: 0,
  durationMs: 0,
};

export function d1MetricsSnapshot(): D1MetricsSnapshot {
  return { ...cumulative };
}

export function resetD1MetricsForTests(): void {
  cumulative = { statements: 0, rowsRead: 0, rowsWritten: 0, durationMs: 0 };
}

const WRAPPER_INNER = Symbol("hawkbucksD1StatementInner");
interface WrappedStatement extends D1Statement {
  [WRAPPER_INNER]?: D1Statement;
}

function isWrappedStatement(statement: unknown): statement is WrappedStatement {
  return (
    typeof statement === "object" &&
    statement !== null &&
    Boolean((statement as WrappedStatement)[WRAPPER_INNER])
  );
}

function unwrapStatement(statement: D1Statement): D1Statement {
  return isWrappedStatement(statement) ? (statement[WRAPPER_INNER] as D1Statement) : statement;
}

function accountMeta(invocation: D1MetricsSnapshot, result: unknown): void {
  const meta = (result as { meta?: D1QueryMeta } | null | undefined)?.meta;
  invocation.statements += 1;
  cumulative.statements += 1;
  if (!meta) return;
  if (typeof meta.rows_read === "number") {
    invocation.rowsRead += meta.rows_read;
    cumulative.rowsRead += meta.rows_read;
  }
  if (typeof meta.rows_written === "number") {
    invocation.rowsWritten += meta.rows_written;
    cumulative.rowsWritten += meta.rows_written;
  }
  if (typeof meta.duration === "number") {
    invocation.durationMs += meta.duration;
    cumulative.durationMs += meta.duration;
  }
}

function warnRowsReadThreshold(invocation: D1MetricsSnapshot): void {
  if (invocation.rowsRead > ALARM_ROWS_READ_THRESHOLD) {
    console.warn(
      `[hawkbucks:d1-metrics] single invocation exceeded ${ALARM_ROWS_READ_THRESHOLD} rows_read ` +
        `(aggregate rows_read=${invocation.rowsRead}, statements=${invocation.statements}, ` +
        `duration_ms=${Math.round(invocation.durationMs)}). ` +
        "Investigate for cacheability or plan regressions.",
    );
  }
}

function wrapStatement(statement: D1Statement, invocation: D1MetricsSnapshot): D1Statement {
  const account = (result: unknown): void => accountMeta(invocation, result);

  const wrapped: WrappedStatement = {
    bind: (...values: unknown[]) => wrapStatement(statement.bind(...values), invocation),
    first: <T>(column?: string) =>
      column === undefined ? statement.first<T>() : statement.first<T>(column),
    all: async <T>() => {
      const result = await statement.all<T>();
      account(result);
      warnRowsReadThreshold(invocation);
      return result;
    },
    run: async () => {
      const result = await statement.run();
      account(result);
      warnRowsReadThreshold(invocation);
      return result;
    },
  };
  wrapped[WRAPPER_INNER] = statement;
  return wrapped;
}

/**
 * Wrap a D1 binding so every invocation's read volume is measured.
 * The returned proxy stays behaviorally identical to the original binding.
 */
export function withD1Metrics(db: D1Database): D1Database {
  const invocation: D1MetricsSnapshot = {
    statements: 0,
    rowsRead: 0,
    rowsWritten: 0,
    durationMs: 0,
  };
  return new Proxy(db, {
    get(target, property) {
      if (property === "prepare") {
        return (query: string) => wrapStatement(target.prepare(query), invocation);
      }
      if (property === "batch") {
        return async (statements: D1Statement[]) => {
          const results = await target.batch(statements.map(unwrapStatement));
          for (const result of results) {
            accountMeta(invocation, result);
          }
          warnRowsReadThreshold(invocation);
          return results;
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(target)
        : value;
    },
  }) as D1Database;
}
