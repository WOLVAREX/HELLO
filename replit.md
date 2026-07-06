# FOXY BOT

A smart WhatsApp bot powered by AI, built on Baileys (WhatsApp Multi-Device).

## How it works

`fox.js` is the launcher. On startup it:
1. Downloads the bot core package (a zip) from a remote config URL
2. Extracts it to `.fbot/cache/core_bundle/core/`
3. Installs the core's npm dependencies
4. Launches `node index.js` inside the extracted core directory

`index.js` (project root) contains helper utilities (settings backup/restore, Baileys patches) and also acts as an alternative entry point — running `node index.js` directly will bootstrap `fox.js`. This is needed for Pterodactyl panel deployments where MAIN_FILE=index.js.

## Running on Replit

The workflow `Start application` runs `node fox.js`.

Required secrets (set in Replit Secrets):
- `SESSION_ID` — WhatsApp session credentials, must start with `FOXY-BOT:` followed by base64-encoded creds.json
- `OWNER_NUMBER` — WhatsApp number in international format without `+` (e.g. `254712345678`)

Optional env vars (set with defaults):
- `BOT_NAME` — default: `FOXY BOT`
- `BOT_PREFIX` — default: `.`
- `BOT_MODE` — default: `public`
- `BOT_TIMEZONE` — default: `UTC`

## Running on Pterodactyl Panel

Set `MAIN_FILE=index.js` (or `fox.js` — both work). The panel egg runs:
```
node /home/container/${MAIN_FILE}
```
Set `SESSION_ID` and `OWNER_NUMBER` in the panel's environment variables.

## System dependencies (Nix)

These are required for native npm modules (`canvas`, `better-sqlite3`):
- python3, pkg-config, cairo, pango, libpng, libjpeg, giflib, librsvg, pixman, libuuid

## User preferences

- Do not log the source repo URL (f-1 GitHub URL) in bot startup output
