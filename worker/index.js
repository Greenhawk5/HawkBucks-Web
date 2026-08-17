import localization from './localization.json';
import { QUOTE_POOL } from './quote-pool.js';

const TOKEN_URL =
  'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';

const WORLD_INFO_URL =
  'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/world/info';

const DEFAULT_LANGUAGE = 'en';
const KV_MISSIONS_KEY = 'current_missions';
const KV_HISTORY_PREFIX = 'history:daily:';
const KV_HISTORY_SEED_KEY = 'history:seed:v1';

function describeApiFailure(label, response, payload) {
  const message =
    payload?.errorMessage ||
    payload?.message ||
    payload?.error_description ||
    payload?.error ||
    `HTTP ${response?.status ?? 'unknown'}`;

  console.error(
    `${label}: ${response?.status ?? 'Network error'} - ${message}`
  );
}

// Power level mappings
const DIFFICULTY_POWER_MAP = {
  'Theater_Start_Zone1': 1,
  'Theater_Start_Zone2': 3,
  'Theater_Start_Zone3': 5,
  'Theater_Start_Zone4': 9,
  'Theater_Start_Zone5': 15,

  'Theater_Normal_Zone1': 19,
  'Theater_Normal_Zone2': 23,
  'Theater_Normal_Zone3': 28,
  'Theater_Normal_Zone4': 34,
  'Theater_Normal_Zone5': 40,

  'Theater_Hard_Zone1': 40,
  'Theater_Hard_Zone2': 46,
  'Theater_Hard_Zone3': 52,
  'Theater_Hard_Zone4': 58,
  'Theater_Hard_Zone5': 64,
  'Theater_Hard_Zone6': 70,

  'Theater_Nightmare_Zone1': 76,
  'Theater_Nightmare_Zone2': 82,
  'Theater_Nightmare_Zone3': 88,
  'Theater_Nightmare_Zone4': 94,
  'Theater_Nightmare_Zone5': 100,

  'Theater_Endgame_Zone1': 108,
  'Theater_Endgame_Zone2': 116,
  'Theater_Endgame_Zone3': 124,
  'Theater_Endgame_Zone4': 132,
  'Theater_Endgame_Zone5': 140,
  'Theater_Endgame_Zone6': 160,

  'Theater_Phoenix_Zone1': 1,
  'Theater_Phoenix_Zone2': 3,
  'Theater_Phoenix_Zone3': 5,
  'Theater_Phoenix_Zone4': 10,
  'Theater_Phoenix_Zone5': 15,
  'Theater_Phoenix_Zone6': 23,
  'Theater_Phoenix_Zone7': 34,
  'Theater_Phoenix_Zone8': 46,
  'Theater_Phoenix_Zone9': 58,
  'Theater_Phoenix_Zone10': 70,
  'Theater_Phoenix_Zone11': 82,
  'Theater_Phoenix_Zone12': 94,
  'Theater_Phoenix_Zone13': 108,
  'Theater_Phoenix_Zone14': 124,
  'Theater_Phoenix_Zone15': 140
};

