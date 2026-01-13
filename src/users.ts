import { database, UserData, UserEntry } from '@/supabase';
import { i18n } from '@/i18n';
import { todayISO } from '@/date';

export { UserData, UserEntry } from '@/supabase';

export class AlreadySelectedTodayError extends Error {
  constructor(lastSelected: UserEntry) {
    super(
      i18n.t('selection.alreadySelectedToday', {
        id: lastSelected.id,
        name: lastSelected.name
      })
    );
    this.name = 'AlreadySelectedTodayError';
  }
}

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
  const today = todayISO();

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
  
  // Priorizar usuários de retry se existirem
  if (data.retryUsers && data.retryUsers.length > 0) {
    const retryEligible = eligible.filter(u => data.retryUsers!.includes(u.id));
    if (retryEligible.length > 0) {
      eligible = retryEligible;
    }
  }
  
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
  
  // Remover usuário selecionado da lista de retry se estiver nela
  if (data.retryUsers && data.retryUsers.includes(selected.id)) {
    data.retryUsers = data.retryUsers.filter(id => id !== selected.id);
    // Se não há mais usuários de retry, limpar a lista
    if (data.retryUsers.length === 0) {
      data.retryUsers = undefined;
    }
  }
  
  if (isLastEligible) {
    // Avoid picking the same person immediately after a full rotation
    data.remaining = data.all.filter(u => u.id !== selected.id);
  }
  data.lastSelected = selected;
  data.lastSelectionDate = today;
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
