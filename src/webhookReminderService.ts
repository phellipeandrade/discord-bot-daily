import { Client } from 'discord.js';
import { database, Reminder } from '@/supabase';
import * as http from 'http';

/**
 * Webhook-based Reminder Service
 * Listens for webhook calls from Supabase Edge Functions or external schedulers
 */
class WebhookReminderService {
  private client: Client | null = null;
  private server: http.Server | null = null;
  private readonly PORT = process.env.WEBHOOK_PORT || 3001;

  setClient(client: Client): void {
    this.client = client;
  }

  async start(): Promise<void> {
    if (!this.client) {
      console.warn('Client not set for reminder service');
      return;
    }

    // Start webhook server
    this.server = http.createServer((req, res) => {
      this.handleWebhook(req, res);
    });

    this.server.listen(this.PORT, () => {
      console.log(`🔗 Webhook server listening on port ${this.PORT}`);
    });

    // Check for existing pending reminders
    await this.checkPendingReminders();
    
    console.log('🔔 Webhook reminder service started');
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    console.log('🔔 Webhook reminder service stopped');
  }

  private handleWebhook(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        
        // Verify webhook secret if configured
        if (process.env.WEBHOOK_SECRET && data.secret !== process.env.WEBHOOK_SECRET) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        // Handle different webhook types
        switch (data.type) {
          case 'check_reminders':
            await this.checkPendingReminders();
            break;
          case 'reminder_due':
            await this.handleReminderDue(data.reminder);
            break;
          default:
            console.log('Unknown webhook type:', data.type);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('Webhook error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  }

  private async checkPendingReminders(): Promise<void> {
    try {
      const pendingReminders = await database.getPendingReminders();
      
      for (const reminder of pendingReminders) {
        await this.sendReminder(reminder);
      }
    } catch (error) {
      console.error('Error checking pending reminders:', error);
    }
  }

  private async handleReminderDue(reminder: Reminder): Promise<void> {
    await this.sendReminder(reminder);
  }

  private async sendReminder(reminder: Reminder): Promise<void> {
    if (!this.client) return;

    try {
      const user = await this.client.users.fetch(reminder.userId);
      if (user) {
        await user.send(`🔔 **Lembrete:** ${reminder.message}`);
        
        // Mark as sent in database
        await database.markReminderAsSent(reminder.id, reminder.userId);
        
        console.log(`✅ Reminder sent to ${reminder.userName}: ${reminder.message}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send reminder to ${reminder.userName}:`, error);
    }
  }
}

export const webhookReminderService = new WebhookReminderService();

