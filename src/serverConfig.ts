import * as fs from 'fs';
import * as path from 'path';

export interface ServerConfig {
  guildId: string;
  channelId: string;
  musicChannelId: string;
  token?: string;
  timezone?: string;
  language?: string;
  dailyTime?: string;
  dailyDays?: string;
  holidayCountries?: string[];
  dateFormat?: string;
  admins?: string[];
}

const CONFIG_PATH = path.join(__dirname, 'serverConfig.json');

export function loadServerConfig(): ServerConfig | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
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