const ZONE_MAP = {
  'ZT_GhostTown': 'Ghost Town',
  'ZT_TheCity': 'The City',
  'ZT_TheSuburbs': 'The Suburbs',
  'ZT_Route99': 'Thunder Route 99',
  'ZT_IndustrialPark': 'Industrial Park',
  'ZT_TheWarehouse': 'The Warehouse',
  'ZT_AlpineStation': 'Alpine Station',
  'ZT_CraterGorge': 'Crater Gorge',
  'ZT_TheBusStop': 'The Bus Stop',
  'ZT_SeeingRed': 'Seeing Red',
  'ZT_StumpPatch': 'Stump Patch',
  'ZT_Fastlane': 'Fast Lane',
  'ZT_BlastedBadlands': 'Blasted Badlands',
  'ZT_Oakhaven': 'Oakhaven',
  'ZT_FlintlockFalls': 'Flintlock Falls',
  "ZT_Farmer'sMarket": "Farmer's Market",
  'ZT_GoodNeighbor': 'Good Neighbor',
  'ZT_Roadkill': 'Roadkill',
  'ZT_RoamingTitan': 'Roaming Titan',
  'ZT_ShardRockInn': 'Shard Rock Inn',
  'ZT_TradingPost': 'Trading Post',
  'ZT_ValleyRidge': 'Valley Ridge',
  'ZT_WreckedExpedition': 'Wrecked Expedition',
  'ZT_Canyoncrest': 'Canyoncrest',
  'ZT_HollowCreek': 'Hollow Creek',
  'ZT_HorizonHollow': 'Horizon Hollow',
  'ZT_NobleBeach': 'Noble Beach',
  'ZT_PhotonMonorail': 'Photon Monorail',
  'ZT_RiverRun': 'River Run',
  'ZT_Steepfall': 'Steepfall',
  'ZT_SteamRoller': 'Steam Roller',
  'ZT_TurkeyTruck': 'Turkey Truck',
  'ZT_WindingRivers': 'Winding Rivers',
  'ZT_Arid': 'Desert',
  'ZT_FinalFrontier': 'Final Frontier',

  'ZT_TheGrasslands': 'Grasslands',
  'ZT_Grasslands': 'Grasslands',
  'ZT_Forest': 'Forest',
  'ZT_HauntedForest': 'Haunted Forest',
  'ZT_Lakeside': 'Lakeside',
  'ZT_Tropical': 'Scurvy Shoals (Tropical)',

  'ZT_AutumnCity': 'Autumn City',
  'ZT_AutumnSuburbs': 'Autumn Suburbs',
  'ZT_AutumnIndustrialPark': 'Autumn Industrial Park',
  'ZT_AutumnFoothills': 'Autumn Foothills',

  'ZT_Hexsylvania': 'Hexsylvania',
  'ZT_ThePortal': 'The Portal'
};

const ZONE_THEME_ALIASES = {
  'ZT_TheIndustrialPark': 'ZT_IndustrialPark',
  'BP_ZT_AD_TheIndustrialPark': 'ZT_IndustrialPark',
  'BP_ZT_IndustrialPark': 'ZT_IndustrialPark'
};

const MISSION_MAP = {
  '_1Gate_': '029003B949368614A8DABBA356C1C2BB',
  '_Cat1FtS_': '029003B949368614A8DABBA356C1C2BB',
  '_2Gates_': '6D79CF67497338EB3C220A98DE3B6188',
  '_3Gates_': 'CAFB5B6E4D10DE114B3A4A8180DFD2DC',
  '_4Gates_': 'EFFBDC1A4D6701DD500C0BADCFA4AB97',
  '_DtB_': '35C0CEF64FFC9CE340D0579D68B53E0F',
  '_EtShelter_': 'F553B25F4E64D39E17709EB887016B1E',
  '_RtD_': '136A7B9041D6CF2AADA4CE9D7EB942FB',
  '_RetrieveTheData_': '136A7B9041D6CF2AADA4CE9D7EB942FB',
  '_LtB_': '96F9DB85441C355E089DB28B382ADECA',
  '_RideTheLightning_': '96F9DB85441C355E089DB28B382ADECA',
  '_LaunchTheBalloon_': '96F9DB85441C355E089DB28B382ADECA',
  '_RtL_': '96F9DB85441C355E089DB28B382ADECA',
  '_RtS_': 'FCDA9A38436EB6427D5B248DC98AF055'
};

function get_mission_name(missionGenerator, lang) {
  const generatorString = missionGenerator ? String(missionGenerator) : '';

  for (const [key, missionId] of Object.entries(MISSION_MAP)) {
    if (generatorString.includes(key)) {
      const missionData = localization.missions?.[missionId];

      if (missionData) {
        return missionData[lang] || missionData.en || missionId;
      }

      return missionId;
    }
  }

  return 'Unknown Mission';
}

function get_power_level(missionDifficultyInfo) {
  const rowName =
    typeof missionDifficultyInfo === 'string'
      ? missionDifficultyInfo
      : missionDifficultyInfo?.rowName;

  if (!rowName || rowName === 'None') {
    return 'Unknown';
  }

  return DIFFICULTY_POWER_MAP[rowName] ?? `Unknown (${rowName})`;
}

