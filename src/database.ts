import Database from 'better-sqlite3';
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

interface ReminderRow {
  id: number;
  userId: string;
  userName: string;
  message: string;
  scheduledFor: string;
  createdAt: string;
  sent: number;
  sentAt?: string;
}

interface StatsRow {
  total: number;
  pending: number;
  sent: number;
}

class ReminderDatabase {
  private dbPath: string;
  private db: Database.Database | null = null;

  constructor() {
    this.dbPath = path.join(__dirname, 'reminders.db');
  }

  private initDatabase(): void {
    if (!this.db) {
      this.db = new Database(this.dbPath);
      
      // Criar tabela se não existir
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          userName TEXT NOT NULL,
          message TEXT NOT NULL,
          scheduledFor TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          sent INTEGER DEFAULT 0,
          sentAt TEXT
        )
      `);
    }
  }

  private getDatabase(): Database.Database {
    if (!this.db) {
      this.initDatabase();
    }
    return this.db!;
  }

  async addReminder(
    userId: string,
    userName: string,
    message: string,
    scheduledFor: string
  ): Promise<number> {
    const db = this.getDatabase();
    const createdAt = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO reminders (userId, userName, message, scheduledFor, createdAt, sent)
      VALUES (?, ?, ?, ?, ?, 0)
    `);
    
    const result = stmt.run(userId, userName, message, scheduledFor, createdAt);
    console.log(`📝 Reminder ${result.lastInsertRowid} scheduled for ${scheduledFor}`);
    return result.lastInsertRowid as number;
  }

  async getPendingReminders(): Promise<Reminder[]> {
    const db = this.getDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      SELECT id, userId, userName, message, scheduledFor, createdAt, sent, sentAt
      FROM reminders
      WHERE sent = 0 AND scheduledFor <= ?
      ORDER BY scheduledFor ASC
    `);
    
    const rows = stmt.all(now) as ReminderRow[];
    
    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      message: row.message,
      scheduledFor: row.scheduledFor,
      createdAt: row.createdAt,
      sent: Boolean(row.sent),
      sentAt: row.sentAt
    }));
  }

  async getRemindersByUser(userId: string): Promise<Reminder[]> {
    const db = this.getDatabase();
    
    const stmt = db.prepare(`
      SELECT id, userId, userName, message, scheduledFor, createdAt, sent, sentAt
      FROM reminders
      WHERE userId = ?
      ORDER BY scheduledFor DESC
    `);
    
    const rows = stmt.all(userId) as ReminderRow[];
    
    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      message: row.message,
      scheduledFor: row.scheduledFor,
      createdAt: row.createdAt,
      sent: Boolean(row.sent),
      sentAt: row.sentAt
    }));
  }

  async markReminderAsSent(id: number): Promise<void> {
    const db = this.getDatabase();
    const sentAt = new Date().toISOString();
    
    const stmt = db.prepare(`
      UPDATE reminders
      SET sent = 1, sentAt = ?
      WHERE id = ?
    `);
    
    stmt.run(sentAt, id);
  }

  async deleteReminder(id: number): Promise<void> {
    const db = this.getDatabase();
    
    const stmt = db.prepare(`
      DELETE FROM reminders
      WHERE id = ?
    `);
    
    stmt.run(id);
  }

  async deleteAllRemindersByUser(userId: string): Promise<number> {
    const db = this.getDatabase();
    
    const stmt = db.prepare(`
      DELETE FROM reminders
      WHERE userId = ?
    `);
    
    const result = stmt.run(userId);
    return result.changes;
  }

  async deleteOldReminders(daysOld: number = 30): Promise<void> {
    const db = this.getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();
    
    const stmt = db.prepare(`
      DELETE FROM reminders
      WHERE sent = 1 AND sentAt < ?
    `);
    
    stmt.run(cutoffISO);
  }

  async getReminderStats(): Promise<{ total: number; pending: number; sent: number }> {
    const db = this.getDatabase();
    
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN sent = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN sent = 1 THEN 1 ELSE 0 END) as sent
      FROM reminders
    `);
    
    const row = stmt.get() as StatsRow;
    
    return {
      total: row.total || 0,
      pending: row.pending || 0,
      sent: row.sent || 0
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
export const database = new ReminderDatabase();
