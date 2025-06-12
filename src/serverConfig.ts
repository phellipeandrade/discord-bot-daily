import * as fs from 'fs';
import * as path from 'path';

export interface ServerConfig {
  guildId: string;
  channelId: string;
  musicChannelId: string;
  dailyVoiceChannelId?: string;
  token?: string;
  youtubeCookie?: string;
  timezone?: string;
  language?: string;
  dailyTime?: string;
  dailyDays?: string;
  holidayCountries?: string[];
  dateFormat?: string;
  admins?: string[];
}

const CONFIG_PATH = path.join(__dirname, 'serverConfig.json');
const ROOT_CONFIG_PATH = path.resolve(__dirname, '..', 'serverConfig.json');

export function loadServerConfig(): ServerConfig | null {
  try {
    let pathToUse = CONFIG_PATH;
    if (!fs.existsSync(pathToUse)) {
      if (fs.existsSync(ROOT_CONFIG_PATH)) {
        pathToUse = ROOT_CONFIG_PATH;
      } else {
        return null;
      }
    }
    const raw = fs.readFileSync(pathToUse, 'utf-8');
    return JSON.parse(raw) as ServerConfig;
  } catch {
    return null;
  }
}

export async function saveServerConfig(config: ServerConfig): Promise<void> {
  await fs.promises.writeFile(
    CONFIG_PATH,
    JSON.stringify(config, null, 2),
    'utf-8'
  );
}
