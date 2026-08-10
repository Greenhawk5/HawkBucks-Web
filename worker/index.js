import localization from './localization.json';

const TOKEN_URL =
  'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';

const WORLD_INFO_URL =
  'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/world/info';

const DEFAULT_LANGUAGE = 'en';
const KV_MISSIONS_KEY = 'current_missions';

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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
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

async function handleMissions(env) {
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
      503
    );
  }

  return json(cached);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      request.method === 'GET' &&
      url.pathname === '/api/missions'
    ) {
      return handleMissions(env);
    }

    if (
      request.method === 'GET' &&
      url.pathname === '/api/health'
    ) {
      return json({
        status: 'ok',
        service: 'HawkBucks Worker',
        timestamp:
          new Date().toISOString()
      });
    }

    if (
      request.method === 'GET' &&
      url.pathname === '/api/admin/update'
    ) {
      try {
        const data = await fetchMissionData(env);

        await saveMissionData(env, data);

        return json({
          success: true,
          message: 'Mission data updated successfully.',
          data
        });
      } catch (error) {
        console.error(
          'Manual mission update failed:',
          error
        );

        return json(
          {
            success: false,
            message: 'Mission update failed.',
            error: error.message
          },
          502
        );
      }
    }

    return json(
      {
        success: false,
        message: 'HawkBucks API'
      },
      404
    );
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      fetchMissionData(env)
        .then(async (data) => {
          await saveMissionData(env, data);

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