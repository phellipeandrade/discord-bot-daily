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
    const generateContent = jest
      .fn()
      .mockResolvedValueOnce({
        text: JSON.stringify({
          reply: 'ok',
          intent: { setReminder: { date: future } }
        })
      });
    const i18nMock = {
      t: jest.fn((key: string, params: Record<string, string> = {}) => {
        const map: Record<string, string> = {
          'reminder.notify': `notify ${params.text}`,
          'reminder.set': `set ${params.date}`
        };
        return map[key] || key;
      }),
      getLanguage: jest.fn(() => 'en')
    };
    jest.doMock('@/i18n', () => ({ i18n: i18nMock }));
    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: { generateContent }
      }))
    }));
    const { handleReminderMessage } = await import('@/reminders');
    const send = jest.fn();
    const reply = jest.fn();
    const message = {
      content: 'remind me',
      author: { bot: false, send },
      guildId: null,
      reply
    } as unknown as Message;
    await handleReminderMessage(message);
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          responseMimeType: 'application/json',
          responseSchema: expect.any(Object)
        })
      })
    );
    expect(reply).toHaveBeenCalledWith('ok');
    jest.runAllTimers();
    expect(send).toHaveBeenCalledWith(
      i18nMock.t('reminder.notify', { text: 'remind me' })
    );
  });

  test('handles parse failure', async () => {
    const i18nMock = {
      t: jest.fn((key: string) => ({
        'reminder.parseError': 'parse-error'
      }[key] || key)),
      getLanguage: jest.fn(() => 'en')
    };
    jest.doMock('@/i18n', () => ({ i18n: i18nMock }));
    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
          generateContent: jest.fn().mockResolvedValueOnce({ text: 'invalid' })
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
    expect(reply).toHaveBeenCalledWith(
      i18nMock.t('reminder.parseError')
    );
  });

  test('chats when no reminder intent', async () => {
    const i18nMock = {
      t: jest.fn((key: string) => ({
        'reminder.defaultReply': 'default'
      }[key] || key)),
      getLanguage: jest.fn(() => 'en')
    };
    jest.doMock('@/i18n', () => ({ i18n: i18nMock }));
    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
          generateContent: jest.fn().mockResolvedValueOnce({
            text: JSON.stringify({ reply: 'Hello there!' })
          })
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
