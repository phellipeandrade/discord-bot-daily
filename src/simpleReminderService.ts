import { Client } from 'discord.js';
import { i18n } from '@/i18n';
import { database, Reminder } from '@/supabase';

interface PendingReminder {
  reminder: Reminder;
  scheduledTime: number;
  timeoutId: NodeJS.Timeout;
}

/**
 * Simplified Reminder Service
 * - Checks pending reminders only once on startup
 * - Adds new reminders directly to firing queue
 * - No periodic polling
 */
class SimpleReminderService {
  private client: Client | null = null;
  private pendingReminders: Map<number, PendingReminder> = new Map();
  private isInitialized: boolean = false;

  setClient(client: Client): void {
    this.client = client;
  }

  async start(): Promise<void> {
    if (!this.client) {
      console.warn('Client not set for reminder service');
      return;
    }

    if (this.isInitialized) {
      console.log('🔔 Simple reminder service already initialized');
      return;
    }

    console.log('🔔 Starting simple reminder service...');
    
    // Check pending reminders only once on startup
    await this.loadPendingReminders();
    
    this.isInitialized = true;
    console.log('🔔 Simple reminder service started');
  }

  stop(): void {
    // Clear all pending timeouts
    for (const [id, pending] of this.pendingReminders) {
      clearTimeout(pending.timeoutId);
      console.log(`⏰ Cleared timeout for reminder ${id}`);
    }
    this.pendingReminders.clear();
    console.log('🔔 Simple reminder service stopped');
  }

  async addReminder(
    userId: string,
    userName: string,
    message: string,
    scheduledFor: string
  ): Promise<number> {
    try {
      // Add to database
      const reminderId = await database.addReminder(userId, userName, message, scheduledFor);
      
      // Get the created reminder
      const reminders = await database.getRemindersByUser(userId);
      const reminder = reminders.find(r => r.id === reminderId);
      
      if (reminder) {
        // Add directly to firing queue
        this.scheduleReminder(reminder);
        console.log(`📝 Reminder ${reminderId} added to firing queue for ${scheduledFor}`);
      }
      
      return reminderId;
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw error;
    }
  }

  /**
   * Load all pending reminders from database and schedule them
   */
  private async loadPendingReminders(): Promise<void> {
    try {
      const pendingReminders = await database.getPendingReminders();
      console.log(`📋 Found ${pendingReminders.length} pending reminders`);
      
      for (const reminder of pendingReminders) {
        this.scheduleReminder(reminder);
      }
      
      console.log(`⏰ Scheduled ${pendingReminders.length} reminders`);
    } catch (error) {
      console.error('Error loading pending reminders:', error);
    }
  }

  /**
   * Schedule a reminder to be sent at the appropriate time
   */
  private scheduleReminder(reminder: Reminder): void {
    const scheduledTime = new Date(reminder.scheduledFor).getTime();
    const now = Date.now();
    const delay = scheduledTime - now;

    // If the reminder is already due or very close (within 1 second), send immediately
    if (delay <= 1000) {
      console.log(`⚡ Reminder ${reminder.id} is due now, sending immediately`);
      this.sendReminder(reminder);
      return;
    }

    // If the reminder is in the future, schedule it
    if (delay > 0) {
      const timeoutId = setTimeout(() => {
        this.sendReminder(reminder);
        this.pendingReminders.delete(reminder.id);
      }, delay);

      this.pendingReminders.set(reminder.id, {
        reminder,
        scheduledTime,
        timeoutId
      });

      const scheduledDate = new Date(scheduledTime);
      console.log(`⏰ Scheduled reminder ${reminder.id} for ${scheduledDate.toLocaleString('pt-BR')}`);
    } else {
      // Reminder is in the past, delete it
      console.log(`⏰ Reminder ${reminder.id} is in the past, deleting from database`);
      this.deleteReminderFromDatabase(reminder.id, reminder.userId);
    }
  }

  /**
   * Send a reminder to the user and delete it from database
   */
  private async sendReminder(reminder: Reminder): Promise<void> {
    if (!this.client) return;

    try {
      const user = await this.client.users.fetch(reminder.userId);
      if (user) {
        await user.send(i18n.t('reminder.notify', { text: reminder.message }));
        await this.deleteReminderFromDatabase(reminder.id, reminder.userId);
        console.log(`✅ Reminder ${reminder.id} sent to ${reminder.userName} and deleted from database: ${reminder.message}`);
      } else {
        console.warn(`User ${reminder.userId} not found for reminder ${reminder.id}`);
        // Delete from database even if user not found to avoid loops
        await this.deleteReminderFromDatabase(reminder.id, reminder.userId);
      }
    } catch (error) {
      console.error(`Error sending reminder ${reminder.id}:`, error);
      // Don't delete on error, will be retried on next startup
    }
  }

