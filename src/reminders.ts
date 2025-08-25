import { Client, Message } from 'discord.js';
import { i18n } from '@/i18n';
import { chatResponse } from '@/chat';

export async function handleReminderMessage(message: Message): Promise<void> {
  const result = await chatResponse(message.content);
  if (!result) {
    try {
      await message.reply(i18n.t('reminder.parseError'));
    } catch {
      /* ignore */
    }
    return;
  }

  const dateStr = result.intent?.setReminder?.date;
  if (!dateStr) {
    try {
      await message.reply(result.reply || i18n.t('reminder.defaultReply'));
    } catch {
      /* ignore */
    }
    return;
  }

  const date = new Date(dateStr);
  const delay = date.getTime() - Date.now();
  if (isNaN(date.getTime()) || delay <= 0) {
    try {
      await message.reply(i18n.t('reminder.invalidTime'));
    } catch {
      /* ignore */
    }
    return;
  }
  setTimeout(() => {
    Promise.resolve(
      message.author.send(i18n.t('reminder.notify', { text: message.content }))
    ).catch(() => {
      /* ignore */
    });
  }, delay);
  try {
    await message.reply(
      result.reply || i18n.t('reminder.set', { date: date.toISOString() })
    );
  } catch {
    /* ignore */
  }
}

export function setupReminderListener(client: Client): void {
  client.on('messageCreate', (msg) => {
    if (msg.guildId || msg.author.bot) return;
    void handleReminderMessage(msg);
  });
}
