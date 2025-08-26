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

interface UserRow {
  id: string;
  name: string;
  inRemaining: number;
  lastSelected: number;
}

interface SkipRow {
  userId: string;
  skipUntil: string;
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
      
      // Criar tabela de lembretes se não existir
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

      // Criar tabela de usuários se não existir
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          inRemaining INTEGER DEFAULT 1,
          lastSelected INTEGER DEFAULT 0
        )
      `);

      // Criar tabela de skips se não existir
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS skips (
          userId TEXT PRIMARY KEY,
          skipUntil TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);

      // Criar tabela de configurações se não existir
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
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

  // ===== REMINDERS =====

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

  // ===== USERS =====

  async loadUsers(): Promise<UserData> {
    const db = this.getDatabase();
    
    // Carregar todos os usuários
    const allUsersStmt = db.prepare('SELECT id, name FROM users ORDER BY name');
    const allUsers = allUsersStmt.all() as UserRow[];
    
    // Carregar usuários restantes
    const remainingUsersStmt = db.prepare('SELECT id, name FROM users WHERE inRemaining = 1 ORDER BY name');
    const remainingUsers = remainingUsersStmt.all() as UserRow[];
    
    // Carregar último usuário selecionado
    const lastSelectedStmt = db.prepare('SELECT id, name FROM users WHERE lastSelected = 1 LIMIT 1');
    const lastSelected = lastSelectedStmt.get() as UserRow | undefined;
    
    // Carregar configurações
    const configStmt = db.prepare('SELECT key, value FROM config WHERE key IN (?, ?)');
    const configRows = configStmt.all('lastSelectionDate', 'skips') as { key: string; value: string }[];
    
    const config: Record<string, string> = {};
    configRows.forEach(row => {
      config[row.key] = row.value;
    });
    
    // Carregar skips
    const skipsStmt = db.prepare('SELECT userId, skipUntil FROM skips');
    const skipsRows = skipsStmt.all() as SkipRow[];
    const skips: Record<string, string> = {};
    skipsRows.forEach(row => {
      skips[row.userId] = row.skipUntil;
    });
    
    return {
      all: allUsers.map(u => ({ id: u.id, name: u.name })),
      remaining: remainingUsers.map(u => ({ id: u.id, name: u.name })),
      lastSelected: lastSelected ? { id: lastSelected.id, name: lastSelected.name } : undefined,
      lastSelectionDate: config.lastSelectionDate,
      skips
    };
  }

  async saveUsers(data: UserData): Promise<void> {
    const db = this.getDatabase();
    
    // Iniciar transação
    const transaction = db.transaction(() => {
      // Limpar tabelas
      db.prepare('DELETE FROM users').run();
      db.prepare('DELETE FROM skips').run();
      db.prepare('DELETE FROM config WHERE key IN (?, ?)').run('lastSelectionDate', 'skips');
      
      // Inserir usuários
      const insertUserStmt = db.prepare(`
        INSERT INTO users (id, name, inRemaining, lastSelected)
        VALUES (?, ?, ?, ?)
      `);
      
      data.all.forEach(user => {
        const inRemaining = data.remaining.some(r => r.id === user.id) ? 1 : 0;
        const lastSelected = data.lastSelected?.id === user.id ? 1 : 0;
        insertUserStmt.run(user.id, user.name, inRemaining, lastSelected);
      });
      
      // Inserir skips
      if (data.skips) {
        const insertSkipStmt = db.prepare('INSERT INTO skips (userId, skipUntil) VALUES (?, ?)');
        Object.entries(data.skips).forEach(([userId, skipUntil]) => {
          insertSkipStmt.run(userId, skipUntil);
        });
      }
      
      // Inserir configurações
      if (data.lastSelectionDate) {
        db.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run('lastSelectionDate', data.lastSelectionDate);
      }
    });
    
    transaction();
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