  /**
   * Delete reminder from database
   */
  private async deleteReminderFromDatabase(reminderId: number, _userId: string): Promise<void> {
    try {
      await database.deleteReminder(reminderId);
      console.log(`🗑️ Reminder ${reminderId} deleted from database`);
    } catch (error) {
      console.error(`Error deleting reminder ${reminderId} from database:`, error);
    }
  }

  /**
   * Mark reminder as sent in database (legacy method, now deletes instead)
   */
  private async markAsSent(reminderId: number, userId: string): Promise<void> {
    // For backwards compatibility, now deletes the reminder instead of marking as sent
    await this.deleteReminderFromDatabase(reminderId, userId);
  }

  /**
   * Get reminders by user (for listing)
   */
  async getRemindersByUser(userId: string): Promise<Reminder[]> {
    try {
      return await database.getRemindersByUser(userId);
    } catch (error) {
      console.error('Error getting user reminders:', error);
      return [];
    }
  }

  /**
   * Get reminders by user with filters
   */
  async getRemindersByUserWithFilters(
    userId: string,
    filters?: { message?: string; date?: string; description?: string }
  ): Promise<Reminder[]> {
    try {
      const allReminders = await database.getRemindersByUser(userId);
      
      if (!filters || (!filters.message && !filters.date && !filters.description)) {
        return allReminders;
      }

      // Simple filtering (can be enhanced with AI later if needed)
      let filteredReminders: Reminder[] = [];
      
      if (filters.message) {
        filteredReminders = allReminders.filter(r => 
          r.message.toLowerCase().includes(filters.message!.toLowerCase())
        );
      } else if (filters.date) {
        const targetDate = new Date(filters.date);
        filteredReminders = allReminders.filter(r => {
          const reminderDate = new Date(r.scheduledFor);
          const timeDiff = Math.abs(reminderDate.getTime() - targetDate.getTime());
          return timeDiff < 24 * 60 * 60 * 1000; // Within 24 hours
        });
      } else if (filters.description) {
        filteredReminders = allReminders.filter(r => 
          r.message.toLowerCase().includes(filters.description!.toLowerCase())
        );
      }
      
      return filteredReminders;
    } catch (error) {
      console.error('Error getting user reminders with filters:', error);
      return [];
    }
  }

