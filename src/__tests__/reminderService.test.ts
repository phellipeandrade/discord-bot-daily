// Mock do i18n
jest.mock('@/i18n', () => ({
  i18n: {
    t: jest.fn((key: string) => ({
      'reminder.list.noReminders': 'No reminders found'
    }[key] || key))
  }
}));

// Mock do Google Gemini
const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent
    }
  }))
}));

import { simpleReminderService } from '@/simpleReminderService';

// Mock do database
jest.mock('@/supabase', () => ({
  database: {
    addReminder: jest.fn(),
    getRemindersByUser: jest.fn(),
    deleteReminder: jest.fn(),
    deleteAllRemindersByUser: jest.fn(),
    getReminderStats: jest.fn(),
    getPendingReminders: jest.fn(),
    deleteOldReminders: jest.fn()
  }
}));

describe('simpleReminderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('adds reminder successfully', async () => {
    const { database } = await import('@/supabase');
    (database.addReminder as jest.Mock).mockResolvedValue(1);
    
    // Mock getRemindersByUser to return the created reminder
    const mockReminder = {
      id: 1,
      userId: 'user123',
      userName: 'TestUser',
      message: 'Test reminder',
      scheduledFor: '2025-08-26T10:00:00.000Z',
      sent: false,
      createdAt: '2025-08-25T10:00:00.000Z'
    };
    (database.getRemindersByUser as jest.Mock).mockResolvedValue([mockReminder]);

    const result = await simpleReminderService.addReminder(
      'user123',
      'TestUser',
      'Test reminder',
      '2025-08-26T10:00:00.000Z'
    );

    expect(result).toBe(1);
    expect(database.addReminder).toHaveBeenCalledWith(
      'user123',
      'TestUser',
      'Test reminder',
      '2025-08-26T10:00:00.000Z'
    );
  });

  test('gets reminders by user', async () => {
    const { database } = await import('@/supabase');
    const mockReminders = [
      { id: 1, userId: 'user123', message: 'Test 1', scheduledFor: '2025-08-26T10:00:00.000Z', sent: false, createdAt: '2025-08-25T10:00:00.000Z', userName: 'TestUser' },
      { id: 2, userId: 'user123', message: 'Test 2', scheduledFor: '2025-08-26T11:00:00.000Z', sent: true, createdAt: '2025-08-25T11:00:00.000Z', userName: 'TestUser' }
    ];
    (database.getRemindersByUser as jest.Mock).mockResolvedValue(mockReminders);

    const result = await simpleReminderService.getRemindersByUser('user123');

    expect(result).toEqual(mockReminders);
    expect(database.getRemindersByUser).toHaveBeenCalledWith('user123');
  });

  test('deletes reminder successfully', async () => {
    const { database } = await import('@/supabase');
    (database.getRemindersByUser as jest.Mock).mockResolvedValue([
      { id: 1, userId: 'user123', message: 'Test', scheduledFor: '2025-08-26T10:00:00.000Z', sent: false, createdAt: '2025-08-25T10:00:00.000Z', userName: 'TestUser' }
    ]);
    (database.deleteReminder as jest.Mock).mockResolvedValue(undefined);

    const result = await simpleReminderService.deleteReminder(1, 'user123');

    expect(result).toBe(true);
    expect(database.deleteReminder).toHaveBeenCalledWith(1);
  });

  test('fails to delete non-existent reminder', async () => {
    const { database } = await import('@/supabase');
    (database.getRemindersByUser as jest.Mock).mockResolvedValue([]);

    const result = await simpleReminderService.deleteReminder(999, 'user123');

    expect(result).toBe(false);
    expect(database.deleteReminder).not.toHaveBeenCalled();
  });

  test('deletes all reminders by user', async () => {
    const { database } = await import('@/supabase');
    (database.deleteAllRemindersByUser as jest.Mock).mockResolvedValue(3);

    const result = await simpleReminderService.deleteAllRemindersByUser('user123');

    expect(result).toBe(3);
    expect(database.deleteAllRemindersByUser).toHaveBeenCalledWith('user123');
  });

  test('gets reminder stats', async () => {
    const { database } = await import('@/supabase');
    const mockStats = { total: 10, pending: 5, sent: 5 };
    (database.getReminderStats as jest.Mock).mockResolvedValue(mockStats);

    const result = await simpleReminderService.getStats();

    expect(result).toEqual(mockStats);
    expect(database.getReminderStats).toHaveBeenCalled();
  });

  test('formats reminder list correctly', () => {
    const mockReminders = [
      { id: 1, userId: 'user123', userName: 'TestUser', message: 'Test 1', scheduledFor: '2025-08-26T10:00:00.000Z', sent: false, createdAt: '2025-08-25T10:00:00.000Z' },
      { id: 2, userId: 'user123', userName: 'TestUser', message: 'Test 2', scheduledFor: '2025-08-26T11:00:00.000Z', sent: true, createdAt: '2025-08-25T11:00:00.000Z' }
    ];

    const result = simpleReminderService.formatReminderList(mockReminders);

    expect(result).toContain('ID: 1');
    expect(result).toContain('ID: 2');
    expect(result).toContain('Test 1');
    expect(result).toContain('Test 2');
  });

  test('formats empty reminder list', () => {
    const result = simpleReminderService.formatReminderList([]);

    expect(result).toBe('No reminders found');
  });

  test('handles errors gracefully', async () => {
    const { database } = await import('@/supabase');
    (database.addReminder as jest.Mock).mockRejectedValue(new Error('Database error'));

    await expect(simpleReminderService.addReminder(
      'user123',
      'TestUser',
      'Test reminder',
      '2025-08-26T10:00:00.000Z'
    )).rejects.toThrow('Database error');
  });

  test('starts and stops service correctly', () => {
    const client = { users: { fetch: jest.fn() } } as any;
    simpleReminderService.setClient(client);
    
    simpleReminderService.start();
    simpleReminderService.stop();
    
    // Verificar se não há erros na execução
    expect(client.users.fetch).toBeDefined();
  });

  describe('findAndDeleteReminder with AI', () => {
    const mockReminders = [
      { id: 1, userId: 'user123', userName: 'TestUser', message: 'Daily standup meeting', scheduledFor: '2025-08-26T10:00:00.000Z', sent: false, createdAt: '2025-08-25T10:00:00.000Z' },
      { id: 2, userId: 'user123', userName: 'TestUser', message: 'Review pull request #123', scheduledFor: '2025-08-26T11:00:00.000Z', sent: false, createdAt: '2025-08-25T11:00:00.000Z' },
      { id: 3, userId: 'user123', userName: 'TestUser', message: 'Send weekly report email', scheduledFor: '2025-08-26T12:00:00.000Z', sent: false, createdAt: '2025-08-25T12:00:00.000Z' }
    ];

    let originalEnv: string | undefined;

    beforeEach(() => {
      const { database } = require('@/supabase');
      (database.getRemindersByUser as jest.Mock).mockResolvedValue(mockReminders);
      (database.deleteReminder as jest.Mock).mockResolvedValue(undefined);
      
      // Salvar valor original da variável de ambiente
      originalEnv = process.env.GEMINI_API_KEY;
      
      // Mock da variável de ambiente para garantir que a IA seja chamada
      process.env.GEMINI_API_KEY = 'test-key';
      
      // Reset mock da IA
      mockGenerateContent.mockClear();
      mockGenerateContent.mockResolvedValue({ text: '1' });
    });

    afterEach(() => {
      // Restaurar valor original da variável de ambiente
      if (originalEnv !== undefined) {
        process.env.GEMINI_API_KEY = originalEnv;
      } else {
        delete process.env.GEMINI_API_KEY;
      }
    });

    test('finds and deletes reminder by message using simple search', async () => {
      const result = await simpleReminderService.findAndDeleteReminders('user123', {
        message: 'pull request'
      });

      expect(result.success).toBe(true);
      expect(result.deletedIds).toContain(2);
      expect(result.message).toContain('1 lembrete deletados com sucesso');
    });

    test('finds and deletes reminder by description using simple search', async () => {
      const result = await simpleReminderService.findAndDeleteReminders('user123', {
        description: 'enviar relatório'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nenhum lembrete encontrado com os critérios fornecidos');
    });

    test('finds and deletes reminder by message using simple search', async () => {
      const result = await simpleReminderService.findAndDeleteReminders('user123', {
        message: 'standup'
      });

      expect(result.success).toBe(true);
      expect(result.deletedIds).toContain(1);
      expect(result.message).toContain('1 lembrete deletados com sucesso');
    });

    test('finds and deletes reminder by message using simple search', async () => {
      const result = await simpleReminderService.findAndDeleteReminders('user123', {
        message: 'meeting'
      });

      expect(result.success).toBe(true);
      expect(result.deletedIds).toContain(1);
      expect(result.message).toContain('1 lembrete deletados com sucesso');
    });

    test('finds and deletes reminder by message using simple search', async () => {
      const result = await simpleReminderService.findAndDeleteReminders('user123', {
        message: 'email'
      });

      expect(result.success).toBe(true);
      expect(result.deletedIds).toContain(3);
      expect(result.message).toContain('1 lembrete deletados com sucesso');
    });

    test('finds reminder by date (non-AI logic)', async () => {
      const result = await simpleReminderService.findAndDeleteReminders('user123', {
        date: '2025-08-26T10:30:00.000Z'
      });

      expect(result.success).toBe(true);
      expect(result.deletedIds).toContain(1);
      expect(result.message).toContain('3 lembretes deletados com sucesso');
    });

    test('returns error when no reminders found', async () => {
      const { database } = require('@/supabase');
      (database.getRemindersByUser as jest.Mock).mockResolvedValue([]);

      const result = await simpleReminderService.findAndDeleteReminders('user123', {
        message: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Você não possui lembretes para deletar');
    });

    test('returns error when reminder not found with criteria', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'null'
      });

      const result = await simpleReminderService.findAndDeleteReminders('user123', {
        message: 'nonexistent reminder'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nenhum lembrete encontrado com os critérios fornecidos');
    });

    test('falls back to simple search when no API key', async () => {
      delete process.env.GEMINI_API_KEY;
      
      const result = await simpleReminderService.findAndDeleteReminders('user123', {
        message: 'standup'
      });

      expect(result.success).toBe(true);
      expect(result.deletedIds).toContain(1);
      expect(result.message).toContain('1 lembrete deletados com sucesso');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });
});
