import { database, UserData, UserEntry } from '@/database';
import { i18n } from '@/i18n';
import { todayISO } from '@/date';

export { UserData, UserEntry } from '@/database';

export async function loadUsers(): Promise<UserData> {
  try {
    return await database.loadUsers();
  } catch (error) {
    console.error('Error loading users from database:', error);
    const emptyData: UserData = { all: [], remaining: [], skips: {} };
    await saveUsers(emptyData);
    return emptyData;
  }
}

export async function saveUsers(data: UserData): Promise<void> {
  await database.saveUsers(data);
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

  let eligible = data.remaining.filter(u => !isSkipped(u));
  
  // Salva os dados se houver skips expirados removidos
  if (hasExpiredSkips) {
    await saveUsers(data);
  }

  if (eligible.length === 0) {
    const allEligible = data.all.filter(u => !isSkipped(u));
    if (allEligible.length === 0) {
      throw new Error(i18n.t('selection.noEligibleUsers'));
    }
    data.remaining = [...allEligible];
    eligible = [...allEligible];
  }

  const isLastEligible = eligible.length === 1;

  const index = Math.floor(Math.random() * eligible.length);
  const selected = eligible[index];
  data.remaining = data.remaining.filter(u => u.id !== selected.id);
  if (isLastEligible) {
    data.remaining = [...data.all];
  }
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