  /**
   * Delete a specific reminder
   */
  async deleteReminder(reminderId: number, userId: string): Promise<boolean> {
    try {
      // Check if reminder belongs to user
      const reminders = await database.getRemindersByUser(userId);
      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) {
        console.log(`❌ Reminder ${reminderId} not found for user ${userId}`);
        return false;
      }
      
      // Cancel timeout if scheduled
      const pending = this.pendingReminders.get(reminderId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        this.pendingReminders.delete(reminderId);
        console.log(`⏰ Cancelled scheduled reminder ${reminderId}`);
      }
      
      // Delete from database
      await database.deleteReminder(reminderId);
      console.log(`🗑️ Reminder ${reminderId} deleted for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      return false;
    }
  }

  /**
   * Find and delete reminders based on criteria
   */
  async findAndDeleteReminders(
    userId: string, 
    criteria: { message?: string; date?: string; description?: string; count?: number }
  ): Promise<{ 
    success: boolean; 
    deletedIds: number[]; 
    deletedMessages: string[];
    count: number;
    message: string; 
  }> {
    try {
      const reminders = await database.getRemindersByUser(userId);
      
      if (reminders.length === 0) {
        return { 
          success: false, 
          deletedIds: [],
          deletedMessages: [],
          count: 0,
          message: 'Você não possui lembretes para deletar' 
        };
      }

      let targetReminders: Reminder[] = [];
      
      if (criteria.message) {
        targetReminders = reminders.filter(r => 
          r.message.toLowerCase().includes(criteria.message!.toLowerCase())
        );
      } else if (criteria.date) {
        const targetDate = new Date(criteria.date);
        targetReminders = reminders.filter(r => {
          const reminderDate = new Date(r.scheduledFor);
          const timeDiff = Math.abs(reminderDate.getTime() - targetDate.getTime());
          return timeDiff < 24 * 60 * 60 * 1000; // Within 24 hours
        });
      } else if (criteria.description) {
        targetReminders = reminders.filter(r => 
          r.message.toLowerCase().includes(criteria.description!.toLowerCase())
        );
      }
      
      if (targetReminders.length === 0) {
        return { 
          success: false, 
          deletedIds: [],
          deletedMessages: [],
          count: 0,
          message: 'Nenhum lembrete encontrado com os critérios fornecidos' 
        };
      }

      // Delete all found reminders
      const deletedIds: number[] = [];
      const deletedMessages: string[] = [];
      let successCount = 0;

      for (const reminder of targetReminders) {
        const deleteSuccess = await this.deleteReminder(reminder.id, userId);
        if (deleteSuccess) {
          deletedIds.push(reminder.id);
          deletedMessages.push(reminder.message);
          successCount++;
        }
      }
      
      if (successCount > 0) {
        const countText = successCount === 1 ? '1 lembrete' : `${successCount} lembretes`;
        return { 
          success: true, 
          deletedIds,
          deletedMessages,
          count: successCount,
          message: `${countText} deletados com sucesso` 
        };
      } else {
        return { 
          success: false, 
          deletedIds: [],
          deletedMessages: [],
          count: 0,
          message: 'Erro ao deletar os lembretes' 
        };
      }
    } catch (error) {
      console.error('Error finding and deleting reminders:', error);
      return { 
        success: false, 
        deletedIds: [],
        deletedMessages: [],
        count: 0,
        message: 'Erro interno ao processar a solicitação' 
      };
    }
  }

  /**
   * Delete all reminders for a user
   */
  async deleteAllRemindersByUser(userId: string): Promise<number> {
    try {
      // Cancel all scheduled reminders for this user
      for (const [id, pending] of this.pendingReminders) {
        if (pending.reminder.userId === userId) {
          clearTimeout(pending.timeoutId);
          this.pendingReminders.delete(id);
        }
      }
      
      const deletedCount = await database.deleteAllRemindersByUser(userId);
      console.log(`🗑️ Deleted ${deletedCount} reminders for user ${userId}`);
      return deletedCount;
    } catch (error) {
      console.error('Error deleting all reminders for user:', error);
      return 0;
    }
  }

  /**
   * Get reminder statistics
   */
  async getStats(): Promise<{ total: number; pending: number; sent: number }> {
    try {
      return await database.getReminderStats();
    } catch (error) {
      console.error('Error getting reminder stats:', error);
      return { total: 0, pending: 0, sent: 0 };
    }
  }

  /**
   * Format reminder list for display
   */
  formatReminderList(reminders: Reminder[]): string {
    if (reminders.length === 0) {
      return i18n.t('reminder.list.noReminders');
    }

    const now = new Date();
    
    // Deduplicate reminders based on message and date/time
    const uniqueReminders = reminders.reduce((acc, reminder) => {
      const key = `${reminder.message}-${reminder.scheduledFor}`;
      if (!acc.has(key)) {
        acc.set(key, reminder);
      }
      return acc;
    }, new Map<string, Reminder>());

    const uniqueRemindersList = Array.from(uniqueReminders.values());
    
    // Sort reminders by date (closest first)
    uniqueRemindersList.sort((a, b) => {
      const dateA = new Date(a.scheduledFor);
      const dateB = new Date(b.scheduledFor);
      return dateA.getTime() - dateB.getTime();
    });
    
    const formattedReminders = uniqueRemindersList.map((reminder, index) => {
      const scheduledDate = new Date(reminder.scheduledFor);
      
      // Format date in Brazilian format dd/mm/yyyy
      const formattedDate = scheduledDate.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const formattedTime = scheduledDate.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const dateStr = `${formattedDate} às ${formattedTime}`;
      
      // Calculate relative time
      const timeDiff = scheduledDate.getTime() - now.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hoursDiff = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesDiff = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      let relativeTime = '';
      if (daysDiff > 0) {
        relativeTime = ` (em ${daysDiff} dia${daysDiff > 1 ? 's' : ''})`;
      } else if (hoursDiff > 0) {
        relativeTime = ` (em ${hoursDiff} hora${hoursDiff > 1 ? 's' : ''})`;
      } else if (minutesDiff > 0) {
        relativeTime = ` (em ${minutesDiff} minuto${minutesDiff > 1 ? 's' : ''})`;
      } else {
        relativeTime = ' (agora)';
      }

      return `**${index + 1}.** ⏳ **${dateStr}**${relativeTime}\n└ 📝 ${reminder.message}\n└ 🆔 ID: ${reminder.id}`;
    });
    
    return formattedReminders.join('\n\n');
  }

  /**
   * Clean up old reminders
   */
  async cleanupOldReminders(daysOld: number = 30): Promise<void> {
    try {
      await database.deleteOldReminders(daysOld);
      console.log(`🧹 Cleaned up reminders older than ${daysOld} days`);
    } catch (error) {
      console.error('Error cleaning up old reminders:', error);
    }
  }

  /**
   * Get current queue status (for debugging)
   */
  getQueueStatus(): { scheduled: number; nextReminder?: string } {
    const scheduled = this.pendingReminders.size;
    let nextReminder: string | undefined;
    
    if (scheduled > 0) {
      const next = Array.from(this.pendingReminders.values())
        .sort((a, b) => a.scheduledTime - b.scheduledTime)[0];
      nextReminder = new Date(next.scheduledTime).toLocaleString('pt-BR');
    }
    
    return { scheduled, nextReminder };
  }
}

// Singleton instance
export const simpleReminderService = new SimpleReminderService();
