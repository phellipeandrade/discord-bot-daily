import * as dotenv from 'dotenv';
import { loadServerConfig, ServerConfig } from '@/serverConfig';
import RBAC from '@rbac/rbac';


dotenv.config();

const fileConfig = loadServerConfig();

export let TOKEN = fileConfig?.token || '';

export let CHANNEL_ID = fileConfig?.channelId || '';
export let GUILD_ID = fileConfig?.guildId || '';
export let MUSIC_CHANNEL_ID = fileConfig?.musicChannelId || '';
export let DAILY_VOICE_CHANNEL_ID = fileConfig?.dailyVoiceChannelId || '';
export let PLAYER_FORWARD_COMMAND = fileConfig?.playerForwardCommand || '';

// Users are now stored in SQLite database
export const USERS_FILE = 'database'; // For backward compatibility
export let TIMEZONE = fileConfig?.timezone || 'America/Sao_Paulo';
export let LANGUAGE = fileConfig?.language || 'pt-br';
export let DAILY_TIME = fileConfig?.dailyTime || '09:00';
export let DAILY_DAYS = fileConfig?.dailyDays || '1-5';
export let HOLIDAY_COUNTRIES = (fileConfig?.holidayCountries || ['BR']).map((c) =>
  c.trim().toUpperCase()
);
function defaultDateFormat(lang: string): string {
  return lang === 'pt-br' ? 'DD-MM-YYYY' : 'YYYY-MM-DD';
}

export let DATE_FORMAT =
  fileConfig?.dateFormat || defaultDateFormat(LANGUAGE);
export let DISABLED_UNTIL = fileConfig?.disabledUntil || '';
export let ADMINS: string[] = fileConfig?.admins || [];

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
  if (config.playerForwardCommand)
    PLAYER_FORWARD_COMMAND = config.playerForwardCommand;
  if (config.token) TOKEN = config.token;
  if (config.timezone) TIMEZONE = config.timezone;
  if (config.language) LANGUAGE = config.language;
  if (config.dailyTime) DAILY_TIME = config.dailyTime;
  if (config.dailyDays) DAILY_DAYS = config.dailyDays;
  if (config.holidayCountries) HOLIDAY_COUNTRIES = config.holidayCountries;
  if (config.dateFormat) {
    DATE_FORMAT = config.dateFormat;
  } else if (config.language) {
    DATE_FORMAT = defaultDateFormat(config.language);
  }
  if (config.disabledUntil !== undefined) DISABLED_UNTIL = config.disabledUntil;
  if (config.admins) ADMINS = config.admins;
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
      `PLAYER_CMD=${PLAYER_FORWARD_COMMAND || 'N/A'}`,
      `ADMINS=${ADMINS.length}`,
      `USERS=${USERS_FILE}`,
      `DATE_FMT=${DATE_FORMAT}`,
      `DISABLED_UNTIL=${DISABLED_UNTIL || 'none'}`
    ].join(' | ')
  );
}

export function checkRequiredConfig(): string[] {
  const missing: string[] = [];
  if (!TOKEN) missing.push('TOKEN');
  if (!GUILD_ID) missing.push('GUILD_ID');
  if (!CHANNEL_ID) missing.push('CHANNEL_ID');
  if (!MUSIC_CHANNEL_ID) missing.push('MUSIC_CHANNEL_ID');
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

/**
 * Reload configuration from `serverConfig.json` if present.
 * This is used instead of file watchers and should be called
 * before handling commands that depend on the config.
 */
export function reloadServerConfig(): void {
  const cfg = loadServerConfig();
  if (cfg) {
    updateServerConfig(cfg);
  }
}
