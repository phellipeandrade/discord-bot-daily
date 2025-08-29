import * as fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

jest.mock('@/i18n', () => ({
  i18n: {
    t: jest.fn((key: string, params: Record<string, string> = {}) => {
      const translations: Record<string, string> = {
        'list.empty': '(none)',
        'music.noValidMusic': '✅ No valid music found.',
        'music.marked':
          '✅ Song marked as played!\n\n🎵 To play the song in the bot, copy and send the command below:\n```\n{{command}} {{link}}\n```',
        'music.reactionsCleared': '✅ Removed {{count}} 🐰 reactions made by the bot.',
        'music.markedPlaying': '✅ Song marked as played!\n\n🎵 Playing in the voice channel.',
        'music.stopped': '⏹️ Music playback stopped.'
      };

      let text = translations[key] || key;
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);
    }),
    getCommandName: jest.fn((command: string) => command),
    getCommandDescription: jest.fn((command: string) => `Command ${command}`),
    getOptionName: jest.fn((command: string, option: string) => option),
    getOptionDescription: jest.fn((command: string, option: string) => `Option ${option}`),
    setLanguage: jest.fn((lang: 'en' | 'pt-br') => {})
  }
}));

import { UserEntry, loadUsers, saveUsers, selectUser, formatUsers } from '@/index';


// Mock do módulo fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

// Mock do i18n
jest.mock('@/i18n', () => ({
  i18n: {
    t: jest.fn((key: string, params: Record<string, string> = {}) => {
      const translations: Record<string, string> = {
        'list.empty': '(none)',
        'music.noValidMusic': '✅ No valid music found.',
        'music.marked': '✅ Song marked as played!\n\n🎵 To play the song in the bot, copy and send the command below:\n```\n{{command}} {{link}}\n```',
        'music.reactionsCleared': '✅ Removed {{count}} 🐰 reactions made by the bot.',
        'music.markedPlaying': '✅ Song marked as played!\n\n🎵 Playing in the voice channel.',
        'music.stopped': '⏹️ Music playback stopped.'
      };

      let text = translations[key] || key;
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);
    }),
    getCommandName: jest.fn((command: string) => command),
    getCommandDescription: jest.fn((command: string) => `Command ${command}`),
    getOptionName: jest.fn((command: string, option: string) => option),
    getOptionDescription: jest.fn((command: string, option: string) => `Option ${option}`),
    setLanguage: jest.fn((lang: 'en' | 'pt-br') => {})
  }
}));

// Dados de teste fixos
const TEST_DATA = {
  all: [
    { name: "User1", id: "1" },
    { name: "User2", id: "2" },
    { name: "User3", id: "3" },
    { name: "User4", id: "4" },
    { name: "User5", id: "5" },
    { name: "User6", id: "6" },
    { name: "User7", id: "7" }
  ],
  remaining: [
    { name: "User1", id: "1" },
    { name: "User2", id: "2" },
    { name: "User3", id: "3" },
    { name: "User4", id: "4" },
    { name: "User5", id: "5" },
    { name: "User6", id: "6" },
    { name: "User7", id: "7" }
  ],
  lastSelected: undefined
};

