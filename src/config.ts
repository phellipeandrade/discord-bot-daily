import * as path from 'path';
import * as dotenv from 'dotenv';
import { loadServerConfig, ServerConfig } from './serverConfig';

dotenv.config();

const fileConfig = loadServerConfig();
export let TOKEN = process.env.DISCORD_TOKEN || fileConfig?.token || '';

export let CHANNEL_ID = process.env.CHANNEL_ID || fileConfig?.channelId || '';
export let GUILD_ID = process.env.GUILD_ID || fileConfig?.guildId || '';
export let MUSIC_CHANNEL_ID =
  process.env.MUSIC_CHANNEL_ID || fileConfig?.musicChannelId || '';
export const USERS_FILE = process.env.USERS_FILE
  ? path.resolve(process.env.USERS_FILE)
  : path.join(__dirname, 'users.json');
export const TIMEZONE = process.env.TIMEZONE ?? 'America/Sao_Paulo';
export const LANGUAGE = process.env.BOT_LANGUAGE ?? 'pt-br';
export const DAILY_TIME = process.env.DAILY_TIME ?? '09:00';
export const DAILY_DAYS = process.env.DAILY_DAYS ?? '1-5';
export const HOLIDAY_COUNTRIES = (process.env.HOLIDAY_COUNTRIES ?? 'BR')
  .split(',')
  .map((c) => c.trim().toUpperCase())
  .filter((c) => c);
export const DATE_FORMAT = process.env.DATE_FORMAT ?? 'YYYY-MM-DD';

export function updateServerConfig(config: ServerConfig): void {
  CHANNEL_ID = config.channelId;
  GUILD_ID = config.guildId;
  MUSIC_CHANNEL_ID = config.musicChannelId;
  if (config.token) TOKEN = config.token;
}

export function logConfig(): void {
  console.log(
    '📚 Config:',
    [
      `TZ=${TIMEZONE}`,
      `LANG=${LANGUAGE}`,
      `DAILY=${DAILY_TIME} (${DAILY_DAYS})`,
      `HOLIDAYS=${HOLIDAY_COUNTRIES.join(',')}`,
      `USERS=${USERS_FILE}`,
      `DATE_FMT=${DATE_FORMAT}`
    ].join(' | ')
  );
}
