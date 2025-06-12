import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { loadServerConfig, ServerConfig } from './serverConfig';
import RBAC from '@rbac/rbac';

const CONFIG_PATH = path.join(__dirname, 'serverConfig.json');
const ROOT_CONFIG_PATH = path.resolve(__dirname, '..', 'serverConfig.json');

dotenv.config();

const fileConfig = loadServerConfig();
export let TOKEN = process.env.DISCORD_TOKEN || fileConfig?.token || '';

export let CHANNEL_ID = process.env.CHANNEL_ID || fileConfig?.channelId || '';
export let GUILD_ID = process.env.GUILD_ID || fileConfig?.guildId || '';
export let MUSIC_CHANNEL_ID =
  process.env.MUSIC_CHANNEL_ID || fileConfig?.musicChannelId || '';
export let DAILY_VOICE_CHANNEL_ID =
  process.env.DAILY_VOICE_CHANNEL_ID || fileConfig?.dailyVoiceChannelId || '';
export const USERS_FILE = process.env.USERS_FILE
  ? path.resolve(process.env.USERS_FILE)
  : path.join(__dirname, 'users.json');
export let TIMEZONE =
  process.env.TIMEZONE || fileConfig?.timezone || 'America/Sao_Paulo';
export let LANGUAGE =
  process.env.BOT_LANGUAGE || fileConfig?.language || 'pt-br';
export let DAILY_TIME =
  process.env.DAILY_TIME || fileConfig?.dailyTime || '09:00';
export let DAILY_DAYS =
  process.env.DAILY_DAYS || fileConfig?.dailyDays || '1-5';
export let HOLIDAY_COUNTRIES = (
  process.env.HOLIDAY_COUNTRIES ||
  (fileConfig?.holidayCountries ? fileConfig.holidayCountries.join(',') : 'BR')
)
  .split(',')
  .map((c) => c.trim().toUpperCase())
  .filter((c) => c);
export let DATE_FORMAT =
  process.env.DATE_FORMAT || fileConfig?.dateFormat || 'YYYY-MM-DD';
const envAdmins = process.env.ADMIN_IDS;
export let ADMINS: string[] = envAdmins
  ? envAdmins
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a)
  : fileConfig?.admins || [];

const rbac = RBAC({ enableLogger: true })({
  user: { can: ['basic'] },
  admin: { can: ['admin'], inherits: ['user'] }
});

export function updateServerConfig(config: ServerConfig): void {
  CHANNEL_ID = config.channelId;
  GUILD_ID = config.guildId;
  MUSIC_CHANNEL_ID = config.musicChannelId;
  if (config.dailyVoiceChannelId)
    DAILY_VOICE_CHANNEL_ID = config.dailyVoiceChannelId;
  if (config.token) TOKEN = config.token;
  if (config.timezone) TIMEZONE = config.timezone;
  if (config.language) LANGUAGE = config.language;
  if (config.dailyTime) DAILY_TIME = config.dailyTime;
  if (config.dailyDays) DAILY_DAYS = config.dailyDays;
  if (config.holidayCountries) HOLIDAY_COUNTRIES = config.holidayCountries;
  if (config.dateFormat) DATE_FORMAT = config.dateFormat;
  if (config.admins && !envAdmins) ADMINS = config.admins;
}

export function logConfig(): void {
  console.log(
    '📚 Config:',
    [
      `TZ=${TIMEZONE}`,
      `LANG=${LANGUAGE}`,
      `DAILY=${DAILY_TIME} (${DAILY_DAYS})`,
      `HOLIDAYS=${HOLIDAY_COUNTRIES.join(',')}`,
      `VOICE=${DAILY_VOICE_CHANNEL_ID || 'N/A'}`,
      `ADMINS=${ADMINS.length}`,
      `USERS=${USERS_FILE}`,
      `DATE_FMT=${DATE_FORMAT}`
    ].join(' | ')
  );
}

export function checkRequiredConfig(): string[] {
  const missing: string[] = [];
  if (!TOKEN) missing.push('TOKEN');
  if (!GUILD_ID) missing.push('GUILD_ID');
  if (!CHANNEL_ID) missing.push('CHANNEL_ID');
  if (!MUSIC_CHANNEL_ID) missing.push('MUSIC_CHANNEL_ID');
  if (!DAILY_VOICE_CHANNEL_ID) missing.push('DAILY_VOICE_CHANNEL_ID');
  return missing;
}

export function isConfigValid(): boolean {
  return checkRequiredConfig().length === 0;
}

export function isAdmin(id: string): boolean {
  return ADMINS.includes(id);
}

export function getRole(id: string): 'admin' | 'user' {
  return isAdmin(id) ? 'admin' : 'user';
}

export async function canUseAdminCommands(id: string): Promise<boolean> {
  return rbac.can(getRole(id), 'admin');
}

export function watchServerConfig(): void {
  const pathToUse = fs.existsSync(CONFIG_PATH)
    ? CONFIG_PATH
    : fs.existsSync(ROOT_CONFIG_PATH)
    ? ROOT_CONFIG_PATH
    : null;

  if (!pathToUse) return;

  fs.watch(pathToUse, (eventType) => {
    if (eventType === 'change') {
      const cfg = loadServerConfig();
      if (cfg) {
        console.log('🔄 serverConfig.json changed, reloading');
        updateServerConfig(cfg);
        logConfig();
      }
    }
  });
}
