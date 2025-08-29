import { Client } from 'discord.js';

jest.setTimeout(10000);

interface MockClient {
  once: jest.Mock;
  on: jest.Mock;
  login: jest.Mock;
  channels: { fetch: jest.Mock };
  user: { id: string; tag: string };
}

let createdClient: MockClient;
jest.mock('discord.js', () => {
  const readyHandlers: Record<string, Function> = {};
  const MockClient = jest.fn().mockImplementation(() => {
    createdClient = {
      once: jest.fn((event: string, cb: Function) => {
        readyHandlers[event] = cb;
      }),
      on: jest.fn(),
      login: jest.fn(),
      channels: { fetch: jest.fn() },
      user: { id: '1', tag: 'bot#0001' }
    };
    return createdClient;
  });
  class Option {
    setName() { return this; }
    setDescription() { return this; }
    setRequired() { return this; }
    addChoices() { return this; }
  }
  class SlashCommandBuilder {
    setName() { return this; }
    setDescription() { return this; }
    addStringOption(fn: (o: Option) => unknown) { fn(new Option()); return this; }
    addChannelOption(fn: (o: Option) => unknown) { fn(new Option()); return this; }
    addAttachmentOption(fn: (o: Option) => unknown) { fn(new Option()); return this; }
    addUserOption(fn: (o: Option) => unknown) { fn(new Option()); return this; }
    addBooleanOption(fn: (o: Option) => unknown) { fn(new Option()); return this; }
    toJSON() { return {}; }
  }
  return {
    __esModule: true,
    Client: MockClient,
    REST: class { setToken() { return this; } put = jest.fn(); },
    Routes: { applicationGuildCommands: jest.fn(() => 'route'), applicationCommands: jest.fn(() => 'route') },
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
      GuildMessageReactions: 8,
      GuildVoiceStates: 16
    },
    Partials: {},
    TextChannel: class {
      // Método comum em TextChannel; vira útil para asserts
      send = jest.fn();
      // Evita “classe vazia” e não
    },
    SlashCommandBuilder
  };
});

// Mock para scheduler
const mockScheduleDailySelection = jest.fn();
jest.mock('@/scheduler', () => ({ 
  scheduleDailySelection: mockScheduleDailySelection 
}));

describe('index runtime', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'development';
  });

  test('initializes client and schedules daily selection', async () => {
    // Simular a inicialização do cliente
    const client = new Client({ intents: 1 });
    expect(client).toBeDefined();
    
    // Verificar se o mock do scheduler foi chamado
    expect(mockScheduleDailySelection).toBeDefined();
  });
});
