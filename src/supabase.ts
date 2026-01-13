import { createClient, SupabaseClient } from '@supabase/supabase-js';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Interfaces mantidas da implementação anterior
export interface Reminder {
  id: number;
  userId: string;
  userName: string;
  message: string;
  scheduledFor: string; // ISO 8601 UTC
  createdAt: string; // ISO 8601 UTC
  sent: boolean;
  sentAt?: string; // ISO 8601 UTC
}

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
  /** Users that were readded and should be prioritized in next selection */
  retryUsers?: string[];
}

class SupabaseDatabase {
  private client: SupabaseClient;
  private isConnected: boolean = true;
  private lastConnectionCheck: number = 0;
  private readonly CONNECTION_CHECK_INTERVAL = 60000; // 1 minute

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  private async checkConnection(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastConnectionCheck < this.CONNECTION_CHECK_INTERVAL) {
      return this.isConnected;
    }

    try {
      // Simple health check query
      const { error } = await this.client
        .from('reminders')
        .select('id')
        .limit(1);
      
      this.isConnected = !error;
      this.lastConnectionCheck = now;
      
      if (error) {
        console.warn('⚠️ Supabase connection check failed:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
      } else {
        console.log('✅ Supabase connection is healthy');
      }
      
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      this.lastConnectionCheck = now;
      console.warn('⚠️ Supabase connection check failed with exception:', error);
      return false;
    }
  }

  // ===== REMINDERS =====

