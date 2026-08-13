# V-Bucks Alerts - JavaScript Version

JavaScript/Node.js version of the V-Bucks Alerts bot for Fortnite Save the World.

## Features
- Checks for V-Bucks mission alerts in Save the World
- Sends notifications to Discord via webhook
- Supports multiple languages
- Automatic token refresh (every hour)
- Configurable check rate

## Prerequisites
- [Node.js](https://nodejs.org/) 16 or higher
- Discord webhook URL
- Epic Games account credentials (Device Auth)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```
   Or run `packages.bat` on Windows

2. **Configure settings:**
   Edit `settings.json` with your information:
   ```json
   {
     "last_check": "2023-04-23T18:00:00.000Z",
     "checkrate": 30,
     "language": "en",
     "webhook_url": "YOUR_DISCORD_WEBHOOK_URL",
     "account_id": "YOUR_EPIC_ACCOUNT_ID",
     "device_id": "YOUR_DEVICE_ID",
     "secret": "YOUR_DEVICE_SECRET",
     "title": "V-Bucks Mission Alerts"
   }
   ```

3. **Get Device Auth credentials:**
   Use [DeviceAuthGenerator](https://github.com/xMistt/DeviceAuthGenerator) to obtain your `account_id`, `device_id`, and `secret`.

4. **Run the bot:**
   ```bash
   npm start
   ```
   Or run `start.bat` on Windows

## Supported Languages
`ar`, `de`, `en`, `es`, `es-419`, `fr`, `it`, `ja`, `ko`, `pl`, `pt-BR`, `ru`, `tr`

## Configuration Options
- `checkrate`: Check interval in seconds (default: 30, recommended: ≥30)
- `language`: Language for mission names and descriptions
- `webhook_url`: Discord webhook URL for notifications
- `title`: Custom title for the Discord embed

## Cloudflare Worker Secrets

The deployed Worker reads Epic credentials from its existing secret bindings.
For daily Save the World quotes, configure the following additional secret
manually with Wrangler or the Cloudflare dashboard:

```bash
npx wrangler secret put GEMINI_API_KEY
```

Never place the secret value in source files, `wrangler.toml`, frontend
environment variables, logs, or documentation.

## How It Works
1. Authenticates with Epic Games using Device Auth
2. Fetches current world info from Fortnite API
3. Checks for mission alerts with V-Bucks rewards
4. Sends formatted Discord embed with mission details
5. Updates `last_check` timestamp to avoid duplicate notifications
6. Repeats at configured interval

## Files
- `index.js` - Main bot logic
- `settings.json` - Configuration file
- `localization.json` - Language translations
- `package.json` - Node.js dependencies
- `start.bat` / `packages.bat` - Windows helper scripts

## Support
- [Twitter](https://twitter.com/Liqutch)
- [Discord](https://discord.gg/nNPrQeqCyf)
- [Contact](https://liqutch.dev/)

## HawkBucks Worker data setup

The Worker uses `HAWKBUCKS_CACHE` for short-lived mission-result caching. Persistent daily mission snapshots and daily quotes are stored in the D1 database bound as `DB`.

After creating the `hawkbucks-data` D1 database, set its returned ID in `worker/wrangler.toml` as `database_id` under the existing `[[d1_databases]]` binding. Do not put secret values in this file.

Apply the additive schema locally with:

```text
npx wrangler d1 migrations apply hawkbucks-data --local --config wrangler.toml
```

Apply it to production with:

```text
npx wrangler d1 migrations apply hawkbucks-data --remote --config wrangler.toml
```

Configure the Gemini secret separately:

```text
npx wrangler secret put GEMINI_API_KEY --config wrangler.toml
```

The scheduled Worker keeps its existing 30-minute cadence. Each run updates the current UTC day's mission row with an upsert and generates at most one quote for the UTC day after confirming that the D1 row does not already exist. The reference history seed uses `INSERT OR IGNORE`, so it only fills missing dates and can safely be run repeatedly.

The reference history rows are relative to the UTC bootstrap anchor: offset 0 = 0 V-Bucks / 0 missions; offset -1 = 50 / 1; offsets -2 and -3 = 20 / 1 each; offsets -4 through -6 = 20 / 0 each; offsets -7 through -15 = 1 mission each (with V-Bucks totals 10, 15, 15, 15, 15, 15, 15, 20, 20); offsets -16 through -28 = 20 / 0; offset -29 = 50 / 0; offset -30 = 700 / 0; offsets -31 through -59 = 0 / 0. The current-year start row is 4650 / 107, and the previous-year start row is 12480 / 0. All rows use UTC dates and `INSERT OR IGNORE`.
