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

jest.mock('../i18n', () => ({
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

import { UserEntry, loadUsers, saveUsers, selectUser, formatUsers } from '../index';


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
jest.mock('../i18n', () => ({
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
    it('deve criar arquivo se não existir', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.readFile as jest.Mock).mockResolvedValue('{"all":[],"remaining":[]}');

      const resultado = await loadUsers();
      
      expect(resultado).toEqual({ all: [], remaining: [], skips: {} });
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('deve carregar arquivo existente', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const resultado = await loadUsers();
      
      expect(resultado).toEqual({ ...mockData, skips: {} });
    });
  });

  describe('saveUsers', () => {
    it('deve salvar corretamente os dados dos usuários', async () => {
      await saveUsers(mockData);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(mockData, null, 2),
        'utf-8'
      );
    });

    it('deve manter a estrutura correta dos dados', async () => {
      let savedData!: import('../index').UserData;
      (fs.promises.writeFile as jest.Mock).mockImplementation((file, data) => {
        savedData = JSON.parse(data as string);
      });

      await saveUsers(mockData);

      expect(savedData).toHaveProperty('all');
      expect(savedData).toHaveProperty('remaining');
      expect(Array.isArray(savedData.all)).toBe(true);
      expect(Array.isArray(savedData.remaining)).toBe(true);
      expect(savedData.all[0]).toHaveProperty('name');
      expect(savedData.all[0]).toHaveProperty('id');
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

      await selectUser(dados);

      // Deve ter sido chamado saveUsers duas vezes: uma para limpar skips expirados, outra para salvar seleção
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);
    });

    it('deve salvar dados apenas uma vez quando não há skips expirados', async () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      dados.skips = { '1': '2999-01-01' };

      await selectUser(dados);

      // Deve ter sido chamado saveUsers apenas uma vez para salvar seleção
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
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
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
    });
  });
});
