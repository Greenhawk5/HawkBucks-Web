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