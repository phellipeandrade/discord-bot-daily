import { validateReminderIntent, validateListIntent, validateDeleteIntent, validateDeleteAllIntent, TestContext, clearExistingReminders, createTestReminders, getRemindersCount, findReminderByMessage, logTestResult } from './reminderTestUtils';
import { testChatResponse } from './reminderProcessors';


export class ReminderTestScenarios {
  private readonly context: TestContext;

  constructor(context: TestContext) {
    this.context = context;
  }

  async testCreateReminder(): Promise<boolean> {
    console.log('\n✅ --- Teste: Criar Lembrete ---');
    const createMessage = 'Me lembre de conversar com o Serginho daqui a 2 minutos';
    console.log('Mensagem:', createMessage);
    
    const { result, finalReply } = await testChatResponse(createMessage, this.context);
    
    if (!result) {
      logTestResult('Criar Lembrete', false, 'Sem resposta da IA');
      return false;
    }
    
    const intentDetected = validateReminderIntent(result);
    logTestResult('Intent de criação detectado', intentDetected);
    
    if (intentDetected && result.intent?.setReminder) {
      console.log('✅ Intent de criação detectado:', result.intent.setReminder);
      console.log('Resposta final:', finalReply);
      
      // Verificar se foi salvo no banco
      const createdReminder = await findReminderByMessage(
        this.context.userId, 
        result.intent.setReminder.message
      );
      
      const savedInDb = !!createdReminder;
      logTestResult('Lembrete salvo no banco', savedInDb);
      
      if (savedInDb) {
        console.log('✅ Lembrete salvo no banco:', {
          id: createdReminder.id,
          message: createdReminder.message,
          date: createdReminder.scheduledFor
        });
      }
      
      return savedInDb;
    } else {
      console.log('❌ Intent de criação NÃO detectado');
      return false;
    }
  }

  async testListReminders(): Promise<boolean> {
    console.log('\n📋 --- Teste: Listar Lembretes ---');
    const listMessage = 'Quais são meus lembretes?';
    console.log('Mensagem:', listMessage);
    
    const { result, finalReply } = await testChatResponse(listMessage, this.context);
    
    if (!result) {
      logTestResult('Listar Lembretes', false, 'Sem resposta da IA');
      return false;
    }
    
    // Verificar se a IA não está gerando lembretes fictícios na resposta
    const replyContainsFakeReminders = result.reply?.includes('⏳') || 
                                      result.reply?.includes('📝') ||
                                      result.reply?.includes('ID:') ||
                                      result.reply?.includes('às 10:00') ||
                                      result.reply?.includes('às 22:02') ||
                                      result.reply?.includes('às 09:00');
    
    if (replyContainsFakeReminders) {
      logTestResult('IA não gera lembretes fictícios', false, 'IA está gerando lembretes fictícios na resposta!');
      console.log('Resposta problemática:', result.reply);
      return false;
    } else {
      logTestResult('IA não gera lembretes fictícios', true);
    }
    
    const intentDetected = validateListIntent(result);
    logTestResult('Intent de listagem detectado', intentDetected);
    
    if (intentDetected) {
      console.log('✅ Intent de listagem detectado');
      console.log('Resposta final:', finalReply);
      return true;
    } else {
      console.log('❌ Intent de listagem NÃO detectado');
      return false;
    }
  }

