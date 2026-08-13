import localization from './localization.json';

const TOKEN_URL =
  'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';

const WORLD_INFO_URL =
  'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/world/info';

const DEFAULT_LANGUAGE = 'en';
const KV_MISSIONS_KEY = 'current_missions';
const KV_HISTORY_PREFIX = 'history:daily:';
const KV_HISTORY_SEED_KEY = 'history:seed:v1';
const KV_QUOTE_PREFIX = 'quote:daily:';
const KV_LATEST_QUOTE_KEY = 'quote:latest';
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

function quoteKey(dateString) {
  return `${KV_QUOTE_PREFIX}${dateString}`;
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
  if (!env.HAWKBUCKS_CACHE) return false;

  const key = historyKey(dateString);
  const existing = await env.HAWKBUCKS_CACHE.get(key, 'json');

  if (existing) return false;

  await env.HAWKBUCKS_CACHE.put(
    key,
    JSON.stringify(missionSnapshot(data, dateString))
  );

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
  if (!env.HAWKBUCKS_CACHE) return false;

  const initialized = await env.HAWKBUCKS_CACHE.get(KV_HISTORY_SEED_KEY);
  if (initialized) return false;

  const seedTotals = new Map();
  const add = (offset, total) => seedTotals.set(shiftUtcDate(dateString, offset), total);

  add(0, 0);
  add(-1, 50);
  for (let offset = -2; offset >= -6; offset -= 1) add(offset, 20);
  add(-7, 10);
  for (let offset = -8; offset >= -13; offset -= 1) add(offset, 15);
  for (let offset = -14; offset >= -28; offset -= 1) add(offset, 20);
  add(-29, 50);
  add(-30, 700);

  for (let offset = -31; offset >= -59; offset -= 1) add(offset, 0);

  const yearStart = `${dateString.slice(0, 4)}-01-01`;
  const elapsedDays = Math.floor(
    (new Date(`${dateString}T00:00:00.000Z`) - new Date(`${yearStart}T00:00:00.000Z`)) /
      86400000
  );
  if (elapsedDays >= 30) seedTotals.set(yearStart, 4650);

  const entries = [...seedTotals.entries()];
  const existingValues = await env.HAWKBUCKS_CACHE.get(
    entries.map(([date]) => historyKey(date)),
    'json'
  );
  const writes = [];

  for (const [date, total] of entries) {
    if (existingValues.get(historyKey(date))) continue;
    writes.push(
      env.HAWKBUCKS_CACHE.put(
        historyKey(date),
        JSON.stringify(seededHistoryRecord(date, total))
      )
    );
  }

  await Promise.all(writes);
  await env.HAWKBUCKS_CACHE.put(KV_HISTORY_SEED_KEY, JSON.stringify({
    version: 1,
    initializedAt: new Date().toISOString()
  }));
  return true;
}

function emptyPeriod() {
  return {
    totalVbucks: null,
    missionCount: null,
    daysWithData: 0,
    comparison: null
  };
}

function periodFromRecords(records, comparisonRecords = null) {
  const available = records.filter(Boolean);

  if (available.length === 0) return emptyPeriod();

  const totalVbucks = available.reduce(
    (sum, record) => sum + Number(record.totalVbucks || 0),
    0
  );
  const missionCount = available.reduce(
    (sum, record) => sum + Number(record.missionCount || 0),
    0
  );
  let comparison = null;

  if (comparisonRecords) {
    const previous = comparisonRecords.filter(Boolean).reduce(
      (sum, record) => sum + Number(record.totalVbucks || 0),
      0
    );

    if (previous > 0) {
      comparison = {
        percent: Number((((totalVbucks - previous) / previous) * 100).toFixed(1)),
        baselineTotalVbucks: previous
      };
    }
  }

  return {
    totalVbucks,
    missionCount,
    daysWithData: available.length,
    comparison
  };
}

function dateRange(endDate, length) {
  return Array.from({ length }, (_, index) =>
    shiftUtcDate(endDate, -(length - 1 - index))
  );
}

