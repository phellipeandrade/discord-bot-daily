import * as fs from 'fs';
const fakePt = JSON.stringify({
  commands: {
    list: { name: 'listar', description: '' },
    register: { name: 'registrar', description: '' }
  },
  'daily.announcement': 'Usuário do dia: <@{{id}}> ({{name}})',
  'daily.holiday': 'Feriado'
});

const fakeEn = JSON.stringify({
  commands: {
    list: { name: 'list', description: '' },
    register: { name: 'register', description: '' }
  },
  'daily.announcement': "Today's user: <@{{id}}> ({{name}})",
  'daily.holiday': 'Holiday'
});

describe('i18n module', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('fs', () => ({
      readFileSync: jest.fn((p: string) => {
        const file = String(p);
        if (file.includes('pt-br.json')) return fakePt;
        if (file.includes('en.json')) return fakeEn;
        return '{}';
      }),
      existsSync: jest.fn(),
      writeFileSync: jest.fn(),
      promises: { access: jest.fn(), readFile: jest.fn(), writeFile: jest.fn() }
    }));
  });

  test('loads Portuguese command names', async () => {
    process.env.NODE_ENV = 'development';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { i18n } = await import('@/i18n');
    i18n.setLanguage('pt-br');
    expect(i18n.getCommandName('list')).toBe('listar');
    expect(i18n.getCommandName('register')).toBe('registrar');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🔍 [pt-br] translations loaded:')
    );
    consoleSpy.mockRestore();
  });

  test('logs fallback usage', async () => {
    process.env.NODE_ENV = 'development';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { i18n } = await import('@/i18n');
    i18n.setLanguage('pt-br');
    i18n.t('nonexistent.key');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🔍 Debug - Fallback used for key')
    );
    consoleSpy.mockRestore();
  });

  test('formats daily announcement message', async () => {
    const { i18n } = await import('@/i18n');
    i18n.setLanguage('en');
    const text = i18n.t('daily.announcement', { id: '42', name: 'Alice' });
    expect(text).toBe("Today's user: <@42> (Alice)");
  });

  test('returns holiday message', async () => {
    const { i18n } = await import('@/i18n');
    i18n.setLanguage('pt-br');
    expect(i18n.t('daily.holiday')).toBe('Feriado');
  });
});
