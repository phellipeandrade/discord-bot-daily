import * as fs from 'fs';
import { USERS_FILE } from './config';
import { i18n } from './i18n';

export interface UserEntry {
  name: string;
  id: string;
}

export interface UserData {
  all: UserEntry[];
  remaining: UserEntry[];
  lastSelected?: UserEntry;
}

export async function loadUsers(): Promise<UserData> {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      const emptyData: UserData = { all: [], remaining: [] };
      await saveUsers(emptyData);
      return emptyData;
    }
    const data = await fs.promises.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    const emptyData: UserData = { all: [], remaining: [] };
    await saveUsers(emptyData);
    return emptyData;
  }
}

export async function saveUsers(data: UserData): Promise<void> {
  await fs.promises.writeFile(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function selectUser(data: UserData): Promise<UserEntry> {
  if (data.remaining.length === 0) {
    data.remaining = [...data.all];
  }
  const index = Math.floor(Math.random() * data.remaining.length);
  const selected = data.remaining.splice(index, 1)[0];
  data.lastSelected = selected;
  await saveUsers(data);
  return selected;
}

export function formatUsers(users: UserEntry[]): string {
  if (users.length === 0) return i18n.t('list.empty');
  return users.map(u => `• ${u.name}`).join('\n');
}
