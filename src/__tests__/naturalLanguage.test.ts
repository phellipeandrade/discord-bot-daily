import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { interpretNaturalCommand, NaturalCommandType } from '@/naturalLanguage';

// Mock do Gemini API
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn()
    }
  }))
}));

// Mock das dependências
jest.mock('@/users', () => ({
  loadUsers: jest.fn(),
  saveUsers: jest.fn(),
  findUser: jest.fn()
}));

jest.mock('@/serverConfig', () => ({
  loadServerConfig: jest.fn(),
  saveServerConfig: jest.fn()
}));

jest.mock('@/config', () => ({
  canUseAdminCommands: jest.fn()
}));

jest.mock('@/date', () => ({
  parseDateString: jest.fn(),
  todayISO: jest.fn(),
  formatDateString: jest.fn()
}));

describe('Natural Language Commands', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  test('should return null when no API key', async () => {
    delete process.env.GEMINI_API_KEY;

    const result = await interpretNaturalCommand('pula o João hoje', '123', 'Test User');

    expect(result).toBeNull();
  });

  test('should return null when no API key', async () => {
    delete process.env.GEMINI_API_KEY;

    const result = await interpretNaturalCommand('pula o João hoje', '123', 'Test User');

    expect(result).toBeNull();
  });
});
