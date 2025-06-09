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

export function loadUsers(): UserData {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      const emptyData: UserData = { all: [], remaining: [] };
      saveUsers(emptyData);
      return emptyData;
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    const emptyData: UserData = { all: [], remaining: [] };
    saveUsers(emptyData);
    return emptyData;
  }
}

export function saveUsers(data: UserData): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function selectUser(data: UserData): UserEntry {
  if (data.remaining.length === 0) {
    data.remaining = [...data.all];
  }
  const index = Math.floor(Math.random() * data.remaining.length);
  const selected = data.remaining.splice(index, 1)[0];
  data.lastSelected = selected;
  saveUsers(data);
  return selected;
}

export function formatUsers(users: UserEntry[]): string {
  if (users.length === 0) return i18n.t('list.empty');
  return users.map(u => `• ${u.name}`).join('\n');
}
