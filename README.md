# Discord Daily Selection Bot
[Leia esta página em Português](README.pt-br.md)

Discord bot that automatically selects a random user each weekday and manages music recommendations. It supports English and Brazilian Portuguese.

## Features

- Slash commands to register users, list participants and manage selections
- Daily selection at a configurable time and weekdays
  (timezone and holiday countries can be set via environment variables)
- Slash command names are also available in Portuguese (pt-br)
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
# If omitted, run `/setup` in your server to set the token, guild and channel ids.
GUILD_ID=your-guild-id
CHANNEL_ID=id-of-channel-for-daily-messages
MUSIC_CHANNEL_ID=id-of-channel-with-song-requests
DAILY_VOICE_CHANNEL_ID=id-of-voice-channel-to-play-songs
# Optional
TIMEZONE=America/Sao_Paulo
BOT_LANGUAGE=en
DAILY_TIME=09:00
DAILY_DAYS=1-5
HOLIDAY_COUNTRIES=BR
USERS_FILE=./src/users.json
DATE_FORMAT=YYYY-MM-DD
ADMIN_IDS=1234567890,0987654321
```

`ADMIN_IDS` should list the Discord user IDs that start with admin rights. You can also
edit `serverConfig.json` to manage the list.

Set `BOT_LANGUAGE` to `en` or `pt-br` to change the bot responses.
`DAILY_TIME` uses 24h format `HH:MM` and `DAILY_DAYS` follows cron day-of-week
syntax (e.g. `1-5` for Monday–Friday). `HOLIDAY_COUNTRIES` is a comma-separated
list of country codes (currently `BR` and `US` are supported).
`DATE_FORMAT` controls the date pattern used for the `/skip-until` command and
can also be changed via `/setup`.

## Usage

Run locally in development mode:

```bash
npm run dev
```

### Tests and coverage

Run the test suite:

```bash
npm test
```

Generate a coverage report and badge:

```bash
npm run test:coverage
```

Build and start:

```bash
npm run build
npm start
```

To create a production zip with translations and data:

```bash
npm run build-zip
```

This archive includes a `serverConfig.json` file used by the `/setup` command to
store guild and channel information.

### Commands

**User**

- `join` – self-register using your Discord name
- `list` – display registered, pending and already selected users
- `select` – manually select a random user
- `next-song` – show the next unplayed song from the request channel

**Admin**

- `register <name>` – register a user by name
- `clear-bunnies` – remove bunny reactions added by the bot
- `check-config` – verify if the bot configuration is complete.
- `remove <name>` – remove a user
- `reset` – reset selection list (or restore original list)
- `readd <name>` – re-add a previously selected user back into the pool
- `skip-today <name>` – skip today's draw for the specified user
- `skip-until <name> <date>` – skip selection of a user until the given date (format defined by `DATE_FORMAT`, default `YYYY-MM-DD`)
- `setup` – configure channels, guild ID and other settings. Provide only the parameters you want to update.
- `export` – export data files
- `import` – import runtime data files
- `role <user> <role>` – set a user's role (`admin` or `user`)

### Access control

Two roles are available: **admin** and **user**. All members listed in
`users.json` start as **user**. Admin IDs are stored in `serverConfig.json` and a
Discord user does not need to be registered to become an admin.

The initial admin list can be provided using the `ADMIN_IDS` environment variable or the `admins` field in the config file.

Only admins may run privileged commands such as `/register`, `/clear-bunnies`,
`/check-config`, `/setup`, `/import`, `/export`, `/skip-*` and `/role` itself.
Regular users can still use basic commands like `/join`, `/list`, `/select` and
`/next-song`.

Use the `/role` command to grant or revoke admin access:

```bash
/role @username admin    # grant admin rights
/role @username user     # remove admin rights
```

RBAC checks are handled by the [`@rbac/rbac`](https://www.npmjs.com/package/@rbac/rbac)
library.

## Testing

```bash
npm test
```

## Development

This project uses [Husky](https://typicode.github.io/husky) to run checks before
each commit. The pre-commit hook runs `npm run lint`, which verifies ESLint,
Prettier formatting and TypeScript types. Commit messages are validated using
Commitlint.

## License

This project is licensed under the [MIT License](LICENSE).
