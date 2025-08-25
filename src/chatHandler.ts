import { Client, Message } from 'discord.js';
import { i18n } from '@/i18n';
import { chatResponse } from '@/chat';

export async function handleChatMessage(message: Message): Promise<void> {
  // Extrair informações do usuário
  const userId = message.author.id;
  const userName = message.author.displayName || message.author.username;
  
  // Buscar histórico de mensagens do canal DM
  let messageHistory: Message[] = [];
  try {
    if (message.channel.type === 1) { // 1 = DMChannel
      // Buscar as últimas 10 mensagens do canal DM
      const messages = await message.channel.messages.fetch({ limit: 10 });
      messageHistory = Array.from(messages.values()).reverse(); // Ordenar do mais antigo para o mais recente
    }
  } catch (error) {
    console.error('Error fetching message history:', error);
    // Continuar sem histórico se houver erro
  }
  
  const result = await chatResponse(message.content, userId, userName, messageHistory);
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

export function setupChatListener(client: Client): void {
  client.on('messageCreate', (msg) => {
    if (msg.guildId || msg.author.bot) return;
    void handleChatMessage(msg);
  });
}