async function getHistory(env, dateString = utcDateString()) {
  const todayDates = dateRange(dateString, 1);
  const yesterdayDates = dateRange(shiftUtcDate(dateString, -1), 1);
  const last7Dates = dateRange(dateString, 7);
  const previous7Dates = dateRange(shiftUtcDate(dateString, -7), 7);
  const last30Dates = dateRange(dateString, 30);
  const previous30Dates = dateRange(shiftUtcDate(dateString, -30), 30);
  const yearStart = `${dateString.slice(0, 4)}-01-01`;
  const thisYearDates = dateRange(dateString, Math.floor(
    (new Date(`${dateString}T00:00:00.000Z`) - new Date(`${yearStart}T00:00:00.000Z`)) /
      86400000 +
      1
  ));
  const previousYearEnd = `${String(Number(dateString.slice(0, 4)) - 1)}${dateString.slice(4)}`;
  const previousYearDates = dateRange(previousYearEnd, thisYearDates.length);
  const allDates = [
    ...todayDates,
    ...yesterdayDates,
    ...last7Dates,
    ...previous7Dates,
    ...last30Dates,
    ...previous30Dates,
    ...thisYearDates,
    ...previousYearDates
  ];
  const uniqueKeys = [...new Set(allDates)].map(historyKey);
  const chunks = [];
  for (let i = 0; i < uniqueKeys.length; i += 100) {
    chunks.push(uniqueKeys.slice(i, i + 100));
  }
  const valueMaps = await Promise.all(
    chunks.map((keys) => env.HAWKBUCKS_CACHE.get(keys, 'json'))
  );
  const values = new Map(valueMaps.flatMap((map) => [...map.entries()]));
  const recordFor = (date) => values.get(historyKey(date)) || null;
  const recordsFor = (dates) => dates.map(recordFor);

  return {
    success: true,
    date: dateString,
    today: periodFromRecords(recordsFor(todayDates)),
    yesterday: periodFromRecords(recordsFor(yesterdayDates)),
    last7Days: periodFromRecords(recordsFor(last7Dates), recordsFor(previous7Dates)),
    last30Days: periodFromRecords(recordsFor(last30Dates), recordsFor(previous30Dates)),
    thisYear: periodFromRecords(recordsFor(thisYearDates), recordsFor(previousYearDates))
  };
}

function cleanGeneratedQuote(value) {
  return String(value || '')
    .trim()
    .replace(/^['"“”]+|['"“”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function generateDailyQuote(env, dateString = utcDateString()) {
  if (!env.GEMINI_API_KEY || !env.HAWKBUCKS_CACHE) {
    console.warn('Daily quote skipped: required configuration is unavailable');
    return null;
  }

  const key = quoteKey(dateString);
  const existing = await env.HAWKBUCKS_CACHE.get(key, 'json');

  if (existing?.quote) return existing;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                'Generate one original English quote specifically about Fortnite: Save the World. Make it atmospheric, meaningful, memorable, and relatively short. It may reference the Storm, Husks, Survivors, Commanders, Heroes, Homebase, or the fight to save the world. Do not generate a Battle Royale quote, copyrighted dialogue, or an imitation of a named character. Return only the quote, with no quotation marks and no explanation.'
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 120
      }
    })
  });

  if (!response.ok) {
    console.error(`Daily quote generation failed with HTTP ${response.status}`);
    return null;
  }

  const payload = await response.json().catch(() => null);
  const quote = cleanGeneratedQuote(payload?.candidates?.[0]?.content?.parts?.[0]?.text);

  if (!quote || quote.length > 400) {
    console.error('Daily quote generation returned no usable quote');
    return null;
  }

  const record = {
    utcDate: dateString,
    quote,
    createdAt: new Date().toISOString()
  };

  await env.HAWKBUCKS_CACHE.put(key, JSON.stringify(record));
  await env.HAWKBUCKS_CACHE.put(KV_LATEST_QUOTE_KEY, JSON.stringify(record));
  return record;
}

async function getDailyQuote(env, dateString = utcDateString()) {
  if (!env.HAWKBUCKS_CACHE) return null;

  const current = await env.HAWKBUCKS_CACHE.get(quoteKey(dateString), 'json');
  if (current?.quote) return current;

  const latest = await env.HAWKBUCKS_CACHE.get(KV_LATEST_QUOTE_KEY, 'json');
  return latest?.quote ? latest : null;
}

async function handleHistory(env, origin) {
  try {
    if (!env.HAWKBUCKS_CACHE) {
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
    const quote = await getDailyQuote(env);

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
    ctx.waitUntil(
      fetchMissionData(env)
        .then(async (data) => {
          await saveMissionData(env, data);

          try {
            const dateString = utcDateString();
            const saved = await saveDailyMissionSnapshot(env, data, dateString);

            await seedReferenceHistory(env, dateString);

            if (saved) {
              console.log(`Daily mission snapshot saved for ${dateString}`);
            }
          } catch (error) {
            console.error(
              'Daily mission snapshot failed:',
              error instanceof Error ? error.message : 'unknown error'
            );
          }

          if (controller.cron === '0 * * * *' || controller.cron === '*/30 * * * *') {
            const now = new Date();
            if (now.getUTCMinutes() === 0) {
              try {
                await generateDailyQuote(env, utcDateString(now));
              } catch (error) {
                console.error(
                  'Daily quote job failed:',
                  error instanceof Error ? error.message : 'unknown error'
                );
              }
            }
          }

          console.log(
            `Scheduled mission check completed: ` +
            `${data.missions.length} V-Bucks mission(s), ` +
            `${data.totalVbucks} V-Bucks`
          );
        })
        .catch((error) => {
          console.error(
            'Scheduled mission check failed:',
            error
          );
        })
    );
  }
};
