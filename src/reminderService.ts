import { Client } from 'discord.js';
import { i18n } from '@/i18n';
import { database, Reminder } from '@/database';

class ReminderService {
  private client: Client | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30000; // 30 segundos

  setClient(client: Client): void {
    this.client = client;
  }

  start(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Verificar lembretes pendentes a cada 30 segundos
    this.checkInterval = setInterval(() => {
      this.checkPendingReminders().catch(console.error);
    }, this.CHECK_INTERVAL_MS);

    // Verificar imediatamente ao iniciar
    this.checkPendingReminders().catch(console.error);

    console.log('🔔 Reminder service started');
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('🔔 Reminder service stopped');
  }

  async addReminder(
    userId: string,
    userName: string,
    message: string,
    scheduledFor: string
  ): Promise<number> {
    try {
      const reminderId = await database.addReminder(userId, userName, message, scheduledFor);
      console.log(`📝 Reminder ${reminderId} scheduled for ${scheduledFor}`);
      return reminderId;
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw error;
    }
  }

  async getRemindersByUser(userId: string): Promise<Reminder[]> {
    try {
      return await database.getRemindersByUser(userId);
    } catch (error) {
      console.error('Error getting user reminders:', error);
      return [];
    }
  }

  async deleteReminder(reminderId: number, userId?: string): Promise<boolean> {
    try {
      // Se userId foi fornecido, verificar se o lembrete pertence ao usuário
      if (userId) {
        const reminders = await database.getRemindersByUser(userId);
        const reminder = reminders.find(r => r.id === reminderId);
        if (!reminder) {
          console.log(`❌ Reminder ${reminderId} not found for user ${userId}`);
          return false;
        }
      }
      
      await database.deleteReminder(reminderId);
      console.log(`🗑️ Reminder ${reminderId} deleted`);
      return true;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      return false;
    }
  }

  async getStats(): Promise<{ total: number; pending: number; sent: number }> {
    try {
      return await database.getReminderStats();
    } catch (error) {
      console.error('Error getting reminder stats:', error);
      return { total: 0, pending: 0, sent: 0 };
    }
  }

  private async checkPendingReminders(): Promise<void> {
    if (!this.client) {
      console.warn('Client not set for reminder service');
      return;
    }

    try {
      const pendingReminders = await database.getPendingReminders();
      
      for (const reminder of pendingReminders) {
        await this.sendReminder(reminder);
      }
    } catch (error) {
      console.error('Error checking pending reminders:', error);
    }
  }

  private async sendReminder(reminder: Reminder): Promise<void> {
    if (!this.client) return;

    try {
      const user = await this.client.users.fetch(reminder.userId);
      if (user) {
        await user.send(i18n.t('reminder.notify', { text: reminder.message }));
        await database.markReminderAsSent(reminder.id);
        console.log(`✅ Reminder ${reminder.id} sent to ${reminder.userName}`);
      } else {
        console.warn(`User ${reminder.userId} not found for reminder ${reminder.id}`);
        // Marcar como enviado mesmo que o usuário não seja encontrado para evitar loops
        await database.markReminderAsSent(reminder.id);
      }
    } catch (error) {
      console.error(`Error sending reminder ${reminder.id}:`, error);
      // Em caso de erro, não marcar como enviado para tentar novamente
    }
  }

  async cleanupOldReminders(daysOld: number = 30): Promise<void> {
    try {
      await database.deleteOldReminders(daysOld);
      console.log(`🧹 Cleaned up reminders older than ${daysOld} days`);
    } catch (error) {
      console.error('Error cleaning up old reminders:', error);
    }
  }

  formatReminderList(reminders: Reminder[]): string {
    if (reminders.length === 0) {
      return i18n.t('reminder.list.noReminders');
    }

    const now = new Date();
    return reminders.map(reminder => {
      const scheduledDate = new Date(reminder.scheduledFor);
      const isPast = scheduledDate < now;
      const status = reminder.sent ? '✅' : isPast ? '⏰' : '⏳';
      const dateStr = scheduledDate.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `${status} **ID: ${reminder.id}** - ${dateStr}\n   📝 ${reminder.message}`;
    }).join('\n\n');
  }
}

// Singleton instance
export const reminderService = new ReminderService();
