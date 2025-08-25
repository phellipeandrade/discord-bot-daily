import * as fs from 'fs';
import * as path from 'path';

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

class ReminderDatabase {
  private dbPath: string;
  private reminders: Reminder[] = [];
  private nextId: number = 1;

  constructor() {
    this.dbPath = path.join(__dirname, 'reminders.json');
    this.loadData();
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(data);
        this.reminders = parsed.reminders || [];
        this.nextId = parsed.nextId || 1;
      }
    } catch (error) {
      console.error('Error loading reminders data:', error);
      this.reminders = [];
      this.nextId = 1;
    }
  }

  private saveData(): void {
    try {
      const data = {
        reminders: this.reminders,
        nextId: this.nextId
      };
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving reminders data:', error);
    }
  }

  async addReminder(
    userId: string,
    userName: string,
    message: string,
    scheduledFor: string
  ): Promise<number> {
    const reminder: Reminder = {
      id: this.nextId++,
      userId,
      userName,
      message,
      scheduledFor,
      createdAt: new Date().toISOString(),
      sent: false
    };

    this.reminders.push(reminder);
    this.saveData();
    
    console.log(`📝 Reminder ${reminder.id} scheduled for ${scheduledFor}`);
    return reminder.id;
  }

  async getPendingReminders(): Promise<Reminder[]> {
    const now = new Date().toISOString();
    return this.reminders.filter(
      reminder => !reminder.sent && reminder.scheduledFor <= now
    ).sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  }

  async getRemindersByUser(userId: string): Promise<Reminder[]> {
    return this.reminders
      .filter(reminder => reminder.userId === userId)
      .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime());
  }

  async markReminderAsSent(id: number): Promise<void> {
    const reminder = this.reminders.find(r => r.id === id);
    if (reminder) {
      reminder.sent = true;
      reminder.sentAt = new Date().toISOString();
      this.saveData();
    }
  }

  async deleteReminder(id: number): Promise<void> {
    this.reminders = this.reminders.filter(r => r.id !== id);
    this.saveData();
  }

  async deleteOldReminders(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();

    this.reminders = this.reminders.filter(
      reminder => !(reminder.sent && reminder.sentAt && reminder.sentAt < cutoffISO)
    );
    this.saveData();
  }

  async getReminderStats(): Promise<{ total: number; pending: number; sent: number }> {
    const total = this.reminders.length;
    const sent = this.reminders.filter(r => r.sent).length;
    const pending = total - sent;

    return { total, pending, sent };
  }

  close(): void {
    // Não é necessário fechar para JSON
  }
}

// Singleton instance
export const database = new ReminderDatabase();
