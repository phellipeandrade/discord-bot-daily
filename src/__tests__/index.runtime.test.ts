import { Client } from 'discord.js';

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
    TextChannel: class {},
    SlashCommandBuilder
  };
});

jest.mock('../scheduler', () => ({ scheduleDailySelection: jest.fn() }));

describe('index runtime', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.unmock('fs');
    process.env.NODE_ENV = 'development';
    process.env.DISCORD_TOKEN = 't';
    process.env.GUILD_ID = 'g';
    process.env.CHANNEL_ID = 'c';
    process.env.MUSIC_CHANNEL_ID = 'm';
  });

  test('initializes client and schedules daily selection', async () => {
    const { scheduleDailySelection } = await import('../scheduler');
    await import('../index');
    expect(createdClient.login).toHaveBeenCalledWith('t');
    const { Client: MockedClient, GatewayIntentBits } = await import('discord.js');
    const clientArgs = (MockedClient as unknown as jest.Mock).mock.calls[0][0];
    expect(clientArgs.intents).toContain(GatewayIntentBits.GuildVoiceStates);

    // trigger ready
    const readyCb = (createdClient.once.mock.calls.find(
      (c: [string, unknown]) => c[0] === 'ready'
    )?.[1] as () => Promise<void>)!;
    await readyCb();
    expect(scheduleDailySelection).toHaveBeenCalledWith(createdClient);
  });
});
