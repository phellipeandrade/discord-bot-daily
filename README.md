# Discord Daily Selection Bot

Discord bot that automatically selects a random user each weekday and manages music recommendations. It supports English and Brazilian Portuguese.

## Features

- Slash commands to register users, list participants and manage selections
- Daily selection at a configurable time and weekdays
  (timezone and holiday countries can be set via environment variables)
- Music utilities to fetch the next unplayed song from a channel
- Optional multilingual responses (English default, Portuguese-BR available)

## Requirements

- Node.js >= 18
- Discord bot token and permissions to register slash commands

## Installation

```bash
npm install
```

## Configuration

Create an `.env` file with the following variables:

```
DISCORD_TOKEN=your-bot-token
GUILD_ID=your-guild-id
CHANNEL_ID=id-of-channel-for-daily-messages
MUSIC_CHANNEL_ID=id-of-channel-with-song-requests
# Optional
TIMEZONE=America/Sao_Paulo
BOT_LANGUAGE=en
DAILY_TIME=09:00
DAILY_DAYS=1-5
HOLIDAY_COUNTRIES=BR
```
`DAILY_TIME` uses 24h format `HH:MM` and `DAILY_DAYS` follows cron day-of-week
syntax (e.g. `1-5` for Monday–Friday). `HOLIDAY_COUNTRIES` is a comma-separated
list of country codes (currently `BR` and `US` are supported).

## Usage

Run locally in development mode:

```bash
npm run dev
```

Build and start:

```bash
npm run build
npm start
```

### Commands

- `register <name>` – register a user by name
- `join` – self-register using your Discord name
- `remove <name>` – remove a user
- `list` – display registered, pending and already selected users
- `select` – manually select a random user
- `reset` – reset selection list (or restore original list)
- `next-song` – show the next unplayed song from the request channel
- `clear-bunnies` – remove bunny reactions added by the bot
- `readd <name>` – re-add a previously selected user back into the pool

## Testing

```bash
npm test
```

## License

This project is licensed under the [MIT License](LICENSE).