  async addReminder(
    userId: string,
    userName: string,
    message: string,
    scheduledFor: string
  ): Promise<number> {
    const { data, error } = await this.client
      .from('reminders')
      .insert({
        user_id: userId,
        user_name: userName,
        message,
        scheduled_for: scheduledFor,
        created_at: new Date().toISOString(),
        sent: false
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error adding reminder:', error);
      throw error;
    }

    // Log de criação já é feito em simpleReminderService.addReminder
    return data.id;
  }

  async getPendingReminders(): Promise<Reminder[]> {
    // Check connection health before attempting query
    const isConnected = await this.checkConnection();
    if (!isConnected) {
      console.warn('⚠️ Supabase connection is not healthy, skipping pending reminders check');
      return [];
    }

    const now = new Date().toISOString();
    
    try {
      const { data, error } = await this.client
        .from('reminders')
        .select('*')
        .eq('sent', false)
        .lte('scheduled_for', now)
        .order('scheduled_for', { ascending: true });

      if (error) {
        console.error('Error getting pending reminders:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      return data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        message: row.message,
        scheduledFor: row.scheduled_for,
        createdAt: row.created_at,
        sent: row.sent,
        sentAt: row.sent_at
      }));
    } catch (error) {
      // Mark connection as unhealthy if we get a network error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('fetch failed')) {
        this.isConnected = false;
        console.warn('🔌 Marking Supabase connection as unhealthy due to fetch failure');
      }
      throw error;
    }
  }

  async getRemindersByUser(userId: string): Promise<Reminder[]> {
    const { data, error } = await this.client
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('sent', false)
      .gte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.error('Error getting user reminders:', error);
      throw error;
    }

    return data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      message: row.message,
      scheduledFor: row.scheduled_for,
      createdAt: row.created_at,
      sent: row.sent,
      sentAt: row.sent_at
    }));
  }

  async markReminderAsSent(id: number, userId: string): Promise<void> {
    const { error } = await this.client
      .from('reminders')
      .update({
        sent: true,
        sent_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking reminder as sent:', error);
      throw error;
    }
  }

  async deleteReminder(id: number): Promise<void> {
    const { error } = await this.client
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  }

  async deleteAllRemindersByUser(userId: string): Promise<number> {
    const { count, error } = await this.client
      .from('reminders')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting all reminders for user:', error);
      throw error;
    }

    return count || 0;
  }

  async deleteOldReminders(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();

    const { error } = await this.client
      .from('reminders')
      .delete()
      .eq('sent', true)
      .lt('sent_at', cutoffISO);

    if (error) {
      console.error('Error deleting old reminders:', error);
      throw error;
    }
  }

  async getReminderStats(): Promise<{ total: number; pending: number; sent: number }> {
    const { data, error } = await this.client
      .from('reminders')
      .select('sent');

    if (error) {
      console.error('Error getting reminder stats:', error);
      throw error;
    }

    const total = data.length;
    const sent = data.filter((r: any) => r.sent).length;
    const pending = total - sent;

    return { total, pending, sent };
  }

  // ===== USERS =====

  async loadUsers(): Promise<UserData> {
    try {
      // Carregar todos os usuários
      const { data: users, error: usersError } = await this.client
        .from('users')
        .select('*');

      if (usersError) {
        console.error('Error loading users:', usersError);
        throw usersError;
      }

      // Carregar skips
      const { data: skips, error: skipsError } = await this.client
        .from('skips')
        .select('*');

      if (skipsError) {
        console.error('Error loading skips:', skipsError);
        throw skipsError;
      }

      // Carregar configurações
      const { data: configs } = await this.client
        .from('config')
        .select('*')
        .in('key', ['lastSelectionDate', 'retryUsers']);

      const userEntries: UserEntry[] = users.map((user: any) => ({
        id: user.id,
        name: user.name
      }));

      const remainingUsers = users
        .filter((user: any) => user.in_remaining)
        .map((user: any) => ({
          id: user.id,
          name: user.name
        }));

      const skipMap: Record<string, string> = {};
      skips.forEach((skip: any) => {
        skipMap[skip.user_id] = skip.skip_until;
      });

      const result: UserData = {
        all: userEntries,
        remaining: remainingUsers,
        skips: skipMap
      };

      const lastSelectedUser = users.find((user: any) => user.last_selected);
      if (lastSelectedUser) {
        result.lastSelected = {
          id: lastSelectedUser.id,
          name: lastSelectedUser.name
        };
      }

      // Processar configurações
      if (configs) {
        const configMap: Record<string, string> = {};
        configs.forEach((cfg: any) => {
          configMap[cfg.key] = cfg.value;
        });
        // Adicionar data da última seleção se existir
        if (configMap.lastSelectionDate) {
          result.lastSelectionDate = configMap.lastSelectionDate;
        }

        // Adicionar usuários de retry se existirem
        if (configMap.retryUsers) {
          try {
            result.retryUsers = JSON.parse(configMap.retryUsers);
          } catch (error) {
            console.error('Error parsing retryUsers:', error);
            result.retryUsers = [];
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error loading users from Supabase:', error);
      return { all: [], remaining: [], skips: {} };
    }
  }

  async saveUsers(data: UserData): Promise<void> {
    try {
      // Salvar usuários
      const { error: usersError } = await this.client
        .from('users')
        .upsert(
          data.all.map(user => ({
            id: user.id,
            name: user.name,
            in_remaining: data.remaining.some(r => r.id === user.id),
            last_selected: data.lastSelected?.id === user.id
          }))
        );

      if (usersError) {
        console.error('Error saving users:', usersError);
        throw usersError;
      }

      // Salvar skips
      const skipEntries = data.skips
        ? Object.entries(data.skips).map(([userId, skipUntil]) => ({
            user_id: userId,
            skip_until: skipUntil
          }))
        : [];

      if (skipEntries.length > 0) {
        const { error: skipsError } = await this.client
          .from('skips')
          .upsert(skipEntries);

        if (skipsError) {
          console.error('Error saving skips:', skipsError);
          throw skipsError;
        }
      }

      // Remover skips que não estão mais presentes
      const skipIds = skipEntries.map((entry) => entry.user_id);
      
      if (skipIds.length > 0) {
        const { error: deleteSkipsError } = await this.client
          .from('skips')
          .delete()
          .not('user_id', 'in', skipIds);
          
        if (deleteSkipsError) {
          console.error('Error deleting obsolete skips:', deleteSkipsError);
          throw deleteSkipsError;
        }
      } else {
        // Se não há skipIds, deletar todos os skips usando uma condição que sempre é verdadeira
        const { error: deleteSkipsError } = await this.client
          .from('skips')
          .delete()
          .neq('user_id', ''); // Delete all records where user_id is not empty (which is all records)
          
        if (deleteSkipsError) {
          console.error('Error deleting obsolete skips:', deleteSkipsError);
          throw deleteSkipsError;
        }
      }

      // Salvar configurações
      const configsToSave = [] as { key: string; value: string }[];
      const managedConfigKeys = ['lastSelectionDate', 'retryUsers', 'lastSelected'];
      
      if (data.lastSelectionDate) {
        configsToSave.push({
          key: 'lastSelectionDate',
          value: data.lastSelectionDate
        });
      }

      if (data.retryUsers && data.retryUsers.length > 0) {
        configsToSave.push({
          key: 'retryUsers',
          value: JSON.stringify(data.retryUsers)
        });
      }
      
      if (configsToSave.length > 0) {
        const { error: configError } = await this.client
          .from('config')
          .upsert(configsToSave);

        if (configError) {
          console.error('Error saving configs:', configError);
          throw configError;
        }
      }

      const keysToDelete = managedConfigKeys.filter(
        key => !configsToSave.some(config => config.key === key)
      );

      if (keysToDelete.length > 0) {
        const { error: deleteConfigError } = await this.client
          .from('config')
          .delete()
          .in('key', keysToDelete);

        if (deleteConfigError) {
          console.error('Error deleting obsolete configs:', deleteConfigError);
          throw deleteConfigError;
        }
      }
    } catch (error) {
      console.error('Error saving users to Supabase:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // Supabase não precisa de fechamento explícito
    console.log('🔌 Supabase connection closed');
  }
}

// Singleton instance
export const database = new SupabaseDatabase();
