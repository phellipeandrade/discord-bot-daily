import { Client } from 'discord.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Reminder } from '@/supabase';

/**
 * Optimized Reminder Service using database triggers and functions
 * This uses the get_due_reminders() function created by supabase-triggers.sql
 */
class OptimizedReminderService {
  private client: Client | null = null;
  private supabaseClient: SupabaseClient | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL_MS = 120000; // 2 minutes (even less frequent)

  constructor() {
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
      console.warn('Supabase client not initialized');
      return;
    }

    try {
      // Start polling with optimized function
      this.startPolling();
      
      // Check for existing pending reminders on startup
      await this.checkPendingReminders();
      
      console.log('🔔 Optimized reminder service started (using database functions)');
    } catch (error) {
      console.error('❌ Failed to start optimized service:', error);
    }
  }

  async stop(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log('🔔 Optimized reminder service stopped');
  }

  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Even less frequent polling using optimized database function
    this.pollingInterval = setInterval(() => {
      this.checkPendingReminders().catch(console.error);
    }, this.POLLING_INTERVAL_MS);
  }

  private async checkPendingReminders(): Promise<void> {
    if (!this.client || !this.supabaseClient) return;

    try {
      // Use the optimized database function
      const { data, error } = await this.supabaseClient
        .rpc('get_due_reminders');

      if (error) {
        console.error('Error fetching due reminders:', error);
        return;
      }

      const pendingReminders = data.map((row: Record<string, unknown>) => ({
        id: row.id as number,
        userId: row.user_id as string,
        userName: row.user_name as string,
        message: row.message as string,
        scheduledFor: row.scheduled_for as string,
        createdAt: '', // Not returned by function
        sent: false,
        sentAt: undefined
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
}

export const optimizedReminderService = new OptimizedReminderService();
