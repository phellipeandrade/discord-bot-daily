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
            .mockResolvedValue({ text: JSON.stringify({ datetime: future, text: 'talk' }) })
        }
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
    expect(reply).toHaveBeenCalledWith(`Reminder set for ${future}.`);
    jest.runAllTimers();
    expect(send).toHaveBeenCalledWith('⏰ Reminder: talk');
  });

  test('handles parse failure', async () => {
    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
          generateContent: jest.fn().mockResolvedValue({ text: 'invalid' })
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
    expect(reply).toHaveBeenCalledWith('Sorry, I could not understand the reminder.');
  });
});