function extract_zone_theme_identifier(zoneTheme) {
  if (typeof zoneTheme !== 'string') return null;

  const parts = zoneTheme.split('/').filter(Boolean);
  const zoneThemesIndex = parts.indexOf('ZoneThemes');

  if (zoneThemesIndex === -1) return null;

  const themeParts = parts.slice(zoneThemesIndex + 1);

  if (!themeParts.length) return null;

  const firstPart = themeParts[0].split('.')[0];

  if (firstPart.startsWith('ZT_')) {
    return ZONE_THEME_ALIASES[firstPart] || firstPart;
  }

  for (const part of themeParts) {
    const assetName = part.split('.')[0];

    if (ZONE_THEME_ALIASES[assetName]) {
      return ZONE_THEME_ALIASES[assetName];
    }

    if (assetName.startsWith('ZT_')) {
      return assetName;
    }
  }

  return null;
}

function get_zone_name(zoneTheme) {
  const identifier = extract_zone_theme_identifier(zoneTheme);

  if (!identifier) {
    return 'Unknown Zone';
  }

  return ZONE_MAP[identifier] || `Unknown Zone (${identifier})`;
}

function get_theater_name(theaterInfo, fallbackIndex, lang) {
  if (!theaterInfo) {
    return (
      localization.theaters?.[fallbackIndex]?.[lang] ||
      localization.theaters?.[fallbackIndex]?.en ||
      'Unknown Area'
    );
  }

  if (typeof theaterInfo.displayName === 'object') {
    return (
      theaterInfo.displayName[lang] ||
      theaterInfo.displayName.en ||
      'Unknown Area'
    );
  }

  if (typeof theaterInfo.displayName === 'string') {
    return theaterInfo.displayName;
  }

  return (
    localization.theaters?.[fallbackIndex]?.[lang] ||
    localization.theaters?.[fallbackIndex]?.en ||
    'Unknown Area'
  );
}

const ALLOWED_ORIGIN = 'https://hawkbucks.pages.dev';

function corsHeaders(origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Vary': 'Origin'
  };

  if (origin === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
  }

  return headers;
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin)
  });
}

async function refreshToken(env) {
  if (
    !env.EPIC_ACCOUNT_ID ||
    !env.EPIC_DEVICE_ID ||
    !env.EPIC_DEVICE_SECRET
  ) {
    throw new Error(
      'Missing Epic credentials: EPIC_ACCOUNT_ID, EPIC_DEVICE_ID, or EPIC_DEVICE_SECRET'
    );
  }

  if (!env.EPIC_TOKEN_AUTH) {
    throw new Error('Missing EPIC_TOKEN_AUTH secret');
  }

  const body = new URLSearchParams({
    grant_type: 'device_auth',
    account_id: env.EPIC_ACCOUNT_ID,
    device_id: env.EPIC_DEVICE_ID,
    secret: env.EPIC_DEVICE_SECRET
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: env.EPIC_TOKEN_AUTH,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'HawkBucks/1.0'
    },
    body
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    describeApiFailure('Token request failed', response, payload);

    throw new Error(
      `Epic token request failed with HTTP ${response.status}`
    );
  }

  if (!payload?.access_token) {
    throw new Error('Epic token response did not contain access_token');
  }

  return payload.access_token;
}

