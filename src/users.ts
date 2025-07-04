import * as fs from 'fs';
import { USERS_FILE } from './config';
import { i18n } from './i18n';
import { todayISO } from './date';

export interface UserEntry {
  name: string;
  id: string;
}

export interface UserData {
  all: UserEntry[];
  remaining: UserEntry[];
  lastSelected?: UserEntry;
  /** ISO date string of the last selection */
  lastSelectionDate?: string;
  skips?: Record<string, string>;
}

export async function loadUsers(): Promise<UserData> {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      const emptyData: UserData = { all: [], remaining: [], skips: {} };
      await saveUsers(emptyData);
      return emptyData;
    }
    const data = await fs.promises.readFile(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return { skips: {}, ...parsed } as UserData;
  } catch {
    const emptyData: UserData = { all: [], remaining: [], skips: {} };
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
  
  let hasExpiredSkips = false;
  
  const isSkipped = (u: UserEntry): boolean => {
    const until = data.skips?.[u.id];
    if (!until) return false;
    const today = new Date().toISOString().split('T')[0];
    
    // Se a data já passou, remove o skip expirado
    if (today > until) {
      delete data.skips![u.id];
      hasExpiredSkips = true;
      return false;
    }
    
    return today <= until;
  };

  const eligible = data.remaining.filter(u => !isSkipped(u));
  
  // Salva os dados se houver skips expirados removidos
  if (hasExpiredSkips) {
    await saveUsers(data);
  }

  if (eligible.length === 0) {
    throw new Error(i18n.t('selection.noEligibleUsers'));
  }

  const index = Math.floor(Math.random() * eligible.length);
  const selected = eligible[index];
  data.remaining = data.remaining.filter(u => u.id !== selected.id);
  data.lastSelected = selected;
  data.lastSelectionDate = todayISO();
  await saveUsers(data);
  return selected;
}

export function formatUsers(users: UserEntry[]): string {
  if (users.length === 0) return i18n.t('list.empty');
  return users.map(u => `• ${u.name}`).join('\n');
}

export function findUser(data: UserData, input: string): UserEntry | undefined {
  const mention = /^<@!?(\d+)>$/.exec(input);
  let id: string | null = null;
  if (mention) {
    id = mention[1];
  } else if (/^\d+$/.test(input)) {
    id = input;
  }
  if (id) {
    return data.all.find(u => u.id === id);
  }
  return data.all.find(u => u.name === input);
}
