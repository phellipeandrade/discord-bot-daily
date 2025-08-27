import { reminderService } from '@/reminderService';

// Mock do i18n
jest.mock('@/i18n', () => ({
  i18n: {
    t: jest.fn((key: string) => ({
      'reminder.list.noReminders': 'No reminders found'
    }[key] || key))
  }
}));

// Mock do database
jest.mock('@/database', () => ({
  database: {
    addReminder: jest.fn(),
    getRemindersByUser: jest.fn(),
    deleteReminder: jest.fn(),
    deleteAllRemindersByUser: jest.fn(),
    getReminderStats: jest.fn(),
    getPendingReminders: jest.fn(),
    markReminderAsSent: jest.fn(),
    deleteOldReminders: jest.fn()
  }
}));

describe('reminderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('adds reminder successfully', async () => {
    const { database } = await import('@/database');
    (database.addReminder as jest.Mock).mockResolvedValue(1);

    const result = await reminderService.addReminder(
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
    const { database } = await import('@/database');
    const mockReminders = [
      { id: 1, userId: 'user123', message: 'Test 1', scheduledFor: '2025-08-26T10:00:00.000Z', sent: false, createdAt: '2025-08-25T10:00:00.000Z', userName: 'TestUser' },
      { id: 2, userId: 'user123', message: 'Test 2', scheduledFor: '2025-08-26T11:00:00.000Z', sent: true, createdAt: '2025-08-25T11:00:00.000Z', userName: 'TestUser' }
    ];
    (database.getRemindersByUser as jest.Mock).mockResolvedValue(mockReminders);

    const result = await reminderService.getRemindersByUser('user123');

    expect(result).toEqual(mockReminders);
    expect(database.getRemindersByUser).toHaveBeenCalledWith('user123');
  });

  test('deletes reminder successfully', async () => {
    const { database } = await import('@/database');
    (database.getRemindersByUser as jest.Mock).mockResolvedValue([
      { id: 1, userId: 'user123', message: 'Test', scheduledFor: '2025-08-26T10:00:00.000Z', sent: false, createdAt: '2025-08-25T10:00:00.000Z', userName: 'TestUser' }
    ]);
    (database.deleteReminder as jest.Mock).mockResolvedValue(undefined);

    const result = await reminderService.deleteReminder(1, 'user123');

    expect(result).toBe(true);
    expect(database.deleteReminder).toHaveBeenCalledWith(1);
  });

  test('fails to delete non-existent reminder', async () => {
    const { database } = await import('@/database');
    (database.getRemindersByUser as jest.Mock).mockResolvedValue([]);

    const result = await reminderService.deleteReminder(999, 'user123');

    expect(result).toBe(false);
    expect(database.deleteReminder).not.toHaveBeenCalled();
  });

  test('deletes all reminders by user', async () => {
    const { database } = await import('@/database');
    (database.deleteAllRemindersByUser as jest.Mock).mockResolvedValue(3);

    const result = await reminderService.deleteAllRemindersByUser('user123');

    expect(result).toBe(3);
    expect(database.deleteAllRemindersByUser).toHaveBeenCalledWith('user123');
  });

  test('gets reminder stats', async () => {
    const { database } = await import('@/database');
    const mockStats = { total: 10, pending: 5, sent: 5 };
    (database.getReminderStats as jest.Mock).mockResolvedValue(mockStats);

    const result = await reminderService.getStats();

    expect(result).toEqual(mockStats);
    expect(database.getReminderStats).toHaveBeenCalled();
  });

  test('formats reminder list correctly', () => {
    const mockReminders = [
      { id: 1, userId: 'user123', userName: 'TestUser', message: 'Test 1', scheduledFor: '2025-08-26T10:00:00.000Z', sent: false, createdAt: '2025-08-25T10:00:00.000Z' },
      { id: 2, userId: 'user123', userName: 'TestUser', message: 'Test 2', scheduledFor: '2025-08-26T11:00:00.000Z', sent: true, createdAt: '2025-08-25T11:00:00.000Z' }
    ];

    const result = reminderService.formatReminderList(mockReminders);

    expect(result).toContain('ID: 1');
    expect(result).toContain('ID: 2');
    expect(result).toContain('Test 1');
    expect(result).toContain('Test 2');
  });

  test('formats empty reminder list', () => {
    const result = reminderService.formatReminderList([]);

    expect(result).toBe('No reminders found');
  });

  test('handles errors gracefully', async () => {
    const { database } = await import('@/database');
    (database.addReminder as jest.Mock).mockRejectedValue(new Error('Database error'));

    await expect(reminderService.addReminder(
      'user123',
      'TestUser',
      'Test reminder',
      '2025-08-26T10:00:00.000Z'
    )).rejects.toThrow('Database error');
  });

  test('starts and stops service correctly', () => {
    const client = { users: { fetch: jest.fn() } } as any;
    reminderService.setClient(client);
    
    reminderService.start();
    reminderService.stop();
    
    // Verificar se não há erros na execução
    expect(client.users.fetch).toBeDefined();
  });
});