async function fetchMissionData(env) {
  const lang = env.HAWKBUCKS_LANGUAGE || DEFAULT_LANGUAGE;

  const token = await refreshToken(env);

  const response = await fetch(WORLD_INFO_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'HawkBucks/1.0'
    }
  });

  const worldData = await response.json().catch(() => null);

  if (!response.ok) {
    describeApiFailure(
      'World info request failed',
      response,
      worldData
    );

    throw new Error(
      `Epic world info request failed with HTTP ${response.status}`
    );
  }

  const results = [];
  const resultKeys = new Set();

  const theatersById = new Map(
    (Array.isArray(worldData?.theaters) ? worldData.theaters : [])
      .filter((theater) => theater?.uniqueId)
      .map((theater) => [theater.uniqueId, theater])
  );

  const missionsById = new Map(
    (Array.isArray(worldData?.missions) ? worldData.missions : [])
      .filter((missions) => missions?.theaterId)
      .map((missions) => [missions.theaterId, missions])
  );

  const missionAlerts = Array.isArray(worldData?.missionAlerts)
    ? worldData.missionAlerts
    : [];

  for (let i = 0; i < missionAlerts.length; i += 1) {
    const missionAlert = missionAlerts[i];

    if (
      !missionAlert ||
      !Array.isArray(missionAlert.availableMissionAlerts)
    ) {
      continue;
    }

    for (const availableAlert of missionAlert.availableMissionAlerts) {
      if (
        !availableAlert ||
        typeof availableAlert.tileIndex !== 'number'
      ) {
        continue;
      }

      const rewards =
        availableAlert.missionAlertRewards?.items || [];

      const vbucksReward = rewards.find(
        (reward) =>
          reward?.itemType ===
          'AccountResource:currency_mtxswap'
      );

      if (!vbucksReward) {
        continue;
      }

      const tileIndex = availableAlert.tileIndex;
      const quantity = Number(vbucksReward.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      const theaterInfo =
        theatersById.get(missionAlert.theaterId) ||
        worldData.theaters?.[i];

      const theaterTile = theaterInfo?.tiles?.[tileIndex];

      const area = get_theater_name(
        theaterInfo,
        i,
        lang
      );

      const zone = get_zone_name(
        theaterTile?.zoneTheme
      );

      const missions =
        missionsById.get(missionAlert.theaterId) ||
        worldData.missions?.[i];

      const matchingMissions =
        Array.isArray(missions?.availableMissions)
          ? missions.availableMissions.filter(
              (mission) =>
                mission?.tileIndex === tileIndex
            )
          : [];

      if (matchingMissions.length === 0) {
        const resultKey =
          `${missionAlert.theaterId || i}:` +
          `${tileIndex}:${quantity}`;

        if (!resultKeys.has(resultKey)) {
          results.push({
            id: resultKey,
            reward: quantity,
            area,
            mission: 'Unknown Mission',
            zone,
            powerLevel: null
          });

          resultKeys.add(resultKey);
        }

        continue;
      }

      for (const availableMission of matchingMissions) {
        const missionGenerator =
          availableMission.missionGenerator;

        const missionName =
          get_mission_name(
            missionGenerator,
            lang
          );

        const power =
          get_power_level(
            availableMission.missionDifficultyInfo
          );

        const resultKey =
          `${missionAlert.theaterId || i}:` +
          `${tileIndex}:${quantity}:` +
          `${missionGenerator || 'unknown'}`;

        if (resultKeys.has(resultKey)) {
          continue;
        }

        results.push({
          id: resultKey,
          reward: quantity,
          area,
          mission: missionName,
          zone,
          powerLevel:
            typeof power === 'number'
              ? power
              : null
        });

        resultKeys.add(resultKey);
      }
    }
  }

  const totalVbucks = results.reduce(
    (sum, mission) =>
      sum + Number(mission.reward || 0),
    0
  );

  return {
    success: true,
    status:
      results.length > 0
        ? 'available'
        : 'empty',
    lastUpdated:
      new Date().toISOString(),
    totalVbucks,
    missions: results
  };
}

async function saveMissionData(env, data) {
  await env.HAWKBUCKS_CACHE.put(
    KV_MISSIONS_KEY,
    JSON.stringify(data)
  );
}

async function getCachedMissionData(env) {
  const cached = await env.HAWKBUCKS_CACHE.get(
    KV_MISSIONS_KEY,
    'json'
  );

  return cached;
}

function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function shiftUtcDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateString(date);
}

function historyKey(dateString) {
  return `${KV_HISTORY_PREFIX}${dateString}`;
}

