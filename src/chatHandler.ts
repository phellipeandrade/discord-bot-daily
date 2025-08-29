import { Client, Message } from 'discord.js';
import { i18n } from '@/i18n';
import { chatResponse } from '@/chat';
import { reminderService } from '@/reminderService';
import { interpretNaturalCommand, executeNaturalCommand } from '@/naturalLanguage';

export async function handleChatMessage(message: Message): Promise<void> {
  // Extrair informações do usuário
  const userId = message.author.id;
  const userName = message.author.displayName || message.author.username;
  
  // Primeiro, tentar interpretar como comando em linguagem natural
  const naturalCommand = await interpretNaturalCommand(message.content, userId, userName);
  
  if (naturalCommand && naturalCommand.confidence > 0.7) {
    console.log(`🤖 Natural command detected:`, {
      command: naturalCommand.command,
      confidence: naturalCommand.confidence,
      explanation: naturalCommand.explanation,
      parameters: naturalCommand.parameters
    });
    
    try {
      const response = await executeNaturalCommand(naturalCommand, message);
      await message.reply(response);
    } catch (error) {
      console.error('Error executing natural command:', error);
      try {
        await message.reply(i18n.t('errors.executionError'));
      } catch {
        /* ignore */
      }
    }
    return;
  }
  
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

  // Processar intenção de listar lembretes
  if (result.intent?.listReminders) {
    try {
      const reminders = await reminderService.getRemindersByUser(userId);
      const formattedList = reminderService.formatReminderList(reminders);
      
      await message.reply(
        `${result.reply || i18n.t('reminder.list.title')}\n\n${formattedList}`
      );
    } catch (error) {
      console.error('Error listing reminders:', error);
      try {
        await message.reply(i18n.t('reminder.error'));
      } catch {
        /* ignore */
      }
    }
    return;
  }

  // Processar intenção de deletar lembrete
  if (result.intent?.deleteReminder?.id) {
    try {
      const reminderId = result.intent.deleteReminder.id;
      const success = await reminderService.deleteReminder(reminderId, userId);
      
      if (success) {
        await message.reply(
          result.reply || i18n.t('reminder.delete.success')
        );
      } else {
        await message.reply(i18n.t('reminder.delete.notFound'));
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
      try {
        await message.reply(i18n.t('reminder.delete.error'));
      } catch {
        /* ignore */
      }
    }
    return;
  }

  // Processar intenção de deletar todos os lembretes
  if (result.intent?.deleteAllReminders) {
    try {
      const deletedCount = await reminderService.deleteAllRemindersByUser(userId);
      
      if (deletedCount > 0) {
        await message.reply(
          result.reply || i18n.t('reminder.deleteAll.success', { count: deletedCount })
        );
      } else {
        await message.reply(i18n.t('reminder.deleteAll.noReminders'));
      }
    } catch (error) {
      console.error('Error deleting all reminders:', error);
      try {
        await message.reply(i18n.t('reminder.deleteAll.error'));
      } catch {
        /* ignore */
      }
    }
    return;
  }

  // Processar intenção de criar lembrete
  const dateStr = result.intent?.setReminder?.date;
  if (!dateStr) {
    try {
      await message.reply(result.reply || i18n.t('reminder.defaultReply'));
    } catch {
      /* ignore */
    }
    return;
  }

  console.log(`🔍 Processing reminder request:`, {
    originalMessage: message.content,
    dateStr,
    userId,
    userName
  });

  const date = new Date(dateStr);
  const now = Date.now();
  const minDelay = 10 * 1000; // 10 segundos de buffer
  
  console.log(`📅 Date validation:`, {
    dateStr,
    parsedDate: date.toISOString(),
    now: new Date(now).toISOString(),
    timeDiff: date.getTime() - now,
    isValid: !isNaN(date.getTime()) && date.getTime() > now - minDelay
  });
  
  if (isNaN(date.getTime()) || date.getTime() <= now - minDelay) {
    try {
      await message.reply(i18n.t('reminder.invalidTime'));
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    const reminderMessage = result.intent?.setReminder?.message || message.content;
    await reminderService.addReminder(
      userId,
      userName,
      reminderMessage,
      dateStr
    );
    
    // Formatar data no padrão brasileiro dd/mm/aaaa
    const formattedDate = date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const formattedTime = date.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const dateTimeStr = `${formattedDate} às ${formattedTime}`;
    
    await message.reply(
      result.reply || i18n.t('reminder.set', { 
        date: dateTimeStr
      })
    );
  } catch (error) {
    console.error('Error creating reminder:', error);
    try {
      await message.reply(i18n.t('reminder.error'));
    } catch {
      /* ignore */
    }
  }
}

export function setupChatListener(client: Client): void {
  client.on('messageCreate', (msg) => {
    if (msg.guildId || msg.author.bot) return;
    void handleChatMessage(msg);
  });
}
