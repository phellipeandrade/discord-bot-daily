import { simpleReminderService } from '../simpleReminderService';
import { ChatResult } from '../intentHandlers/types';

export interface TestContext {
  userId: string;
  userName: string;
}

export async function clearExistingReminders(userId: string): Promise<void> {
  try {
    const existingReminders = await simpleReminderService.getRemindersByUser(userId);
    console.log('Lembretes existentes:', existingReminders?.length || 0);
    
    if (existingReminders && existingReminders.length > 0) {
      for (const reminder of existingReminders) {
        await simpleReminderService.deleteReminder(reminder.id, userId);
        console.log(`Removido lembrete: ${reminder.id}`);
      }
    }
  } catch (error) {
    console.error('Erro ao limpar lembretes:', error);
  }
}

export async function createTestReminders(
  context: TestContext, 
  reminders: Array<{ message: string; scheduledFor: string }>
): Promise<void> {
  console.log('📝 Criando lembretes de teste...');
  for (const reminder of reminders) {
    await simpleReminderService.addReminder(
      context.userId, 
      context.userName, 
      reminder.message, 
      reminder.scheduledFor
    );
    console.log(`  ✅ Criado: "${reminder.message}"`);
  }
  
  // Aguardar um pouco para garantir que foram criados
  await new Promise(resolve => setTimeout(resolve, 1000));
}

export async function getRemindersCount(userId: string): Promise<number> {
  const reminders = await simpleReminderService.getRemindersByUser(userId);
  return reminders?.length || 0;
}

export async function findReminderByMessage(
  userId: string, 
  message: string
): Promise<{ id: number; userId: string; userName: string; message: string; scheduledFor: string; createdAt: string; sent: boolean } | undefined> {
  const reminders = await simpleReminderService.getRemindersByUser(userId);
  return reminders?.find(r => r.message === message);
}

export async function waitForReminderCreation(delay: number = 1000): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, delay));
}

export function createTestContext(): TestContext {
  return {
    userId: process.env.LOCAL_TEST_USER_ID || 'local-user',
    userName: process.env.LOCAL_TEST_USER_NAME || 'Local Tester'
  };
}

export function logTestResult(testName: string, success: boolean, details?: string): void {
  const status = success ? '✅' : '❌';
  console.log(`${status} ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

export function validateReminderIntent(result: ChatResult): boolean {
  return !!(result?.intent?.setReminder?.date);
}

export function validateListIntent(result: ChatResult): boolean {
  return !!result?.intent?.listReminders;
}

export function validateDeleteIntent(result: ChatResult): boolean {
  return !!result?.intent?.deleteReminders;
}

export function validateDeleteAllIntent(result: ChatResult): boolean {
  return !!result?.intent?.deleteAllReminders;
}