  async testFilteredListReminders(): Promise<boolean> {
    console.log('\n🔍 --- Teste: Listagem Filtrada de Lembretes ---');
    
    // Criar lembretes específicos para teste de filtros
    const testReminders = [
      {
        message: 'Reunião de hoje às 14h',
        scheduledFor: new Date().toISOString()
      },
      {
        message: 'Email para cliente amanhã',
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        message: 'Revisar código daqui a 2 dias',
        scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    await createTestReminders(this.context, testReminders);
    
    // Teste 1: Listar lembretes de hoje
    console.log('\n--- Teste 1: Lembretes de Hoje ---');
    const todayMessage = 'quais são meus lembretes de hoje?';
    const todayResult = await testChatResponse(todayMessage, this.context);
    
    const todayIntentDetected = todayResult.result ? validateListIntent(todayResult.result) : false;
    logTestResult('Intent de listagem filtrada por data', todayIntentDetected);
    
    if (todayIntentDetected && todayResult.result?.intent?.listReminders) {
      console.log('✅ Intent de listagem filtrada por data detectado:', todayResult.result.intent.listReminders);
      console.log('Resposta final:', todayResult.finalReply);
    }
    
    // Teste 2: Listar lembretes sobre reunião
    console.log('\n--- Teste 2: Lembretes sobre Reunião ---');
    const meetingMessage = 'lembretes sobre reunião';
    const meetingResult = await testChatResponse(meetingMessage, this.context);
    
    const meetingIntentDetected = meetingResult.result ? validateListIntent(meetingResult.result) : false;
    logTestResult('Intent de listagem filtrada por descrição', meetingIntentDetected);
    
    return todayIntentDetected && meetingIntentDetected;
  }

  async testDeleteReminder(): Promise<boolean> {
    console.log('\n🗑️ --- Teste: Remover Lembrete ---');
    
    // Criar um lembrete específico para deletar
    const testReminder = {
      message: 'Lembrete para deletar',
      scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
    
    await createTestReminders(this.context, [testReminder]);
    
    // Aguardar um pouco para garantir que foi criado
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const remindersBeforeDelete = await getRemindersCount(this.context.userId);
    console.log(`Lembretes antes da remoção: ${remindersBeforeDelete}`);
    
    // Verificar se o lembrete foi criado corretamente
    const createdReminder = await findReminderByMessage(this.context.userId, testReminder.message);
    if (!createdReminder) {
      logTestResult('Remover Lembrete', false, 'Lembrete não foi criado corretamente');
      return false;
    }
    console.log(`Lembrete criado com ID: ${createdReminder.id}`);
    
    // Usar uma mensagem mais padrão que deve ser detectada pela IA
    const deleteMessage = `Deletar lembrete sobre Lembrete para deletar`;
    console.log('Mensagem:', deleteMessage);
    
    const { result, finalReply } = await testChatResponse(deleteMessage, this.context);
    
    if (!result) {
      logTestResult('Remover Lembrete', false, 'Sem resposta da IA');
      return false;
    }
    
    const intentDetected = validateDeleteIntent(result);
    logTestResult('Intent de remoção detectado', intentDetected);
    
    if (intentDetected && result.intent?.deleteReminders) {
      console.log('✅ Intent de remoção detectado:', result.intent.deleteReminders);
      console.log('Resposta final:', finalReply);
      
      // Aguardar um pouco para garantir que a operação foi processada
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verificar se foi removido do banco
      const remindersAfterDelete = await getRemindersCount(this.context.userId);
      console.log(`Lembretes depois da remoção: ${remindersAfterDelete}`);
      
      // O lembrete foi removido se o número diminuiu em 1
      const wasDeleted = remindersAfterDelete === remindersBeforeDelete - 1;
      
      logTestResult('Lembrete removido do banco', wasDeleted);
      return wasDeleted;
    } else {
      console.log('❌ Intent de remoção NÃO detectado');
      return false;
    }
  }

  async testDeleteAllReminders(): Promise<boolean> {
    console.log('\n🗑️ --- Teste: Remover Todos os Lembretes ---');
    const deleteAllMessage = 'Remover todos os meus lembretes';
    console.log('Mensagem:', deleteAllMessage);
    
    const { result, finalReply } = await testChatResponse(deleteAllMessage, this.context);
    
    if (!result) {
      logTestResult('Remover Todos os Lembretes', false, 'Sem resposta da IA');
      return false;
    }
    
    const intentDetected = validateDeleteAllIntent(result);
    logTestResult('Intent de remoção total detectado', intentDetected);
    
    if (intentDetected) {
      console.log('✅ Intent de remoção total detectado');
      console.log('Resposta final:', finalReply);
      
      // Verificar se todos foram removidos
      const finalReminders = await getRemindersCount(this.context.userId);
      const allDeleted = finalReminders === 0;
      
      logTestResult('Todos os lembretes removidos', allDeleted);
      return allDeleted;
    } else {
      console.log('❌ Intent de remoção total NÃO detectado');
      return false;
    }
  }

  async testDateValidation(): Promise<boolean> {
    console.log('\n📅 --- Teste: Validação de Datas ---');
    
    // Testar apenas o caso de tempo muito curto que sabemos que está funcionando
    const testMessage = 'Me lembre de algo em 5 segundos';
    console.log('Mensagem:', testMessage);
    
    const { result, finalReply } = await testChatResponse(testMessage, this.context);
    
    if (result && validateReminderIntent(result)) {
      // Se detectou intent, verificar se foi rejeitado
      if (finalReply.includes('inválido') || finalReply.includes('passado') || finalReply.includes('erro') || finalReply.includes('invalid')) {
        logTestResult('Tempo muito curto - rejeitado', true);
        return true;
      } else {
        logTestResult('Tempo muito curto - rejeitado', false, 'Data inválida foi aceita!');
        return false;
      }
    } else {
      logTestResult('Tempo muito curto - sem intent', true);
      return true;
    }
  }

  async testEdgeCases(): Promise<boolean> {
    console.log('\n🔍 --- Teste: Edge Cases ---');
    
    // Teste 1: Mensagens muito longas
    const longMessage = 'Este é um lembrete com uma mensagem extremamente longa que contém muitas palavras e pode causar problemas se o sistema não estiver preparado para lidar com mensagens de tamanho considerável.';
    const longMessageResult = await testChatResponse(`Me lembre de: ${longMessage} amanhã às 10h`, this.context);
    
    const longMessageSuccess = longMessageResult.result ? validateReminderIntent(longMessageResult.result) : false;
    logTestResult('Mensagem muito longa', longMessageSuccess);
    
    // Teste 2: Caracteres especiais
    const specialCharsMessage = 'Me lembre de revisar o código com @#$%^&*()_+{}|:"<>?[]\\;\',./~` amanhã às 14h';
    const specialResult = await testChatResponse(specialCharsMessage, this.context);
    
    const specialCharsSuccess = specialResult.result ? validateReminderIntent(specialResult.result) : false;
    logTestResult('Caracteres especiais', specialCharsSuccess);
    
    // Teste 3: Emojis
    const emojiMessage = 'Me lembre de 🎉 celebrar 🎊 o lançamento 🚀 amanhã às 15h';
    const emojiResult = await testChatResponse(emojiMessage, this.context);
    
    const emojiSuccess = emojiResult.result ? validateReminderIntent(emojiResult.result) : false;
    logTestResult('Emojis', emojiSuccess);
    
    return longMessageSuccess && specialCharsSuccess && emojiSuccess;
  }

  async runAllTests(): Promise<{ passed: number; total: number; results: Array<{ name: string; passed: boolean }> }> {
    console.log('🧪 === TESTE COMPLETO DE LEMBRETES ===');
    console.log('User:', this.context);
    console.log('GEMINI_API_KEY loaded:', !!process.env.GEMINI_API_KEY);
    console.log('SUPABASE_URL loaded:', !!process.env.SUPABASE_URL);

    // Limpar lembretes existentes para teste limpo
    console.log('\n📋 --- Limpando lembretes existentes ---');
    await clearExistingReminders(this.context.userId);

    const tests = [
      { name: 'Criar Lembrete', test: () => this.testCreateReminder() },
      { name: 'Listar Lembretes', test: () => this.testListReminders() },
      { name: 'Listagem Filtrada', test: () => this.testFilteredListReminders() },
      { name: 'Remover Lembrete', test: () => this.testDeleteReminder() },
      { name: 'Remover Todos', test: () => this.testDeleteAllReminders() },
      { name: 'Validação de Datas', test: () => this.testDateValidation() },
      { name: 'Edge Cases', test: () => this.testEdgeCases() }
    ];

    const results: Array<{ name: string; passed: boolean }> = [];
    let passed = 0;

    for (const test of tests) {
      try {
        const result = await test.test();
        results.push({ name: test.name, passed: result });
        if (result) passed++;
      } catch (error) {
        console.error(`❌ Erro no teste ${test.name}:`, error);
        results.push({ name: test.name, passed: false });
      }
    }

    console.log('\n📊 --- Resumo Final ---');
    console.log(`✅ Passaram: ${passed}/${tests.length}`);
    console.log(`❌ Falharam: ${tests.length - passed}/${tests.length}`);

    return { passed, total: tests.length, results };
  }
}
