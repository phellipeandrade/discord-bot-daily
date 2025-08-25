import { chatResponse } from '@/chat';

describe('chat', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.GEMINI_API_KEY = 'test';
  });

  test('returns reminder intent when user asks for reminder', async () => {
    const future = new Date(Date.now() + 1000).toISOString();
    const generateContent = jest
      .fn()
      .mockResolvedValueOnce({
        text: JSON.stringify({
          reply: 'Ok! Vou te lembrar amanhã às 14h.',
          intent: { setReminder: { date: future } }
        })
      });
    const i18nMock = {
      t: jest.fn((key: string) => ({
        'reminder.defaultReply': 'default'
      }[key] || key)),
      getLanguage: jest.fn(() => 'pt-br')
    };
    jest.doMock('@/i18n', () => ({ i18n: i18nMock }));
    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: { generateContent }
      }))
    }));
    const { chatResponse } = await import('@/chat');
    const result = await chatResponse('me lembra de revisar o PR amanhã às 14h');
    expect(result).toEqual({
      reply: 'Ok! Vou te lembrar amanhã às 14h.',
      intent: { setReminder: { date: future } }
    });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          responseMimeType: 'application/json',
          responseSchema: expect.any(Object)
        })
      })
    );
  });

  test('returns chat response when no reminder intent', async () => {
    const i18nMock = {
      t: jest.fn((key: string) => ({
        'reminder.defaultReply': 'default'
      }[key] || key)),
      getLanguage: jest.fn(() => 'pt-br')
    };
    jest.doMock('@/i18n', () => ({ i18n: i18nMock }));
    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
          generateContent: jest.fn().mockResolvedValueOnce({
            text: JSON.stringify({ 
              reply: 'No Atena, consulte o painel do pipeline (branch, ambiente) e verifique o último job verde.' 
            })
          })
        }
      }))
    }));
    const { chatResponse } = await import('@/chat');
    const result = await chatResponse('como ver status do deploy?');
    expect(result).toEqual({
      reply: 'No Atena, consulte o painel do pipeline (branch, ambiente) e verifique o último job verde.'
    });
  });

  test('handles parse failure', async () => {
    const i18nMock = {
      t: jest.fn((key: string) => ({
        'reminder.defaultReply': 'default'
      }[key] || key)),
      getLanguage: jest.fn(() => 'pt-br')
    };
    jest.doMock('@/i18n', () => ({ i18n: i18nMock }));
    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
          generateContent: jest.fn().mockResolvedValueOnce({ text: 'invalid json' })
        }
      }))
    }));
    const { chatResponse } = await import('@/chat');
    const result = await chatResponse('hi');
    expect(result).toBeNull();
  });

  test('falls back when API key is missing', async () => {
    process.env.GEMINI_API_KEY = '';
    const i18nMock = {
      t: jest.fn((key: string) => ({
        'reminder.defaultReply': 'default'
      }[key] || key)),
      getLanguage: jest.fn(() => 'pt-br')
    };
    jest.doMock('@/i18n', () => ({ i18n: i18nMock }));
    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: { generateContent: jest.fn() }
      }))
    }));
    const { chatResponse } = await import('@/chat');
    const result = await chatResponse('hi');
    expect(result).toEqual({ reply: 'default' });
  });

  test('handles API error gracefully', async () => {
    const i18nMock = {
      t: jest.fn((key: string) => ({
        'reminder.defaultReply': 'default'
      }[key] || key)),
      getLanguage: jest.fn(() => 'pt-br')
    };
    jest.doMock('@/i18n', () => ({ i18n: i18nMock }));
    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
          generateContent: jest.fn().mockRejectedValueOnce(new Error('API Error'))
        }
      }))
    }));
    const { chatResponse } = await import('@/chat');
    const result = await chatResponse('hi');
    expect(result).toEqual({ reply: 'default' });
  });

  test('uses English language when configured', async () => {
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
    const { chatResponse } = await import('@/chat');
    const result = await chatResponse('hi');
    expect(result).toEqual({ reply: 'Hello there!' });
    expect(i18nMock.getLanguage).toHaveBeenCalled();
  });
});