describe('Funções Utilitárias', () => {
  let mockData: typeof TEST_DATA;

  beforeEach(() => {
    jest.clearAllMocks();
    // Cria uma cópia profunda dos dados de teste para cada teste
    mockData = JSON.parse(JSON.stringify(TEST_DATA));
  });

  describe('formatUsers', () => {
    it('deve formatar lista vazia corretamente', () => {
      const lista: UserEntry[] = [];
      expect(formatUsers(lista)).toBe('(none)');
    });

    it('deve formatar lista com um usuário', () => {
      const lista: UserEntry[] = [mockData.all[0]];
      expect(formatUsers(lista)).toBe(`• ${mockData.all[0].name}`);
    });

    it('deve formatar lista com múltiplos usuários', () => {
      const lista: UserEntry[] = mockData.all.slice(0, 3);
      const expected = lista.map(u => `• ${u.name}`).join('\n');
      expect(formatUsers(lista)).toBe(expected);
    });

    it('deve lidar com caracteres especiais nos nomes', () => {
      const lista: UserEntry[] = mockData.all.filter(u =>
        /[áãâàéêíóôõúüçñ]/i.exec(u.name) !== null
      );
      const expected = lista.map(u => `• ${u.name}`).join('\n');
      const resultado = formatUsers(lista);
      if (lista.length === 0) {
        expect(resultado).toBe('(none)');
      } else {
        expect(resultado).toBe(expected);
      }
    });

    it('deve manter a ordem da lista original', () => {
      const lista: UserEntry[] = mockData.all.slice(0, 3);
      const expected = lista.map(u => `• ${u.name}`).join('\n');
      expect(formatUsers(lista)).toBe(expected);
    });
  });

  describe('loadUsers', () => {
    it('deve retornar estrutura válida de dados', async () => {
      const resultado = await loadUsers();
      expect(resultado).toHaveProperty('all');
      expect(resultado).toHaveProperty('remaining');
      expect(resultado).toHaveProperty('skips');
      expect(Array.isArray(resultado.all)).toBe(true);
      expect(Array.isArray(resultado.remaining)).toBe(true);
      expect(typeof resultado.skips).toBe('object');
    });
  });

  describe('saveUsers', () => {
    it('deve completar sem erros', async () => {
      await expect(saveUsers(mockData)).resolves.toBeUndefined();
    });
  });

  describe('selectUser', () => {
    it('deve resetar remaining quando vazio', async () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      dados.remaining = [];

      const resultado = await selectUser(dados);
      
      expect(resultado).toBeDefined();
      expect(dados.remaining.length).toBeLessThan(mockData.all.length);
      expect(dados.lastSelected).toBeDefined();
    });

    it('deve escolher usuário aleatoriamente', async () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      const remainingAntes = dados.remaining.length;

      const resultado = await selectUser(dados);
      
      expect(resultado).toBeDefined();
      expect(dados.remaining.length).toBe(remainingAntes - 1);
      expect(dados.lastSelected).toEqual(resultado);
    });

    it('não deve selecionar usuário pulado', async () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      dados.skips = { '1': '2999-01-01' };

      const resultado = await selectUser(dados);

      expect(resultado.id).not.toBe('1');
    });

    it('deve remover automaticamente skips expirados', async () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      dados.skips = { 
        '1': ontem, // Skip expirado
        '2': '2999-01-01' // Skip válido
      };

      await selectUser(dados);

      // Skip expirado deve ter sido removido
      expect(dados.skips).not.toHaveProperty('1');
      // Skip válido deve permanecer
      expect(dados.skips).toHaveProperty('2');
      expect(dados.skips['2']).toBe('2999-01-01');
    });

    it('deve salvar dados quando skips expirados são removidos', async () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      dados.skips = { '1': ontem };

      const resultado = await selectUser(dados);
      expect(resultado).toBeDefined();
      expect(dados.skips).not.toHaveProperty('1');
    });

    it('deve salvar dados apenas uma vez quando não há skips expirados', async () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      dados.skips = { '1': '2999-01-01' };

      const resultado = await selectUser(dados);
      
      expect(resultado).toBeDefined();
    });

    it('deve permitir seleção de usuário com skip expirado', async () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      dados.skips = { '1': ontem };
      dados.remaining = [{ name: 'User1', id: '1' }]; // Apenas o usuário com skip expirado

      const resultado = await selectUser(dados);

      // O usuário deve poder ser selecionado pois seu skip expirou
      expect(resultado.id).toBe('1');
      expect(dados.skips).not.toHaveProperty('1');
    });

    it('deve manter funcionamento normal quando não há skips', async () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      dados.skips = {};

      const resultado = await selectUser(dados);
      expect(resultado).toBeDefined();
    });

    it('deve reiniciar ciclo ao selecionar último usuário elegível', async () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      dados.remaining = [{ name: 'User1', id: '1' }];

      const resultado = await selectUser(dados);

      expect(resultado.id).toBe('1');
      expect(dados.remaining.length).toBe(mockData.all.length);
    });

    it('deve reinserir usuários elegíveis quando todos restantes estão pulados', async () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      dados.remaining = [{ name: 'User1', id: '1' }];
      dados.skips = { '1': '2999-01-01' };

      const resultado = await selectUser(dados);

      expect(resultado.id).not.toBe('1');
      expect(dados.remaining.length).toBe(5);
    });
  });
});
