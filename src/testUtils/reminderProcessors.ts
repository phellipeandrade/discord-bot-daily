import { chatResponse } from '../chat';
import { reminderService } from '../reminderService';
import { i18n } from '../i18n';
import { ChatResult } from '../intentHandlers/types';
import { TestContext } from './reminderTestUtils';

export async function processListReminders(result: ChatResult, userId: string): Promise<string> {
  try {
    let reminders;
    
    // Se há filtros na listagem, usar o método com filtros
    if (result.intent?.listReminders && (
      result.intent.listReminders.date || 
      result.intent.listReminders.message || 
      result.intent.listReminders.description
    )) {
      reminders = await reminderService.getRemindersByUserWithFilters(userId, {
        date: result.intent.listReminders.date,
        message: result.intent.listReminders.message,
        description: result.intent.listReminders.description
      });
    } else {
      // Listagem sem filtros
      reminders = await reminderService.getRemindersByUser(userId);
    }
    
    const formattedList = reminderService.formatReminderList(reminders);
    return `${result.reply || i18n.t('reminder.list.title')}\n\n${formattedList}`;
  } catch (error) {
    console.error('Error listing reminders:', error);
    return i18n.t('reminder.error');
  }
}

export async function processDeleteReminder(result: ChatResult, userId: string): Promise<string> {
  try {
    let success = false;
    let replyMessage = '';
    
    // Se tem IDs específicos, deletar por IDs
    if (result.intent?.deleteReminders?.ids && result.intent.deleteReminders.ids.length > 0) {
      let deletedCount = 0;
      for (const id of result.intent.deleteReminders.ids) {
        const deleteSuccess = await reminderService.deleteReminder(id, userId);
        if (deleteSuccess) deletedCount++;
      }
      success = deletedCount > 0;
      replyMessage = success ? 
        (result.reply || i18n.t('reminder.delete.success')) : 
        i18n.t('reminder.delete.notFound');
    } else {
      // Deletar por critérios (data, mensagem, descrição)
      const deleteResult = await reminderService.findAndDeleteReminders(userId, {
        message: result.intent?.deleteReminders?.message,
        date: result.intent?.deleteReminders?.date,
        description: result.intent?.deleteReminders?.description,
        count: result.intent?.deleteReminders?.count
      });
      
      replyMessage = deleteResult.message;
    }
    
    return replyMessage;
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return i18n.t('reminder.delete.error');
  }
}

export async function processDeleteAllReminders(result: ChatResult, userId: string): Promise<string> {
  try {
    const deletedCount = await reminderService.deleteAllRemindersByUser(userId);
    
    if (deletedCount > 0) {
      return result.reply || i18n.t('reminder.deleteAll.success', { count: deletedCount });
    } else {
      return i18n.t('reminder.deleteAll.noReminders');
    }
  } catch (error) {
    console.error('Error deleting all reminders:', error);
    return i18n.t('reminder.deleteAll.error');
  }
}

export async function processSetReminder(
  result: ChatResult,
  userId: string,
  userName: string,
  originalMessage: string
): Promise<string> {
  const dateStr = result.intent!.setReminder!.date;
  
  console.log(`🔍 Processing reminder request:`, {
    originalMessage,
    dateStr,
    userId,
    userName
  });

  const date = new Date(dateStr);
  const now = Date.now();
  const minDelay = 60 * 1000; // 60 segundos de buffer (1 minuto)
  
  console.log(`📅 Date validation:`, {
    dateStr,
    parsedDate: date.toISOString(),
    now: new Date(now).toISOString(),
    timeDiff: date.getTime() - now,
    isValid: !isNaN(date.getTime()) && date.getTime() > now + minDelay
  });
  
  if (isNaN(date.getTime()) || date.getTime() <= now + minDelay) {
    return i18n.t('reminder.invalidTime');
  }

  try {
    const reminderMessage = result.intent!.setReminder!.message || originalMessage;
    await reminderService.addReminder(userId, userName, reminderMessage, dateStr);
    
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
    
    return result.reply || i18n.t('reminder.set', { date: dateTimeStr });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return i18n.t('reminder.error');
  }
}

export async function processReminderIntent(
  result: ChatResult,
  userId: string,
  userName: string,
  originalMessage: string
): Promise<string> {
  // Processar intenção de listar lembretes
  if (result.intent?.listReminders) {
    return await processListReminders(result, userId);
  }

  // Processar intenção de deletar lembretes
  if (result.intent?.deleteReminders) {
    return await processDeleteReminder(result, userId);
  }

  // Processar intenção de deletar todos os lembretes
  if (result.intent?.deleteAllReminders) {
    return await processDeleteAllReminders(result, userId);
  }

  // Processar intenção de criar lembrete
  if (result.intent?.setReminder?.date) {
    return await processSetReminder(result, userId, userName, originalMessage);
  }

  return result.reply || i18n.t('reminder.defaultReply');
}

export async function testChatResponse(
  message: string, 
  context: TestContext
): Promise<{ result: ChatResult | null; finalReply: string }> {
  const result = await chatResponse(message, context.userId, context.userName);
  
  if (!result) {
    return { result: null, finalReply: 'No result from AI.' };
  }

  const finalReply = await processReminderIntent(result, context.userId, context.userName, message);
  
  return { result, finalReply };
}
