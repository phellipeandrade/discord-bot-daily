import { Message } from 'discord.js';

describe('reminders', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('schedules reminder from DM', async () => {
    const future = new Date(Date.now() + 1000).toISOString();
    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
          generateContent: jest
            .fn()
            .mockResolvedValueOnce({ text: JSON.stringify({ isReminder: true }) })
            .mockResolvedValueOnce(
              { text: JSON.stringify({ datetime: future, text: 'talk' }) }
            )
        }
      }))
    }));
    const { handleReminderMessage } = await import('@/reminders');
    const { i18n } = await import('@/i18n');
    const send = jest.fn();
    const reply = jest.fn();
    const message = {
      content: 'remind me',
      author: { bot: false, send },
      guildId: null,
      reply
    } as unknown as Message;
    await handleReminderMessage(message);
    expect(reply).toHaveBeenCalledWith(
      i18n.t('reminder.set', { date: future })
    );
    jest.runAllTimers();
    expect(send).toHaveBeenCalledWith(
      i18n.t('reminder.notify', { text: 'talk' })
    );
  });

  test('handles parse failure', async () => {
    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
          generateContent: jest
            .fn()
            .mockResolvedValueOnce({ text: JSON.stringify({ isReminder: true }) })
            .mockResolvedValueOnce({ text: 'invalid' })
        }
      }))
    }));
    const { handleReminderMessage } = await import('@/reminders');
    const { i18n } = await import('@/i18n');
    const reply = jest.fn();
    const message = {
      content: 'hi',
      author: { bot: false },
      guildId: null,
      reply
    } as unknown as Message;
    await handleReminderMessage(message);
    expect(reply).toHaveBeenCalledWith(
      i18n.t('reminder.parseError')
    );
  });

  test('chats when no reminder intent', async () => {
    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
          generateContent: jest
            .fn()
            .mockResolvedValueOnce({ text: JSON.stringify({ isReminder: false }) })
            .mockResolvedValueOnce({ text: 'Hello there!' })
        }
      }))
    }));
    const { handleReminderMessage } = await import('@/reminders');
    const reply = jest.fn();
    const message = {
      content: 'hi',
      author: { bot: false },
      guildId: null,
      reply
    } as unknown as Message;
    await handleReminderMessage(message);
    expect(reply).toHaveBeenCalledWith('Hello there!');
  });
});
