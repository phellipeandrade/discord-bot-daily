
// Mock do i18n
const i18nMock = {
  t: jest.fn((key: string) => ({
    'reminder.defaultReply': 'default'
  }[key] || key)),
  getLanguage: jest.fn(() => 'pt-br')
};

jest.mock('@/i18n', () => ({
  i18n: i18nMock
}));

// Mock do @google/genai
const mockGenerateContent = jest.fn();
const mockGoogleGenAI = jest.fn().mockImplementation(() => ({
  models: {
    generateContent: mockGenerateContent
  }
}));

jest.mock('@google/genai', () => ({
  GoogleGenAI: mockGoogleGenAI
}));

describe('chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  test('returns reminder intent when user asks for reminder', async () => {
    const future = new Date(Date.now() + 1000).toISOString();
    
    // Mock para classificação de intenção (reminder)
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        intent: 'reminder',
        confidence: 0.9,
        subIntent: 'set_reminder'
      })
    });
    
    // Mock para resposta do handler de reminder
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        reply: 'Ok! Vou te lembrar amanhã às 14h.',
        intent: { setReminder: { date: future } }
      })
    });

    const { chatResponse } = await import('@/chat');
    const result = await chatResponse('me lembra de revisar o PR amanhã às 14h');
    
    expect(result).toEqual({
      reply: 'Ok! Vou te lembrar amanhã às 14h.',
      intent: { setReminder: { date: future } }
    });
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  test('returns chat response when no reminder intent', async () => {
    // Mock para classificação de intenção (technical_support)
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        intent: 'technical_support',
        confidence: 0.8,
        subIntent: 'deployment_status'
      })
    });
    
    // Mock para resposta do handler de technical support
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ 
        reply: 'No Atena, consulte o painel do pipeline (branch, ambiente) e verifique o último job verde.' 
      })
    });

    const { chatResponse } = await import('@/chat');
    const result = await chatResponse('como ver status do deploy?');
    
    expect(result).toEqual({
      reply: 'No Atena, consulte o painel do pipeline (branch, ambiente) e verifique o último job verde.'
    });
  });

  test('handles parse failure', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'invalid json' });

    const { chatResponse } = await import('@/chat');
    const result = await chatResponse('hi');
    
    expect(result).toEqual({ reply: 'default' });
  });

  test('falls back when API key is missing', async () => {
    process.env.GEMINI_API_KEY = '';
    
    const { chatResponse } = await import('@/chat');
    const result = await chatResponse('hi');
    
    expect(result).toEqual({ reply: 'default' });
  });

  test('handles API error gracefully', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API Error'));

    const { chatResponse } = await import('@/chat');
    const result = await chatResponse('hi');
    
    expect(result).toEqual({ reply: 'default' });
  });

  test('uses English language when configured', async () => {
    i18nMock.getLanguage.mockReturnValueOnce('en');
    
    // Mock para classificação de intenção (general_question)
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        intent: 'general_question',
        confidence: 0.7,
        subIntent: 'greeting'
      })
    });
    
    // Mock para resposta do handler de general question
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ reply: 'Hello there!' })
    });

    const { chatResponse } = await import('@/chat');
    const result = await chatResponse('hi');
    
    expect(result).toEqual({ reply: 'Hello there!' });
    expect(i18nMock.getLanguage).toHaveBeenCalled();
  });
});
