import { config } from 'dotenv';
import { resolve } from 'path';

// Carregar variáveis de ambiente do arquivo .env
config({ path: resolve(__dirname, '../.env') });

import { chatResponse } from './chat';
import { createTestContext } from './testUtils/reminderTestUtils';
import { ReminderTestScenarios } from './testUtils/reminderTestScenarios';

async function simpleTest(): Promise<void> {
  const context = createTestContext();
  const contentArg = process.argv.slice(3).join(' ');
  const content = contentArg || 'Me lembre de falar com o Serginho daqui a 1 minuto';

  console.log('--- Local Chat Intent Test ---');
  console.log('User:', context);
  console.log('Message:', content);

  const result = await chatResponse(content, context.userId, context.userName);
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
}

async function fullTest(): Promise<void> {
  const context = createTestContext();
  const testScenarios = new ReminderTestScenarios(context);
  
  const results = await testScenarios.runAllTests();
  
  console.log('\n🎉 Teste completo finalizado!');
  console.log(`Resultado: ${results.passed}/${results.total} testes passaram`);
  
  if (results.passed < results.total) {
    console.log('\n❌ Testes que falharam:');
    results.results
      .filter(r => !r.passed)
      .forEach(r => console.log(`  - ${r.name}`));
  }
}

async function main(): Promise<void> {
  const testType = process.argv[2];
  
  if (testType === 'simple') {
    await simpleTest();
  } else {
    await fullTest();
  }
}

main().catch(console.error);


