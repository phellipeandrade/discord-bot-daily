import { config } from 'dotenv';
import { resolve } from 'path';

// Carregar variáveis de ambiente do arquivo .env
config({ path: resolve(__dirname, '../.env') });

import { chatResponse } from './chat';
import { reminderService } from './reminderService';
import { i18n } from './i18n';
import { ChatResult } from './intentHandlers/types';

async function processListReminders(result: ChatResult, userId: string): Promise<string> {
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

async function processDeleteReminder(result: ChatResult, userId: string): Promise<string> {
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

async function processDeleteAllReminders(result: ChatResult, userId: string): Promise<string> {
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

async function processSetReminder(
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
  const minDelay = 10 * 1000; // 10 segundos de buffer
  
  console.log(`📅 Date validation:`, {
    dateStr,
    parsedDate: date.toISOString(),
    now: new Date(now).toISOString(),
    timeDiff: date.getTime() - now,
    isValid: !isNaN(date.getTime()) && date.getTime() > now - minDelay
  });
  
  if (isNaN(date.getTime()) || date.getTime() <= now - minDelay) {
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

async function processReminderIntent(
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

async function clearExistingReminders(userId: string): Promise<void> {
  try {
    const existingReminders = await reminderService.getRemindersByUser(userId);
    console.log('Lembretes existentes:', existingReminders?.length || 0);
    
    if (existingReminders && existingReminders.length > 0) {
      for (const reminder of existingReminders) {
        await reminderService.deleteReminder(reminder.id, userId);
        console.log(`Removido lembrete: ${reminder.id}`);
      }
    }
  } catch (error) {
    console.error('Erro ao limpar lembretes:', error);
  }
}

async function testCreateReminder(userId: string, userName: string): Promise<void> {
  console.log('\n✅ --- Teste 1: Criar Lembrete ---');
  const createMessage = 'Me lembre de conversar com o Serginho daqui a 1 minuto';
  console.log('Mensagem:', createMessage);
  
  const createResult = await chatResponse(createMessage, userId, userName);
  console.log('Resposta da IA:', createResult?.reply);
  
  if (createResult?.intent?.setReminder) {
    console.log('✅ Intent de criação detectado:', createResult.intent.setReminder);
    
    const finalReply = await processReminderIntent(createResult, userId, userName, createMessage);
    console.log('Resposta final:', finalReply);
    
    // Verificar se foi salvo no banco
    const remindersAfterCreate = await reminderService.getRemindersByUser(userId);
    const createdReminder = remindersAfterCreate?.find(r => 
      r.message === createResult.intent!.setReminder!.message
    );
    
    if (createdReminder) {
      console.log('✅ Lembrete salvo no banco:', {
        id: createdReminder.id,
        message: createdReminder.message,
        date: createdReminder.scheduledFor
      });
    } else {
      console.log('❌ Lembrete NÃO foi salvo no banco');
    }
  } else {
    console.log('❌ Intent de criação NÃO detectado');
  }
}

async function testListReminders(userId: string, userName: string): Promise<void> {
  console.log('\n📋 --- Teste 2: Listar Lembretes ---');
  const listMessage = 'Quais são meus lembretes?';
  console.log('Mensagem:', listMessage);
  
  const listResult = await chatResponse(listMessage, userId, userName);
  console.log('Resposta da IA:', listResult?.reply);
  
  // Verificar se a IA não está gerando lembretes fictícios na resposta
  const replyContainsFakeReminders = listResult?.reply?.includes('⏳') || 
                                    listResult?.reply?.includes('📝') ||
                                    listResult?.reply?.includes('ID:') ||
                                    listResult?.reply?.includes('às 10:00') ||
                                    listResult?.reply?.includes('às 22:02') ||
                                    listResult?.reply?.includes('às 09:00');
  
  if (replyContainsFakeReminders) {
    console.log('❌ PROBLEMA: IA está gerando lembretes fictícios na resposta!');
    console.log('Resposta problemática:', listResult?.reply);
  } else {
    console.log('✅ IA não está gerando lembretes fictícios na resposta');
  }
  
  if (listResult?.intent?.listReminders) {
    console.log('✅ Intent de listagem detectado');
    const finalReply = await processReminderIntent(listResult, userId, userName, listMessage);
    console.log('Resposta final:', finalReply);
  } else {
    console.log('❌ Intent de listagem NÃO detectado');
  }
}

/**
 * Testa a listagem filtrada de lembretes
 */
async function testFilteredListReminders(userId: string, userName: string): Promise<void> {
  console.log('\n🔍 --- Teste 2.5: Listagem Filtrada de Lembretes ---');
  
  // Criar lembretes específicos para teste de filtros
  const testReminders = [
    {
      message: 'Reunião de hoje às 14h',
      scheduledFor: new Date().toISOString() // Hoje
    },
    {
      message: 'Email para cliente amanhã',
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Amanhã
    },
    {
      message: 'Revisar código daqui a 2 dias',
      scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // Em 2 dias
    }
  ];
  
  // Criar os lembretes de teste
  console.log('📝 Criando lembretes para teste de filtros...');
  for (const reminder of testReminders) {
    await reminderService.addReminder(userId, userName, reminder.message, reminder.scheduledFor);
    console.log(`  ✅ Criado: "${reminder.message}"`);
  }
  
  // Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Teste 1: Listar lembretes de hoje
  console.log('\n--- Teste 1: Lembretes de Hoje ---');
  const todayMessage = 'quais são meus lembretes de hoje?';
  console.log('Mensagem:', todayMessage);
  
  const todayResult = await chatResponse(todayMessage, userId, userName);
  if (todayResult?.intent?.listReminders) {
    console.log('✅ Intent de listagem filtrada por data detectado:', todayResult.intent.listReminders);
    const finalReply = await processReminderIntent(todayResult, userId, userName, todayMessage);
    console.log('Resposta final:', finalReply);
  } else {
    console.log('❌ Intent de listagem filtrada por data NÃO detectado');
  }
  
  // Teste 2: Listar lembretes sobre reunião
  console.log('\n--- Teste 2: Lembretes sobre Reunião ---');
  const meetingMessage = 'lembretes sobre reunião';
  console.log('Mensagem:', meetingMessage);
  
  const meetingResult = await chatResponse(meetingMessage, userId, userName);
  if (meetingResult?.intent?.listReminders) {
    console.log('✅ Intent de listagem filtrada por descrição detectado:', meetingResult.intent.listReminders);
    const finalReply = await processReminderIntent(meetingResult, userId, userName, meetingMessage);
    console.log('Resposta final:', finalReply);
  } else {
    console.log('❌ Intent de listagem filtrada por descrição NÃO detectado');
  }
  
  // Teste 3: Listar lembretes de email
  console.log('\n--- Teste 3: Lembretes de Email ---');
  const emailMessage = 'lembretes de email';
  console.log('Mensagem:', emailMessage);
  
  const emailResult = await chatResponse(emailMessage, userId, userName);
  if (emailResult?.intent?.listReminders) {
    console.log('✅ Intent de listagem filtrada por email detectado:', emailResult.intent.listReminders);
    const finalReply = await processReminderIntent(emailResult, userId, userName, emailMessage);
    console.log('Resposta final:', finalReply);
  } else {
    console.log('❌ Intent de listagem filtrada por email NÃO detectado');
  }
}

async function testCreateSecondReminder(userId: string, userName: string): Promise<void> {
  console.log('\n✅ --- Teste 3: Criar Segundo Lembrete ---');
  const createMessage2 = 'Me lembre de revisar o PR amanhã às 10h';
  console.log('Mensagem:', createMessage2);
  
  const createResult2 = await chatResponse(createMessage2, userId, userName);
  console.log('Resposta da IA:', createResult2?.reply);
  
  if (createResult2?.intent?.setReminder) {
    console.log('✅ Segundo lembrete criado:', createResult2.intent.setReminder);
    const finalReply = await processReminderIntent(createResult2, userId, userName, createMessage2);
    console.log('Resposta final:', finalReply);
  }
}

async function testListAgain(userId: string, userName: string): Promise<void> {
  console.log('\n📋 --- Teste 4: Listar Novamente ---');
  const listMessage = 'Quais são meus lembretes?';
  const listResult2 = await chatResponse(listMessage, userId, userName);
  if (listResult2?.intent?.listReminders) {
    const finalReply = await processReminderIntent(listResult2, userId, userName, listMessage);
    console.log('Resposta final:', finalReply);
  }
}

async function testDifferentListPhrases(userId: string, userName: string): Promise<void> {
  console.log('\n🔍 --- Teste 4.5: Diferentes Frases para Listar Lembretes ---');
  
  const testPhrases = [
    'Quais são meus lembretes?',
    'Mostra meus lembretes',
    'Listar lembretes',
    'Meus lembretes',
    'Ver lembretes',
    'Lembretes agendados'
  ];
  
  for (const phrase of testPhrases) {
    console.log(`\n--- Testando: "${phrase}" ---`);
    const result = await chatResponse(phrase, userId, userName);
    
    // Verificar se a IA não está gerando lembretes fictícios
    const replyContainsFakeReminders = result?.reply?.includes('⏳') || 
                                      result?.reply?.includes('📝') ||
                                      result?.reply?.includes('ID:') ||
                                      result?.reply?.includes('às 10:00') ||
                                      result?.reply?.includes('às 22:02') ||
                                      result?.reply?.includes('às 09:00');
    
    if (replyContainsFakeReminders) {
      console.log('❌ PROBLEMA: IA gerando lembretes fictícios na resposta!');
      console.log('Resposta problemática:', result?.reply);
    } else {
      console.log('✅ IA não gerou lembretes fictícios');
    }
    
    if (result?.intent?.listReminders) {
      console.log('✅ Intent de listagem detectado corretamente');
    } else {
      console.log('❌ Intent de listagem NÃO detectado');
    }
    
    console.log('Resposta da IA:', result?.reply);
  }
}

async function testDeleteReminder(userId: string, userName: string): Promise<void> {
  console.log('\n🗑️ --- Teste 5: Remover Lembrete ---');
  const remindersBeforeDelete = await reminderService.getRemindersByUser(userId);
  const reminderToDelete = remindersBeforeDelete?.[0];
  
  if (reminderToDelete) {
      const deleteMessage = `Remover lembrete ${reminderToDelete.id}`;
  console.log('Mensagem:', deleteMessage);
  
  const deleteResult = await chatResponse(deleteMessage, userId, userName);
  console.log('Resposta da IA:', deleteResult?.reply);
  
  if (deleteResult?.intent?.deleteReminders) {
    console.log('✅ Intent de remoção detectado:', deleteResult.intent.deleteReminders);
      
      const finalReply = await processReminderIntent(deleteResult, userId, userName, deleteMessage);
      console.log('Resposta final:', finalReply);
      
      // Verificar se foi removido do banco
      const remindersAfterDelete = await reminderService.getRemindersByUser(userId);
      const deletedReminder = remindersAfterDelete?.find(r => r.id === reminderToDelete.id);
      
      if (!deletedReminder) {
        console.log('✅ Lembrete removido do banco');
      } else {
        console.log('❌ Lembrete NÃO foi removido do banco');
      }
    } else {
      console.log('❌ Intent de remoção NÃO detectado');
    }
  } else {
    console.log('⚠️ Nenhum lembrete para remover');
  }
}

async function testDeleteReminderByCriteria(userId: string, userName: string): Promise<void> {
  console.log('\n🔍 --- Teste 5.5: Remover Lembrete por Critérios ---');
  
  // Criar lembretes específicos para teste
  const testReminders = [
    {
      message: 'Falar com o João sobre o projeto',
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 horas
    },
    {
      message: 'Revisar o PR do Pedro',
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 1 dia
    },
    {
      message: 'Enviar email para o cliente',
      scheduledFor: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() // 3 horas
    }
  ];
  
  // Criar os lembretes de teste
  for (const reminder of testReminders) {
    await reminderService.addReminder(userId, userName, reminder.message, reminder.scheduledFor);
    console.log(`📝 Criado lembrete: "${reminder.message}"`);
  }
  
  // Aguardar um pouco para garantir que foram criados
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Teste 1: Deletar por mensagem
  console.log('\n--- Teste 1: Deletar por Mensagem ---');
  const deleteByMessage = 'deletar lembrete sobre falar com o João';
  console.log('Mensagem:', deleteByMessage);
  
  const result1 = await chatResponse(deleteByMessage, userId, userName);
  if (result1?.intent?.deleteReminders) {
    console.log('✅ Intent de remoção por mensagem detectado:', result1.intent.deleteReminders);
    const finalReply = await processReminderIntent(result1, userId, userName, deleteByMessage);
    console.log('Resposta final:', finalReply);
  } else {
    console.log('❌ Intent de remoção por mensagem NÃO detectado');
  }
  
  // Teste 2: Deletar por data (amanhã)
  console.log('\n--- Teste 2: Deletar por Data ---');
  const deleteByDate = 'remova meus lembretes de amanhã';
  console.log('Mensagem:', deleteByDate);
  
  const result2 = await chatResponse(deleteByDate, userId, userName);
  if (result2?.intent?.deleteReminders) {
    console.log('✅ Intent de remoção por data detectado:', result2.intent.deleteReminders);
    const finalReply = await processReminderIntent(result2, userId, userName, deleteByDate);
    console.log('Resposta final:', finalReply);
  } else {
    console.log('❌ Intent de remoção por data NÃO detectado');
  }
  
  // Teste 3: Deletar por descrição
  console.log('\n--- Teste 3: Deletar por Descrição ---');
  const deleteByDescription = 'deletar lembrete do email';
  console.log('Mensagem:', deleteByDescription);
  
  const result3 = await chatResponse(deleteByDescription, userId, userName);
  if (result3?.intent?.deleteReminders) {
    console.log('✅ Intent de remoção por descrição detectado:', result3.intent.deleteReminders);
    const finalReply = await processReminderIntent(result3, userId, userName, deleteByDescription);
    console.log('Resposta final:', finalReply);
  } else {
    console.log('❌ Intent de remoção por descrição NÃO detectado');
  }
  
  // Verificar estado final
  const finalReminders = await reminderService.getRemindersByUser(userId);
  console.log(`\n📊 Lembretes restantes após testes: ${finalReminders.length}`);
  if (finalReminders.length > 0) {
    finalReminders.forEach(r => {
      console.log(`  - ID: ${r.id}, Mensagem: "${r.message}", Data: ${r.scheduledFor}`);
    });
  }
}

/**
 * Testa a nova funcionalidade de deleção múltipla de lembretes
 */
async function testMultipleRemindersDeletion(userId: string, userName: string): Promise<void> {
  console.log('\n🗑️ --- Teste 5.6: Deleção Múltipla de Lembretes (NOVA FUNCIONALIDADE) ---');
  
  // Criar lembretes específicos para teste de deleção múltipla
  const multipleTestReminders = [
    {
      message: 'Daily standup meeting',
      scheduledFor: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() // 1 hora
    },
    {
      message: 'Call with client about project',
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 horas
    },
    {
      message: 'Team sync meeting',
      scheduledFor: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() // 3 horas
    },
    {
      message: 'Review pull request #123',
      scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 horas
    },
    {
      message: 'Send weekly report email',
      scheduledFor: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() // 5 horas
    },
    {
      message: 'Contact support team',
      scheduledFor: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 horas
    }
  ];
  
  // Criar os lembretes de teste
  console.log('📝 Criando lembretes de teste para deleção múltipla...');
  for (const reminder of multipleTestReminders) {
    await reminderService.addReminder(userId, userName, reminder.message, reminder.scheduledFor);
    console.log(`  ✅ Criado: "${reminder.message}"`);
  }
  
  // Aguardar um pouco para garantir que foram criados
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const remindersBeforeDelete = await reminderService.getRemindersByUser(userId);
  console.log(`\n📊 Total de lembretes criados: ${remindersBeforeDelete.length}`);
  
  // Teste 1: Deletar múltiplos lembretes por descrição (reunião)
  console.log('\n--- Teste 1: Deletar Múltiplos por Descrição (reunião) ---');
  const deleteMultipleByDescription = 'deletar todos os lembretes sobre reunião';
  console.log('Mensagem:', deleteMultipleByDescription);
  
  const result1 = await chatResponse(deleteMultipleByDescription, userId, userName);
  if (result1?.intent?.deleteReminders) {
    console.log('✅ Intent de deleção múltipla detectado:', result1.intent.deleteReminders);
    
    // Processar a deleção múltipla
    const deleteResult = await reminderService.findAndDeleteReminders(userId, {
      description: result1.intent.deleteReminders.description
    });
    
    console.log('Resultado da deleção múltipla:', {
      success: deleteResult.success,
      count: deleteResult.count,
      deletedIds: deleteResult.deletedIds,
      deletedMessages: deleteResult.deletedMessages,
      message: deleteResult.message
    });
    
    if (deleteResult.success) {
      console.log(`✅ ${deleteResult.count} lembretes deletados com sucesso!`);
      console.log('IDs deletados:', deleteResult.deletedIds);
      console.log('Mensagens deletadas:', deleteResult.deletedMessages);
    } else {
      console.log('❌ Falha na deleção múltipla:', deleteResult.message);
    }
  } else {
    console.log('❌ Intent de deleção múltipla NÃO detectado');
    console.log('Intent detectado:', result1?.intent);
  }
  
  // Verificar estado após primeiro teste
  const remindersAfterFirstDelete = await reminderService.getRemindersByUser(userId);
  console.log(`\n📊 Lembretes restantes após primeiro teste: ${remindersAfterFirstDelete.length}`);
  
  // Teste 2: Deletar múltiplos lembretes por mensagem (email)
  console.log('\n--- Teste 2: Deletar Múltiplos por Mensagem (email) ---');
  const deleteMultipleByMessage = 'remover lembretes de email';
  console.log('Mensagem:', deleteMultipleByMessage);
  
  const result2 = await chatResponse(deleteMultipleByMessage, userId, userName);
  if (result2?.intent?.deleteReminders) {
    console.log('✅ Intent de deleção múltipla por mensagem detectado:', result2.intent.deleteReminders);
    
    const deleteResult = await reminderService.findAndDeleteReminders(userId, {
      message: result2.intent.deleteReminders.message
    });
    
    console.log('Resultado da deleção múltipla por mensagem:', {
      success: deleteResult.success,
      count: deleteResult.count,
      deletedIds: deleteResult.deletedIds,
      message: deleteResult.message
    });
  } else {
    console.log('❌ Intent de deleção múltipla por mensagem NÃO detectado');
  }
  
  // Teste 3: Deletar múltiplos lembretes com limite de quantidade
  console.log('\n--- Teste 3: Deletar Múltiplos com Limite de Quantidade ---');
  const deleteMultipleWithLimit = 'deletar 2 lembretes antigos';
  console.log('Mensagem:', deleteMultipleWithLimit);
  
  const result3 = await chatResponse(deleteMultipleWithLimit, userId, userName);
  if (result3?.intent?.deleteReminders) {
    console.log('✅ Intent de deleção múltipla com limite detectado:', result3.intent.deleteReminders);
    
    const deleteResult = await reminderService.findAndDeleteReminders(userId, {
      description: result3.intent.deleteReminders.description,
      count: result3.intent.deleteReminders.count
    });
    
    console.log('Resultado da deleção múltipla com limite:', {
      success: deleteResult.success,
      count: deleteResult.count,
      deletedIds: deleteResult.deletedIds,
      message: deleteResult.message
    });
  } else {
    console.log('❌ Intent de deleção múltipla com limite NÃO detectado');
  }
  
  // Teste 4: Deletar múltiplos lembretes por data
  console.log('\n--- Teste 4: Deletar Múltiplos por Data ---');
  const deleteMultipleByDate = 'limpar lembretes de hoje';
  console.log('Mensagem:', deleteMultipleByDate);
  
  const result4 = await chatResponse(deleteMultipleByDate, userId, userName);
  if (result4?.intent?.deleteReminders) {
    console.log('✅ Intent de deleção múltipla por data detectado:', result4.intent.deleteReminders);
    
    const deleteResult = await reminderService.findAndDeleteReminders(userId, {
      date: result4.intent.deleteReminders.date
    });
    
    console.log('Resultado da deleção múltipla por data:', {
      success: deleteResult.success,
      count: deleteResult.count,
      deletedIds: deleteResult.deletedIds,
      message: deleteResult.message
    });
  } else {
    console.log('❌ Intent de deleção múltipla por data NÃO detectado');
  }
  
  // Verificar estado final
  const finalReminders = await reminderService.getRemindersByUser(userId);
  console.log(`\n📊 Lembretes restantes após todos os testes de deleção múltipla: ${finalReminders.length}`);
  if (finalReminders.length > 0) {
    console.log('Detalhes dos lembretes restantes:');
    finalReminders.forEach(r => {
      console.log(`  - ID: ${r.id}, Mensagem: "${r.message}", Data: ${r.scheduledFor}`);
    });
  } else {
    console.log('✅ Todos os lembretes foram deletados com sucesso!');
  }
}

/**
 * Testa o fallback da deleção múltipla quando a IA não está disponível
 */
async function testMultipleRemindersFallback(userId: string, userName: string): Promise<void> {
  console.log('\n🔄 --- Teste 5.7: Fallback da Deleção Múltipla (Sem IA) ---');
  
  // Criar lembretes para teste de fallback
  const fallbackTestReminders = [
    {
      message: 'Teste fallback 1 - reunião',
      scheduledFor: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
    },
    {
      message: 'Teste fallback 2 - reunião',
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    },
    {
      message: 'Teste fallback 3 - email',
      scheduledFor: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  // Criar os lembretes de teste
  console.log('📝 Criando lembretes para teste de fallback...');
  for (const reminder of fallbackTestReminders) {
    await reminderService.addReminder(userId, userName, reminder.message, reminder.scheduledFor);
    console.log(`  ✅ Criado: "${reminder.message}"`);
  }
  
  // Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simular cenário sem IA (salvando a chave original)
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = '';
  
  console.log('\n--- Testando Fallback sem IA ---');
  console.log('GEMINI_API_KEY removida temporariamente');
  
  try {
    // Teste de fallback por descrição
    console.log('\n--- Teste de Fallback por Descrição ---');
    const deleteResult = await reminderService.findAndDeleteReminders(userId, {
      description: 'reunião'
    });
    
    console.log('Resultado do fallback por descrição:', {
      success: deleteResult.success,
      count: deleteResult.count,
      deletedIds: deleteResult.deletedIds,
      deletedMessages: deleteResult.deletedMessages,
      message: deleteResult.message
    });
    
    if (deleteResult.success) {
      console.log(`✅ Fallback funcionou! ${deleteResult.count} lembretes deletados`);
    } else {
      console.log('❌ Fallback falhou:', deleteResult.message);
    }
    
    // Teste de fallback por mensagem
    console.log('\n--- Teste de Fallback por Mensagem ---');
    const deleteResult2 = await reminderService.findAndDeleteReminders(userId, {
      message: 'email'
    });
    
    console.log('Resultado do fallback por mensagem:', {
      success: deleteResult2.success,
      count: deleteResult2.count,
      deletedIds: deleteResult2.deletedIds,
      message: deleteResult2.message
    });
    
  } finally {
    // Restaurar a chave da API
    process.env.GEMINI_API_KEY = originalApiKey;
    console.log('\n✅ GEMINI_API_KEY restaurada');
  }
  
  // Verificar estado final
  const finalReminders = await reminderService.getRemindersByUser(userId);
  console.log(`\n📊 Lembretes restantes após teste de fallback: ${finalReminders.length}`);
}

async function testDeleteAllReminders(userId: string, userName: string): Promise<void> {
  console.log('\n🗑️ --- Teste 6: Remover Todos os Lembretes ---');
  const deleteAllMessage = 'Remover todos os meus lembretes';
  console.log('Mensagem:', deleteAllMessage);
  
  const deleteAllResult = await chatResponse(deleteAllMessage, userId, userName);
  console.log('Resposta da IA:', deleteAllResult?.reply);
  
  if (deleteAllResult?.intent?.deleteAllReminders) {
    console.log('✅ Intent de remoção total detectado');
    
    const finalReply = await processReminderIntent(deleteAllResult, userId, userName, deleteAllMessage);
    console.log('Resposta final:', finalReply);
    
    // Verificar se todos foram removidos
    const finalReminders = await reminderService.getRemindersByUser(userId);
    if (finalReminders?.length === 0) {
      console.log('✅ Todos os lembretes foram removidos');
    } else {
      console.log('❌ Ainda existem lembretes no banco:', finalReminders?.length);
    }
  } else {
    console.log('❌ Intent de remoção total NÃO detectado');
  }
}

async function showFinalSummary(userId: string): Promise<void> {
  console.log('\n📊 --- Resumo Final ---');
  const finalReminders = await reminderService.getRemindersByUser(userId);
  console.log('Lembretes restantes:', finalReminders?.length || 0);
  
  if (finalReminders && finalReminders.length > 0) {
    console.log('Detalhes dos lembretes restantes:');
    finalReminders.forEach(r => {
      console.log(`  - ID: ${r.id}, Mensagem: "${r.message}", Data: ${r.scheduledFor}`);
    });
  }
}

async function testReminderFlow(): Promise<void> {
  const userId = process.env.LOCAL_TEST_USER_ID || 'local-user';
  const userName = process.env.LOCAL_TEST_USER_NAME || 'Local Tester';

  console.log('🧪 === TESTE COMPLETO DE LEMBRETES ===');
  console.log('User:', { userId, userName });
  console.log('GEMINI_API_KEY loaded:', !!process.env.GEMINI_API_KEY);
  console.log('SUPABASE_URL loaded:', !!process.env.SUPABASE_URL);

  // Limpar lembretes existentes para teste limpo
  console.log('\n📋 --- Limpando lembretes existentes ---');
  await clearExistingReminders(userId);

  // Executar testes
  await testCreateReminder(userId, userName);
  await testListReminders(userId, userName);
  await testFilteredListReminders(userId, userName); // NOVO TESTE
  await testCreateSecondReminder(userId, userName);
  await testListAgain(userId, userName);
  await testDifferentListPhrases(userId, userName);
  await testDeleteReminder(userId, userName);
  await testDeleteReminderByCriteria(userId, userName);
  await testMultipleRemindersDeletion(userId, userName); // NOVO TESTE
  await testMultipleRemindersFallback(userId, userName); // NOVO TESTE
  await testDeleteAllReminders(userId, userName);

  // Resumo final
  await showFinalSummary(userId);
  console.log('\n🎉 Teste completo finalizado!');
}

async function main(): Promise<void> {
  const testType = process.argv[2];
  
  if (testType === 'simple') {
    // Teste simples original
    const userId = process.env.LOCAL_TEST_USER_ID || 'local-user';
    const userName = process.env.LOCAL_TEST_USER_NAME || 'Local Tester';
    const contentArg = process.argv.slice(3).join(' ');
    const content = contentArg || 'Me lembre de falar com o Serginho daqui a 1 minuto';

    console.log('--- Local Chat Intent Test ---');
    console.log('User:', { userId, userName });
    console.log('Message:', content);

    const result = await chatResponse(content, userId, userName);
    console.log('AI Result:', JSON.stringify(result, null, 2));

    if (!result) {
      console.log('No result from AI.');
      return;
    }

    const intent = result.intent;
    console.log('\n--- Intent Analysis ---');
    console.log('Has intent:', !!intent);
    if (intent) {
      console.log('Intent keys:', Object.keys(intent));
      if (intent.setReminder) {
        console.log('Set Reminder:', intent.setReminder);
      }
      if (intent.listReminders) {
        console.log('List Reminders:', intent.listReminders);
      }
    }

    console.log('\nReply to user:', result.reply);
  } else {
    // Teste completo por padrão
    await testReminderFlow();
  }
}

main().catch(console.error);


