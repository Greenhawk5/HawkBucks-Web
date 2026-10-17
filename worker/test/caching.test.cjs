const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync(`${__dirname}/../index.js`, "utf8");

function extractCachingSuite() {
  const constsStart = source.indexOf("const DEFAULT_LANGUAGE");
  const constsEnd = source.indexOf("function describeApiFailure");
  const consts = source.slice(constsStart, constsEnd);

  const jsonStart = source.indexOf("const defaultResponseHeaders");
  const jsonEnd = source.indexOf("async function refreshToken", jsonStart);
  const jsonBlock = source.slice(jsonStart, jsonEnd);

  const helpersStart = source.indexOf("function utcDateString");
  const helpersEnd = source.indexOf("export default {", helpersStart);
  const helpers = source.slice(helpersStart, helpersEnd);

  return new Function(`
    ${consts}
    ${jsonBlock}
    const QUOTE_POOL = ['Test Quote'];
    ${helpers}
    return {
      handleHistory,
      handleQuote,
      historyCache,
      quoteCache,
      WORKER_CACHE_TTL_MS,
      getCachedWorkerValue,
      setCachedWorkerValue
    };
  `)();
}

function createMockDb(queries = []) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              queries.push({ sql, args });
              return {
                total_vbucks: 100,
                mission_count: 2,
                days_with_data: 1,
                date_utc: args[0] || "2026-10-17",
                quote: "Test Quote",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
            },
            async run() {
              queries.push({ sql, args });
              return { success: true };
            },
          };
        },
      };
    },
  };
}

test("worker history cache: repeated requests bypass D1 reads", async () => {
  const { handleHistory, historyCache } = extractCachingSuite();
  historyCache.clear();

  const queries = [];
  const env = { DB: createMockDb(queries) };

  // First request: cache miss, executes D1 queries
  const res1 = await handleHistory(env);
  assert.equal(res1.status, 200);
  const queriesAfterFirst = queries.length;
  assert.ok(queriesAfterFirst > 0, "first request should query D1");

  // Second request: cache hit, zero new queries
  const res2 = await handleHistory(env);
  assert.equal(res2.status, 200);
  assert.equal(queries.length, queriesAfterFirst, "second request should hit cache without querying D1");

  const body1 = await res1.json();
  const body2 = await res2.json();
  assert.deepEqual(body1, body2);
});

test("worker quote cache: repeated requests bypass D1 reads", async () => {
  const { handleQuote, quoteCache } = extractCachingSuite();
  quoteCache.clear();

  const queries = [];
  const env = { DB: createMockDb(queries) };

  // First request: cache miss, executes D1 query
  const res1 = await handleQuote(env);
  assert.equal(res1.status, 200);
  assert.equal(queries.length, 1, "first request should query daily_quotes");

  // Second request: cache hit, zero new queries
  const res2 = await handleQuote(env);
  assert.equal(res2.status, 200);
  assert.equal(queries.length, 1, "second request should hit cache without querying D1");

  const body1 = await res1.json();
  const body2 = await res2.json();
  assert.deepEqual(body1, body2);
  assert.equal(body1.quote, "Test Quote");
});

test("worker cache: unavailable DB does not populate cache", async () => {
  const { handleHistory, historyCache } = extractCachingSuite();
  historyCache.clear();

  const envWithoutDb = {};
  const res = await handleHistory(envWithoutDb);
  assert.equal(res.status, 503);
  assert.equal(historyCache.size, 0, "cache must stay empty on error");
});

test("worker cache: expired entries are evicted on read", async () => {
  const { quoteCache, getCachedWorkerValue, setCachedWorkerValue } = extractCachingSuite();
  quoteCache.clear();

  setCachedWorkerValue(quoteCache, "test:key", { test: true });
  assert.ok(getCachedWorkerValue(quoteCache, "test:key", 1000) !== null);

  // Read with 0ms TTL to simulate expiration
  const expired = getCachedWorkerValue(quoteCache, "test:key", 0);
  assert.equal(expired, null, "expired entry must return null");
  assert.equal(quoteCache.has("test:key"), false, "expired entry must be deleted");
});
