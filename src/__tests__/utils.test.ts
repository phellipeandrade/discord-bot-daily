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
        'list.empty': '(none)'
      };
      let text = translations[key] || key;
      return text.replace(
        /\{\{(\w+)\}\}/g,
        (_, key) => params[key] ?? `{{${key}}}`
      );
    }),
    getCommandName: jest.fn((command: string) => command),
    getCommandDescription: jest.fn((command: string) => `Command ${command}`),
    getOptionName: jest.fn((command: string, option: string) => option),
    getOptionDescription: jest.fn(
      (command: string, option: string) => `Option ${option}`
    ),
    setLanguage: jest.fn((lang: 'en' | 'pt-br') => {})
  }
}));

import {
  loadUsers,
  saveUsers,
  selectUser,
  type UserData,
  type UserEntry,
  formatUsers
} from '@/index';

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

// Mock do discord.js
jest.mock('discord.js', () => {
  interface OptionMock {
    name: string;
    description: string;
    required: boolean;
    setName(name: string): this;
    setDescription(description: string): this;
    setRequired(required: boolean): this;
    addChoices(...choices: unknown[]): this;
  }

  class MockSlashCommandBuilder {
    private name = '';
    private description = '';
    private readonly options: OptionMock[] = [];

    setName(name: string) {
      this.name = name;
      return this;
    }

    setDescription(description: string) {
      this.description = description;
      return this;
    }

    addStringOption(fn: (option: OptionMock) => OptionMock) {
      const option: OptionMock = {
        name: '',
        description: '',
        required: false,
        setName(name: string) {
          this.name = name;
          return this;
        },
        setDescription(description: string) {
          this.description = description;
          return this;
        },
        setRequired(required: boolean) {
          this.required = required;
          return this;
        },
        addChoices(..._choices: unknown[]) {
          return this;
        }
      };
      this.options.push(fn(option));
      return this;
    }

    addBooleanOption(fn: (option: OptionMock) => OptionMock) {
      return this.addStringOption(fn);
    }

    addAttachmentOption(fn: (option: OptionMock) => OptionMock) {
      return this.addStringOption(fn);
    }

    addChannelOption(fn: (option: OptionMock) => OptionMock) {
      return this.addStringOption(fn);
    }

    addUserOption(fn: (option: OptionMock) => OptionMock) {
      return this.addStringOption(fn);
    }

    toJSON() {
      return {
        name: this.name,
        description: this.description,
        options: this.options
      };
    }
  }

  return {
    Client: jest.fn(),
    TextChannel: jest.fn(),
    Message: jest.fn(),
    MessageReaction: jest.fn(),
    Collection: jest.fn(),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
      GuildMessageReactions: 8,
      GuildVoiceStates: 16
    },
    Partials: {
      Message: 'Message',
      Channel: 'Channel',
      Reaction: 'Reaction'
    },
    ActionRowBuilder: jest.fn(),
    ButtonBuilder: jest.fn(),
    ButtonStyle: {
      Link: 5
    },
    SlashCommandBuilder: MockSlashCommandBuilder
  };
});

// Mock do i18n
jest.mock('@/i18n', () => ({
  i18n: {
    t: jest.fn((key: string, params: Record<string, string> = {}) => {
      const translations: Record<string, string> = {
        'list.empty': '(none)'
      };

      let text = translations[key] || key;
      return text.replace(
        /\{\{(\w+)\}\}/g,
        (_, key) => params[key] ?? `{{${key}}}`
      );
    }),
    getCommandName: jest.fn((command: string) => command),
    getCommandDescription: jest.fn((command: string) => `Command ${command}`),
    getOptionName: jest.fn((command: string, option: string) => option),
    getOptionDescription: jest.fn(
      (command: string, option: string) => `Option ${option}`
    ),
    setLanguage: jest.fn((lang: 'en' | 'pt-br') => {})
  }
}));

// Dados de teste fixos
const TEST_DATA: UserData = {
  all: [
    { name: 'User1', id: '1' },
    { name: 'User2', id: '2' },
    { name: 'User3', id: '3' },
    { name: 'User4', id: '4' },
    { name: 'User5', id: '5' },
    { name: 'User6', id: '6' },
    { name: 'User7', id: '7' }
  ],
  remaining: [
    { name: 'User1', id: '1' },
    { name: 'User2', id: '2' },
    { name: 'User3', id: '3' },
    { name: 'User4', id: '4' },
    { name: 'User5', id: '5' },
    { name: 'User6', id: '6' },
    { name: 'User7', id: '7' }
  ],
  lastSelected: undefined
};

describe('Funções Utilitárias', () => {
  let mockData: UserData;

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
      const expected = lista.map((u) => `• ${u.name}`).join('\n');
      expect(formatUsers(lista)).toBe(expected);
    });

    it('deve lidar com caracteres especiais nos nomes', () => {
      const lista: UserEntry[] = mockData.all.filter(
        (u) => /[áãâàéêíóôõúüçñ]/i.exec(u.name) !== null
      );
      const expected = lista.map((u) => `• ${u.name}`).join('\n');
      const resultado = formatUsers(lista);
      if (lista.length === 0) {
        expect(resultado).toBe('(none)');
      } else {
        expect(resultado).toBe(expected);
      }
    });

    it('deve manter a ordem da lista original', () => {
      const lista: UserEntry[] = mockData.all.slice(0, 3);
      const expected = lista.map((u) => `• ${u.name}`).join('\n');
      expect(formatUsers(lista)).toBe(expected);
    });
  });

  describe('loadUsers', () => {
    it('deve criar arquivo se não existir', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(
        '{"all":[],"remaining":[]}'
      );

      const resultado = await loadUsers();

      expect(resultado).toEqual({ all: [], remaining: [], skips: {} });
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('deve carregar arquivo existente', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockData)
      );

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
      let savedData!: import('@/index').UserData;
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
  });
});