function missionSnapshot(data, dateString, timestamp = new Date().toISOString()) {
  return {
    utcDate: dateString,
    totalVbucks: Number(data.totalVbucks || 0),
    missionCount: Array.isArray(data.missions) ? data.missions.length : 0,
    missions: Array.isArray(data.missions) ? data.missions : [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

async function saveDailyMissionSnapshot(env, data, dateString = utcDateString()) {
  if (!env.DB) return false;
  const snapshot = missionSnapshot(data, dateString);
  await env.DB.prepare(`
    INSERT INTO mission_history
      (date_utc, total_vbucks, mission_count, missions_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(date_utc) DO UPDATE SET
      total_vbucks = excluded.total_vbucks,
      mission_count = excluded.mission_count,
      missions_json = excluded.missions_json,
      updated_at = excluded.updated_at
  `).bind(dateString, snapshot.totalVbucks, snapshot.missionCount, JSON.stringify(snapshot.missions), snapshot.createdAt, snapshot.updatedAt).run();
  return true;
}

function seededHistoryRecord(dateString, totalVbucks) {
  const timestamp = new Date().toISOString();
  return {
    utcDate: dateString,
    totalVbucks,
    missionCount: 0,
    missions: [],
    source: 'reference-seed',
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

async function seedReferenceHistory(env, dateString = utcDateString()) {
  if (!env.DB) return false;

  // Reference rows are daily records, so every aggregate remains D1-derived.
  // INSERT OR IGNORE keeps this bootstrap idempotent and never overwrites a real snapshot.
  const seedRows = new Map();
  const add = (date, totalVbucks, missionCount) =>
    seedRows.set(date, { totalVbucks, missionCount });
  const today = new Date(`${dateString}T00:00:00.000Z`);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  const weekStart = shiftUtcDate(dateString, -daysSinceMonday);
  const previousWeekStart = shiftUtcDate(weekStart, -7);
  const monthStart = utcDateString(new Date(Date.UTC(year, month, 1)));
  add(dateString, 0, 0);
  add(shiftUtcDate(dateString, -1), 50, 1);
  add(weekStart, 50, 1);
  add(shiftUtcDate(weekStart, 1), 50, 1);
  add(previousWeekStart, 50, 1);
  add(shiftUtcDate(previousWeekStart, 1), 50, 1);
  add(monthStart, 350, 7);
  add(`${year}-${String(month).padStart(2, '0')}-01`, 700, 14);
  add(`${year}-01-01`, 4650, 93);
  add(`${year - 1}-01-01`, 12480, 0);

  const timestamp = new Date().toISOString();
  await env.DB.batch([...seedRows.entries()].map(([date, row]) =>
    env.DB.prepare(`
      INSERT OR IGNORE INTO mission_history
        (date_utc, total_vbucks, mission_count, missions_json, created_at, updated_at)
      VALUES (?, ?, ?, '[]', ?, ?)
    `).bind(date, row.totalVbucks, row.missionCount, timestamp, timestamp)
  ));
  return true;
}

async function migrateLegacyKvRecords(env, dateString = utcDateString()) {
  if (!env.DB || !env.HAWKBUCKS_CACHE) return;

  const dates = dateRange(dateString, 366);
  const statements = [];
  let migratedCount = 0;
  for (let index = 0; index < dates.length; index += 100) {
    const batchDates = dates.slice(index, index + 100);
    const values = await env.HAWKBUCKS_CACHE.get(batchDates.map(historyKey), 'json');
    for (const date of batchDates) {
      const record = values.get(historyKey(date));
      if (!record) continue;
      statements.push(env.DB.prepare(`
        INSERT OR IGNORE INTO mission_history
          (date_utc, total_vbucks, mission_count, missions_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        date,
        Number(record.totalVbucks || 0),
        Number(record.missionCount || 0),
        JSON.stringify(Array.isArray(record.missions) ? record.missions : []),
        record.createdAt || new Date().toISOString(),
        record.updatedAt || new Date().toISOString()
      ));
      migratedCount += 1;
    }
  }
  for (let index = 0; index < statements.length; index += 100) {
    await env.DB.batch(statements.slice(index, index + 100));
  }

  console.log(`[history] legacy KV migration: ${migratedCount} records`);
}

function emptyPeriod() {
  return {
    totalVbucks: null,
    missionCount: null,
    daysWithData: 0,
    comparison: null
  };
}

function dateRange(endDate, length) {
  return Array.from({ length }, (_, index) =>
    shiftUtcDate(endDate, -(length - 1 - index))
  );
}

function calendarHistoryBounds(dateString) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const currentWeekStart = shiftUtcDate(dateString, -daysSinceMonday);
  const currentMonthStart = utcDateString(new Date(Date.UTC(year, month, 1)));

  return {
    todayStart: dateString,
    tomorrowStart: shiftUtcDate(dateString, 1),
    yesterdayStart: shiftUtcDate(dateString, -1),
    dayBeforeYesterdayStart: shiftUtcDate(dateString, -2),
    currentWeekStart,
    nextWeekStart: shiftUtcDate(currentWeekStart, 7),
    previousWeekStart: shiftUtcDate(currentWeekStart, -7),
    currentMonthStart,
    nextMonthStart: utcDateString(new Date(Date.UTC(year, month + 1, 1))),
    previousMonthStart: utcDateString(new Date(Date.UTC(year, month - 1, 1))),
    currentYearStart: `${year}-01-01`,
    nextYearStart: `${year + 1}-01-01`,
    previousYearStart: `${year - 1}-01-01`
  };
}

async function getHistory(env, dateString = utcDateString()) {
  const bounds = calendarHistoryBounds(dateString);
  const query = (start, end) => env.DB.prepare(`
    SELECT COALESCE(SUM(total_vbucks), 0) AS total_vbucks,
           COALESCE(SUM(mission_count), 0) AS mission_count,
           COUNT(*) AS days_with_data
    FROM mission_history WHERE date_utc >= ? AND date_utc < ?
  `).bind(start, end).first();
  const [today, yesterday, dayBeforeYesterday, week, previousWeek, monthRow, previousMonth, thisYear, previousYear] = await Promise.all([
    query(bounds.todayStart, bounds.tomorrowStart),
    query(bounds.yesterdayStart, bounds.todayStart),
    query(bounds.dayBeforeYesterdayStart, bounds.yesterdayStart),
    query(bounds.currentWeekStart, bounds.nextWeekStart),
    query(bounds.previousWeekStart, bounds.currentWeekStart),
    query(bounds.currentMonthStart, bounds.nextMonthStart),
    query(bounds.previousMonthStart, bounds.currentMonthStart),
    query(bounds.currentYearStart, bounds.nextYearStart),
    query(bounds.previousYearStart, bounds.currentYearStart)
  ]);
  const period = (row, comparisonRow = null) => {
    if (!row || Number(row.days_with_data) === 0) return emptyPeriod();
    let comparison = null;
    if (comparisonRow && Number(comparisonRow.days_with_data) > 0 && Number(comparisonRow.total_vbucks) !== 0) {
      comparison = {
        percent: Number(((Number(row.total_vbucks) - Number(comparisonRow.total_vbucks)) / Number(comparisonRow.total_vbucks) * 100).toFixed(1)),
        baselineTotalVbucks: Number(comparisonRow.total_vbucks)
      };
    }
    return {
      totalVbucks: Number(row.total_vbucks),
      missionCount: Number(row.mission_count),
      daysWithData: Number(row.days_with_data),
      comparison
    };
  };

  return {
    success: true,
    date: dateString,
    today: period(today, yesterday),
    yesterday: period(yesterday, dayBeforeYesterday),
    last7Days: period(week, previousWeek),
    last30Days: period(monthRow, previousMonth),
    thisYear: period(thisYear, previousYear)
  };
}

/* legacy validator removed: static quote pool content is trusted */
function cleanGeneratedQuote(value) {
  return String(value || '')
    .trim()
    .replace(/^['"“”]+|['"“”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function quoteIndexForDate(dateString) {
  const epoch = Date.UTC(2025, 0, 1);
  const current = Date.parse(`${dateString}T00:00:00.000Z`);
  const elapsedDays = Math.floor((current - epoch) / 86400000);
  return ((elapsedDays % QUOTE_POOL.length) + QUOTE_POOL.length) % QUOTE_POOL.length;
}

async function ensureDailyQuote(env, dateString = utcDateString()) {
  console.log(`[quote] checking date ${dateString}`);
  if (!env.DB) return null;

  const existing = await env.DB.prepare(
    'SELECT date_utc AS utcDate, quote, created_at AS createdAt, updated_at AS updatedAt FROM daily_quotes WHERE date_utc = ?'
  ).bind(dateString).first();

  console.log(`[quote] existing row: ${existing?.quote ? 'true' : 'false'}`);
  if (existing?.quote) return existing;

  const index = quoteIndexForDate(dateString);
  const quote = QUOTE_POOL[index];
  console.log(`[quote] selected quote index ${index}`);
  const timestamp = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO daily_quotes (date_utc, quote, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date_utc) DO NOTHING
  `).bind(dateString, quote, timestamp, timestamp).run();
  console.log('[quote] daily quote inserted');
  return { utcDate: dateString, quote, createdAt: timestamp, updatedAt: timestamp };
}

async function getDailyQuote(env, dateString = utcDateString()) {
  if (!env.DB) return null;
  return env.DB.prepare(
    'SELECT date_utc AS utcDate, quote, created_at AS createdAt, updated_at AS updatedAt FROM daily_quotes WHERE date_utc = ?'
  ).bind(dateString).first();
}

async function handleHistory(env, origin) {
  try {
    if (!env.DB) {
      return json({ success: false, status: 'unavailable', message: 'History is unavailable.' }, 503, origin);
    }

    return json(await getHistory(env), 200, origin);
  } catch (error) {
    console.error('History request failed:', error instanceof Error ? error.message : 'unknown error');
    return json({ success: false, status: 'unavailable', message: 'History is unavailable.' }, 503, origin);
  }
}

async function handleQuote(env, origin) {
  try {
    const quote = await ensureDailyQuote(env);

    if (!quote) {
      return json({ success: false, status: 'unavailable', quote: null }, 503, origin);
    }

    return json({ success: true, date: quote.utcDate, quote: quote.quote }, 200, origin);
  } catch (error) {
    console.error('Quote request failed:', error instanceof Error ? error.message : 'unknown error');
    return json({ success: false, status: 'unavailable', quote: null }, 503, origin);
  }
}

async function handleMissions(env, origin) {
  const cached = await getCachedMissionData(env);

  if (!cached) {
    return json(
      {
        success: false,
        status: 'unavailable',
        message: 'Mission data is not available yet.',
        lastUpdated: null,
        totalVbucks: 0,
        missions: []
      },
      503,
      origin
    );
  }

  return json(cached, 200, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      if (origin === ALLOWED_ORIGIN) {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin)
        });
      }

      return new Response(null, {
        status: 403,
        headers: corsHeaders('')
      });
    }

    if (
      request.method === 'GET' &&
      url.pathname === '/api/missions'
    ) {
      return handleMissions(env, origin);
    }

    if (
      request.method === 'GET' &&
      url.pathname === '/api/history'
    ) {
      return handleHistory(env, origin);
    }

    if (
      request.method === 'GET' &&
      url.pathname === '/api/quote'
    ) {
      return handleQuote(env, origin);
    }

    if (
      request.method === 'GET' &&
      url.pathname === '/api/health'
    ) {
      return json(
        {
          status: 'ok',
          service: 'HawkBucks Worker',
          timestamp: new Date().toISOString()
        },
        200,
        origin
      );
    }

    return json(
      {
        success: false,
        message: 'HawkBucks API'
      },
      404,
      origin
    );
  },

  async scheduled(controller, env, ctx) {
    const dateString = utcDateString();

    // Initialization and quote generation must not depend on Epic's mission
    // request succeeding. A transient upstream failure must not leave D1 empty.
    ctx.waitUntil((async () => {
      try {
        await migrateLegacyKvRecords(env, dateString);
        await seedReferenceHistory(env, dateString);
        console.log(`D1 history initialization checked for ${dateString}`);
      } catch (error) {
        console.error('D1 history initialization failed:', error instanceof Error ? error.message : 'unknown error');
      }
    })());

    ctx.waitUntil((async () => {
      try {
        const quote = await ensureDailyQuote(env, dateString);
        console.log(`D1 daily quote check completed for ${dateString}: ${quote ? 'available' : 'unavailable'}`);
      } catch (error) {
        console.error('Daily quote job failed:', error instanceof Error ? error.message : 'unknown error');
      }
    })());

    ctx.waitUntil((async () => {
      try {
        const data = await fetchMissionData(env);
        await saveMissionData(env, data);
        const saved = await saveDailyMissionSnapshot(env, data, dateString);
        if (saved) console.log(`Daily mission snapshot saved for ${dateString}`);
        console.log(`Scheduled mission check completed: ${data.missions.length} V-Bucks mission(s), ${data.totalVbucks} V-Bucks`);
      } catch (error) {
        console.error('Scheduled mission check failed:', error instanceof Error ? error.message : 'unknown error');
      }
    })());
  }
};
