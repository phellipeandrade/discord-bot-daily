import { Client } from 'discord.js';
import { i18n } from '@/i18n';
import { database, Reminder } from '@/supabase';

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

  async deleteAllRemindersByUser(userId: string): Promise<number> {
    try {
      const deletedCount = await database.deleteAllRemindersByUser(userId);
      console.log(`🗑️ Deleted ${deletedCount} reminders for user ${userId}`);
      return deletedCount;
    } catch (error) {
      console.error('Error deleting all reminders for user:', error);
      return 0;
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
      
      if (!pendingReminders || !Array.isArray(pendingReminders)) {
        console.warn('No pending reminders or invalid response from database');
        return;
      }
      
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
    
    // Deduplicar lembretes baseado na mensagem e data/hora
    const uniqueReminders = reminders.reduce((acc, reminder) => {
      const key = `${reminder.message}-${reminder.scheduledFor}`;
      if (!acc.has(key)) {
        acc.set(key, reminder);
      }
      return acc;
    }, new Map<string, Reminder>());

    const uniqueRemindersList = Array.from(uniqueReminders.values());
    
    // Ordenar lembretes por data (mais próximos primeiro)
    uniqueRemindersList.sort((a, b) => {
      const dateA = new Date(a.scheduledFor);
      const dateB = new Date(b.scheduledFor);
      return dateA.getTime() - dateB.getTime();
    });
    
    const formattedReminders = uniqueRemindersList.map((reminder, index) => {
      const scheduledDate = new Date(reminder.scheduledFor);
      const isPast = scheduledDate < now;
      
      let status: string;
      if (reminder.sent) {
        status = '✅';
      } else if (isPast) {
        status = '⏰';
      } else {
        status = '⏳';
      }
      
      // Formatar data no padrão brasileiro dd/mm/aaaa
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
      
      // Calcular tempo relativo
      const timeDiff = scheduledDate.getTime() - now.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hoursDiff = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesDiff = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      let relativeTime = '';
      if (isPast) {
        relativeTime = ' (passado)';
      } else if (daysDiff > 0) {
        relativeTime = ` (em ${daysDiff} dia${daysDiff > 1 ? 's' : ''})`;
      } else if (hoursDiff > 0) {
        relativeTime = ` (em ${hoursDiff} hora${hoursDiff > 1 ? 's' : ''})`;
      } else if (minutesDiff > 0) {
        relativeTime = ` (em ${minutesDiff} minuto${minutesDiff > 1 ? 's' : ''})`;
      } else {
        relativeTime = ' (agora)';
      }

      return `**${index + 1}.** ${status} **${dateStr}**${relativeTime}\n└ 📝 ${reminder.message}\n└ 🆔 ID: ${reminder.id}`;
    });
    
    return formattedReminders.join('\n\n');
  }
}

// Singleton instance
export const reminderService = new ReminderService();
