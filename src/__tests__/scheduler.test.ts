import { Client, TextChannel } from 'discord.js';
jest.mock('node-cron', () => ({ schedule: jest.fn() }));

describe('scheduleDailySelection', () => {
  const send = jest.fn();
  const mockChannel = { isTextBased: () => true, send } as unknown as TextChannel;
  const fetch = jest.fn().mockResolvedValue(mockChannel);
  const client = { channels: { fetch } } as unknown as Client;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('schedules job and sends message', async () => {
    const cron = await import('node-cron');
    const mockSchedule = jest.fn((expr: string, fn: () => void) => {
      fn();
      return { stop: jest.fn() } as unknown as import('node-cron').ScheduledTask;
    });
    (cron.schedule as jest.Mock).mockImplementation(mockSchedule);

    jest.doMock('../holidays', () => ({ isHoliday: () => false }));
    jest.doMock('../i18n', () => ({
      i18n: { t: jest.fn(() => 'msg') }
    }));
    jest.doMock('../users', () => ({
      loadUsers: jest.fn().mockResolvedValue({}),
      selectUser: jest.fn().mockResolvedValue({ id: '1', name: 'Test' })
    }));
    jest.doMock('../music', () => ({
      findNextSong: jest.fn().mockResolvedValue({ text: 'song', components: [] })
    }));
    const config = await import('../config');
    config.CHANNEL_ID = '1';
    const { scheduleDailySelection } = await import('../scheduler');
    scheduleDailySelection(client);
    await Promise.resolve();

    expect(mockSchedule).toHaveBeenCalled();
  });

  test('does nothing when holiday', async () => {
    const cron = await import('node-cron');
    const mockSchedule = jest.fn((expr: string, fn: () => void) => {
      fn();
      return { stop: jest.fn() } as unknown as import('node-cron').ScheduledTask;
    });
    (cron.schedule as jest.Mock).mockImplementation(mockSchedule);

    jest.doMock('../holidays', () => ({ isHoliday: () => true }));
    jest.doMock('../i18n', () => ({ i18n: { t: jest.fn(() => 'holiday') } }));
    const config = await import('../config');
    config.CHANNEL_ID = '1';
    const { scheduleDailySelection } = await import('../scheduler');
    scheduleDailySelection(client);
    await Promise.resolve();

    expect(send).not.toHaveBeenCalled();
  });
});
