# Discord Daily Selection Bot
[Leia esta página em Português](README.pt-br.md)

Discord bot that automatically selects a random user each weekday and manages music recommendations. It supports English and Brazilian Portuguese.

## Features

- Slash commands to register users, list participants and manage selections
- Daily selection at a configurable time and weekdays
  (timezone and holiday countries are configured via `serverConfig.json`)
- Slash command names are also available in Portuguese (pt-br)
- Music utilities to fetch songs and play them directly in a voice channel (with a stop command)
- Optional multilingual responses (English default, Portuguese-BR available)

## Requirements

- Node.js >= 18
- Discord bot token and permissions to register slash commands

## Discord setup

Invite the bot with the `bot` and `applications.commands` scopes and grant these
permissions:

- Send Messages
- Read Message History
- Add Reactions
- Manage Messages (needed for `/clear-bunnies`)
- Embed Links
- Attach Files
- Connect and Speak in voice channels
- Use Application Commands

This set of permissions corresponds to the integer `3270720`.
Enable the **Message Content Intent** in the Discord developer portal and ensure
the bot role can view and interact in the channels defined by
`CHANNEL_ID` and `MUSIC_CHANNEL_ID`. If you plan to use the music player,
also allow access to the voice channel configured by `DAILY_VOICE_CHANNEL_ID`.

## Installation

```bash
npm install
```

## Configuration

Copy `src/serverConfig.sample.json` to `src/serverConfig.json` and
fill in the desired values. All settings such as token, guild ID,
channel IDs and scheduling options are read from this file. Only
`NODE_ENV` and `USERS_FILE` are read from environment variables.

`USERS_FILE` can point to a custom path for user data; otherwise the
default `src/users.json` will be used.

The `admins` field in `serverConfig.json` defines which Discord user IDs
start with admin rights.


Set `BOT_LANGUAGE` to `en` or `pt-br` to change the bot responses.
`DAILY_TIME` uses 24h format `HH:MM` and `DAILY_DAYS` follows cron day-of-week
syntax (e.g. `1-5` for Monday–Friday). `HOLIDAY_COUNTRIES` is a comma-separated
list of country codes (currently `BR` and `US` are supported).
`DATE_FORMAT` controls the date pattern used for the `/skip-until` command and
can also be changed via `/setup`. When `BOT_LANGUAGE` is `pt-br`, the default
format becomes `DD-MM-YYYY`.
`DISABLED_UNTIL` can set an ISO date to pause daily announcements until that day.

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
store guild and channel information. The bot searches for this file in `src/`
first and falls back to the repository root if not found. The `xhr-sync-worker.js` file required
by jsdom is also packaged to avoid runtime errors.

### Commands

**User**

- `join` – self-register using your Discord name
- `list` – display registered, pending and already selected users
- `select` – manually select a random user
- `next-song` – show the next unplayed song from the request channel
- `stop-music` – stop the current music playback

**Admin**

- `register <name>` – register a user by name
- `clear-bunnies` – remove bunny reactions added by the bot
- `check-config` – verify if the bot configuration is complete.
- `remove <user>` – remove a user (mention, id or name)
- `reset` – reset selection list (or restore original list)
- `readd <user>` – re-add a previously selected user back into the pool (mention, id or name)
- `skip-today <user>` – skip today's draw for the specified user (mention, id or name)
- `skip-until <user> <date>` – skip selection of a user until the given date (format defined by `DATE_FORMAT`, default `YYYY-MM-DD`; user can be mention, id or name)
- `disable` – disable daily announcements indefinitely
- `disable-until <date>` – disable daily announcements until the given date (format defined by `DATE_FORMAT`, default `YYYY-MM-DD`)
- `enable` – re-enable daily announcements
- `setup` – configure channels, guild ID and other settings. Provide only the parameters you want to update.
- `export` – export data files
- `import` – import runtime data files
- `role <user> <role>` – set a user's role (`admin` or `user`)

### Access control

Two roles are available: **admin** and **user**. All members listed in
`users.json` start as **user**. Admin IDs are stored in `serverConfig.json` and a
Discord user does not need to be registered to become an admin.

The initial admin list can be defined in the `admins` field of `serverConfig.json`.

Only admins may run privileged commands such as `/register`, `/clear-bunnies`,
`/check-config`, `/setup`, `/import`, `/export`, `/skip-*` and `/role` itself.
Regular users can still use basic commands like `/join`, `/list`, `/select`,
`/next-song` and `/stop-music`.

Use the `/role` command to grant or revoke admin access:

```bash
/role @username admin    # grant admin rights
/role @username user     # remove admin rights
```

RBAC checks are handled by the [`@rbac/rbac`](https://www.npmjs.com/package/@rbac/rbac)
library.

### Music player

The bot fetches songs from the text channel defined by `MUSIC_CHANNEL_ID`.
Running `/next-song` replies with the next unplayed message containing a link,
attachment or embed along with a **Play** button. If `DAILY_VOICE_CHANNEL_ID`
is set, pressing the button will make the bot join that voice channel and stream
the audio. If `PLAYER_FORWARD_COMMAND` is configured, instead of playing the
music directly, the bot will reply with a command you can copy and paste in
another player bot. The original request message receives a 🐰 reaction so it
won't be selected again.

Use `/stop-music` to stop the current playback. Admins can remove all bunny
reactions from the request channel with `/clear-bunnies` if needed.

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
