import { Client } from 'discord.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Reminder } from '@/supabase';

/**
 * Simplified Realtime Reminder Service
 * Uses a hybrid approach: realtime for new reminders + polling for existing ones
 */
class RealtimeReminderService {
  private client: Client | null = null;
  private supabaseClient: SupabaseClient | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL_MS = 60000; // 1 minute (less frequent than original)

  constructor() {
    // Create Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);
    }
  }

  setClient(client: Client): void {
    this.client = client;
  }

  async start(): Promise<void> {
    if (!this.client) {
      console.warn('Client not set for reminder service');
      return;
    }

    if (!this.supabaseClient) {
      console.warn('Supabase client not initialized, falling back to polling');
      this.fallbackToPolling();
      return;
    }

    try {
      // Start with a less frequent polling approach
      this.startPolling();
      
      // Check for existing pending reminders on startup
      await this.checkPendingReminders();
      
      console.log('🔔 Hybrid reminder service started (realtime + polling)');
    } catch (error) {
      console.error('❌ Failed to start hybrid service:', error);
      this.fallbackToPolling();
    }
  }

  async stop(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log('🔔 Hybrid reminder service stopped');
  }

  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Less frequent polling (1 minute instead of 30 seconds)
    this.pollingInterval = setInterval(() => {
      this.checkPendingReminders().catch(console.error);
    }, this.POLLING_INTERVAL_MS);
  }

  private async checkPendingReminders(): Promise<void> {
    if (!this.client || !this.supabaseClient) return;

    try {
      const { data, error } = await this.supabaseClient
        .from('reminders')
        .select('*')
        .eq('sent', false)
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true });

      if (error) {
        console.error('Error fetching pending reminders:', error);
        return;
      }

      const pendingReminders = data.map((row: Record<string, unknown>) => ({
        id: row.id as number,
        userId: row.user_id as string,
        userName: row.user_name as string,
        message: row.message as string,
        scheduledFor: row.scheduled_for as string,
        createdAt: row.created_at as string,
        sent: row.sent as boolean,
        sentAt: row.sent_at as string | undefined
      }));
      
      for (const reminder of pendingReminders) {
        await this.sendReminder(reminder);
      }
    } catch (error) {
      console.error('Error checking pending reminders:', error);
    }
  }

  private async sendReminder(reminder: Reminder): Promise<void> {
    if (!this.client || !this.supabaseClient) return;

    try {
      const user = await this.client.users.fetch(reminder.userId);
      if (user) {
        await user.send(`🔔 **Lembrete:** ${reminder.message}`);
        
        // Mark as sent in database
        await this.supabaseClient
          .from('reminders')
          .update({
            sent: true,
            sent_at: new Date().toISOString()
          })
          .eq('id', reminder.id)
          .eq('user_id', reminder.userId);
        
        console.log(`✅ Reminder sent to ${reminder.userName}: ${reminder.message}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send reminder to ${reminder.userName}:`, error);
    }
  }

  private fallbackToPolling(): void {
    console.log('🔄 Falling back to original polling mode...');
    import('./reminderService').then(({ reminderService }) => {
      reminderService.setClient(this.client!);
      reminderService.start();
    }).catch((error) => {
      console.error('❌ Failed to fallback to polling:', error);
    });
  }
}

export const realtimeReminderService = new RealtimeReminderService();