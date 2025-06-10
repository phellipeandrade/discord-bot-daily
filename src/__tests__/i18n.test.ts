import * as fs from 'fs';
const fakePt = JSON.stringify({
  commands: {
    list: { name: 'listar', description: '' },
    register: { name: 'registrar', description: '' }
  }
});

const fakeEn = JSON.stringify({
  commands: {
    list: { name: 'list', description: '' },
    register: { name: 'register', description: '' }
  }
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

  test('loads Portuguese command names', () => {
    process.env.NODE_ENV = 'development';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { i18n } = require('../i18n');
    i18n.setLanguage('pt-br');
    expect(i18n.getCommandName('list')).toBe('listar');
    expect(i18n.getCommandName('register')).toBe('registrar');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🔍 Debug - Loaded translations for pt-br:'),
      expect.any(String)
    );
    consoleSpy.mockRestore();
  });

  test('logs fallback usage', () => {
    process.env.NODE_ENV = 'development';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { i18n } = require('../i18n');
    i18n.setLanguage('pt-br');
    i18n.t('nonexistent.key');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🔍 Debug - Fallback used for key')
    );
    consoleSpy.mockRestore();
  });
});
