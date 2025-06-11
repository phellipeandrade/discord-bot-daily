import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export const TOKEN = process.env.DISCORD_TOKEN!;
export const CHANNEL_ID = process.env.CHANNEL_ID!;
export const GUILD_ID = process.env.GUILD_ID!;
export const MUSIC_CHANNEL_ID = process.env.MUSIC_CHANNEL_ID!;
export const USERS_FILE = process.env.USERS_FILE
  ? path.resolve(process.env.USERS_FILE)
  : path.join(__dirname, 'users.json');
export const TIMEZONE = process.env.TIMEZONE ?? 'America/Sao_Paulo';
export const LANGUAGE = process.env.BOT_LANGUAGE ?? 'pt-br';
export const DAILY_TIME = process.env.DAILY_TIME ?? '09:00';
export const DAILY_DAYS = process.env.DAILY_DAYS ?? '1-5';
export const HOLIDAY_COUNTRIES = (process.env.HOLIDAY_COUNTRIES ?? 'BR')
  .split(',')
  .map(c => c.trim().toUpperCase())
  .filter(c => c);
export const DATE_FORMAT = process.env.DATE_FORMAT ?? 'YYYY-MM-DD';

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
