import * as fs from 'fs';
import { ChatInputCommandInteraction, Client } from 'discord.js';
import {
  handleRegister,
  handleJoin,
  handleRemove,
  handleList,
  handleSelect,
  handleReset,
  handleReadd,
  handleSkipToday,
  handleSkipUntil,
  handleSubstitute,
  handleSetup,
  handleExport,
  handleImport,
  handleCheckConfig
} from '@/handlers';
import { UserData } from '@/users';

jest.mock('@/i18n', () => ({
  i18n: {
    t: jest.fn((key: string, params: Record<string, string> = {}) => {
      const translations: Record<string, string> = {
    'selection.readded': 'selection.readded',
    'selection.alreadySelectedToday': 'selection.alreadySelectedToday',
    'selection.substituted': 'selection.substituted',
    'selection.noCurrentSelection': 'selection.noCurrentSelection',
    'selection.substituteNotInRemaining': 'selection.substituteNotInRemaining',
    'setup.invalidDateFormat': 'setup.invalidDateFormat',
    'setup.savedDetailed': 'setup.savedDetailed',
    'setup.savedNoChanges': 'setup.savedNoChanges',
    'config.valid': 'config.valid',
    'config.invalid': 'config.invalid'
      };
      return translations[key] || key;
    }),
    getCommandName: jest.fn((c: string) => c),
    getCommandDescription: jest.fn(() => ''),
    getOptionName: jest.fn((_cmd: string, opt: string) => opt),
    getOptionDescription: jest.fn(() => '')
  }
}));

// Mock das funções
const mockSaveUsers = jest.fn();
const mockSelectUser = jest.fn();
const mockFormatUsers = jest.fn(
  (users: Array<{ name: string; id: string }>) =>
    users.map((u: { name: string; id: string }) => u.name).join(', ') ||
    '(none)'
);

jest.mock('@/users', () => {
  const actual = jest.requireActual('@/users');
  return {
    ...actual,
    saveUsers: jest.fn().mockImplementation(async (data: UserData) => {
      mockSaveUsers(data);
    }),
    selectUser: (data: UserData) => mockSelectUser(data),
    formatUsers: (users: Array<{ name: string; id: string }>) =>
      mockFormatUsers(users)
  };
});

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

interface MockInteractionOptions {
  [key: string]: string | undefined;
}

function createInteraction(options: MockInteractionOptions = {}) {
  return {
    options: {
      getString: jest.fn().mockImplementation((n: string) => options[n]),
      getBoolean: jest.fn().mockImplementation((n: string) => options[n])
    },
    user: { id: '10', username: 'tester' },
    reply: jest.fn()
  } as unknown as ChatInputCommandInteraction;
}

// Helper functions para reduzir aninhamento
function createMockHttpsModule() {
  return {
    get: jest.fn((url: string, cb: (res: any) => void) => {
      const EventEmitter = require('events').EventEmitter;
      const res = new EventEmitter();
      cb(res);
      process.nextTick(() => {
        res.emit('data', Buffer.from(url.includes('config') ? '{}' : 'testData'));
        res.emit('end');
      });
      return { on: jest.fn() };
    })
  };
}

function setupBasicMocks() {
  const saveServerConfig = jest.fn();
  const updateServerConfig = jest.fn();
  const scheduleDailySelection = jest.fn();
  
  return {
    saveServerConfig,
    updateServerConfig,
    scheduleDailySelection
  };
}

function createMockServerConfig() {
  return {
    guildId: 'guild',
    channelId: 'old',
    musicChannelId: 'music',
    dailyVoiceChannelId: 'voice',
    token: 'tok',
    timezone: 'America/Sao_Paulo',
    language: 'en',
    dailyTime: '09:00',
    dailyDays: '1-5',
    holidayCountries: ['BR'],
    dateFormat: 'YYYY-MM-DD',
    admins: []
  };
}

function createMockConfig(updateServerConfig: jest.Mock) {
  return {
    TOKEN: 'tok',
    CHANNEL_ID: 'old',
    MUSIC_CHANNEL_ID: 'music',
    DAILY_VOICE_CHANNEL_ID: 'voice',
    TIMEZONE: 'America/Sao_Paulo',
    LANGUAGE: 'en',
    DAILY_TIME: '09:00',
    DAILY_DAYS: '1-5',
    HOLIDAY_COUNTRIES: ['BR'],
    DATE_FORMAT: 'YYYY-MM-DD',
    updateServerConfig
  };
}

function createMockInteractionForSetup() {
  return {
    guildId: 'guild',
    options: {
      getChannel: jest
        .fn()
        .mockReturnValueOnce({ id: 'newDaily' })
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null),
      getString: jest.fn((name: string) => {
        if (name === 'timezone') return 'UTC';
        if (name === 'guild') return 'newGuild';
        return null;
      }),
      getAttachment: jest.fn(() => null),
      getBoolean: jest.fn()
    },
    reply: jest.fn(),
    client: {} as Client
  } as unknown as ChatInputCommandInteraction;
}

describe('handlers', () => {
  let data: UserData;

  beforeEach(() => {
    jest.clearAllMocks();
    data = { all: [], remaining: [] };
  });

  test('handleRegister adds new user', async () => {
    const interaction = createInteraction({ name: 'Tester' });
    await handleRegister(interaction, data);
    expect(data.all.length).toBe(1);
    expect(mockSaveUsers).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalled();
  });

  test('handleJoin self registers', async () => {
    const interaction = createInteraction();
    await handleJoin(interaction, data);
    expect(data.all[0].id).toBe('10');
    expect(mockSaveUsers).toHaveBeenCalled();
  });

  test('handleRemove removes user', async () => {
    data.all.push({ name: 'Tester', id: '10' });
    data.remaining.push({ name: 'Tester', id: '10' });
    const interaction = createInteraction({ name: 'Tester' });
    await handleRemove(interaction, data);
    expect(data.all.length).toBe(0);
    expect(mockSaveUsers).toHaveBeenCalled();
  });

  test('handleRemove accepts id and mention', async () => {
    data.all.push({ name: 'Tester', id: '10' });
    data.remaining.push({ name: 'Tester', id: '10' });
    await handleRemove(createInteraction({ name: '10' }), data);
    expect(data.all.length).toBe(0);
    data.all.push({ name: 'Other', id: '20' });
    data.remaining.push({ name: 'Other', id: '20' });
    await handleRemove(createInteraction({ name: '<@20>' }), data);
    expect(data.all.length).toBe(0);
  });

  test('handleRemove removes orphaned skips', async () => {
    data.all.push({ name: 'Tester', id: '10' });
    data.remaining.push({ name: 'Tester', id: '10' });
    data.skips = { '10': '2999-01-01', '20': '2999-01-01' };
    
    const interaction = createInteraction({ name: 'Tester' });
    await handleRemove(interaction, data);
    
    expect(data.all.length).toBe(0);
    expect(data.skips).not.toHaveProperty('10'); // Skip do usuário removido deve ter sido removido
    expect(data.skips).toHaveProperty('20'); // Skip de outro usuário deve permanecer
    expect(mockSaveUsers).toHaveBeenCalled();
  });

  test('handleRemove works when user has no skip', async () => {
    data.all.push({ name: 'Tester', id: '10' });
    data.remaining.push({ name: 'Tester', id: '10' });
    data.skips = { '20': '2999-01-01' }; // Apenas skip de outro usuário
    
    const interaction = createInteraction({ name: 'Tester' });
    await handleRemove(interaction, data);
    
    expect(data.all.length).toBe(0);
    expect(data.skips).toHaveProperty('20'); // Skip de outro usuário deve permanecer
    expect(mockSaveUsers).toHaveBeenCalled();
  });

  test('handleRemove works when skips object is undefined', async () => {
    data.all.push({ name: 'Tester', id: '10' });
    data.remaining.push({ name: 'Tester', id: '10' });
    // data.skips não definido
    
    const interaction = createInteraction({ name: 'Tester' });
    await handleRemove(interaction, data);
    
    expect(data.all.length).toBe(0);
    expect(mockSaveUsers).toHaveBeenCalled();
  });

  test('handleList replies with formatted lists', async () => {
    data.all.push({ name: 'A', id: '1' });
    const interaction = createInteraction();
    await handleList(interaction, data);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.any(String),
      flags: expect.any(Number)
    });
  });

  test('handleSelect selects user', async () => {
    const selectedUser = { name: 'A', id: '1' };
    mockSelectUser.mockResolvedValue(selectedUser);
    const interaction = createInteraction();
    await handleSelect(interaction, data);
    expect(mockSelectUser).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalled();
  });

  test('handleSelect returns existing selection when it already happened today', async () => {
    const userA = { name: 'A', id: '1' };
    const { AlreadySelectedTodayError } = await import('@/users');
    mockSelectUser.mockRejectedValue(new AlreadySelectedTodayError(userA));
    const interaction = createInteraction();

    await handleSelect(interaction, data);

    expect(mockSelectUser).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith(
      'selection.alreadySelectedToday'
    );
  });

  test('handleReset loads original file', async () => {
    (mockFs.promises.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({ all: [] })
    );
    const interaction = createInteraction();
    await handleReset(interaction, data);
    expect(mockSaveUsers).toHaveBeenCalled();
  });

  test('handleReadd restores user', async () => {
    data.all.push({ name: 'A', id: '1' });
    const interaction = createInteraction({ name: 'A' });
    await handleReadd(interaction, data);
    expect(data.remaining.length).toBe(1);
    expect(mockSaveUsers).toHaveBeenCalled();
  });

  test('handleReadd accepts id and mention', async () => {
    data.all.push({ name: 'B', id: '2' });
    await handleReadd(createInteraction({ name: '2' }), data);
    expect(data.remaining.length).toBe(1);
    data.remaining = [];
    await handleReadd(createInteraction({ name: '<@2>' }), data);
    expect(data.remaining.length).toBe(1);
  });

  test('handleReadd adds user to retry list', async () => {
    data.all.push({ name: 'A', id: '1' });
    const interaction = createInteraction({ name: 'A' });
    await handleReadd(interaction, data);
    expect(data.remaining.length).toBe(1);
    expect(data.retryUsers).toEqual(['1']);
    expect(mockSaveUsers).toHaveBeenCalled();
  });

  test('handleReadd does not duplicate retry users', async () => {
    data.all.push({ name: 'A', id: '1' });
    data.retryUsers = ['1'];
    const interaction = createInteraction({ name: 'A' });
    await handleReadd(interaction, data);
    expect(data.retryUsers).toEqual(['1']); // Should not duplicate
  });

  test('handleSkipToday sets skip for today', async () => {
    data.all.push({ name: 'A', id: '1' });
    const interaction = createInteraction({ name: 'A' });
    const today = new Date().toISOString().split('T')[0];
    const { handleSkipToday } = await import('@/handlers');
    await handleSkipToday(interaction, data);
    expect(data.skips?.['1']).toBe(today);
    expect(mockSaveUsers).toHaveBeenCalled();
  });

  test('handleSkipToday accepts id and mention', async () => {
    data.all.push({ name: 'A', id: '1' });
    const today = new Date().toISOString().split('T')[0];
    const { handleSkipToday } = await import('@/handlers');
    await handleSkipToday(createInteraction({ name: '1' }), data);
    expect(data.skips?.['1']).toBe(today);
    await handleSkipToday(createInteraction({ name: '<@1>' }), data);
    expect(data.skips?.['1']).toBe(today);
  });

  test('handleSkipUntil sets future skip', async () => {
    data.all.push({ name: 'A', id: '1' });
    jest.resetModules();
    jest.doMock('@/config', () => ({ DATE_FORMAT: 'YYYY-MM-DD' }));
    const future = '2099-01-01';
    const interaction = createInteraction({ name: 'A', date: future });
    const { handleSkipUntil } = await import('@/handlers');
    await handleSkipUntil(interaction, data);
    expect(data.skips?.['1']).toBe(future);
    expect(mockSaveUsers).toHaveBeenCalled();
  });

  test('handleSkipUntil accepts id and mention', async () => {
    data.all.push({ name: 'A', id: '1' });
    jest.resetModules();
    jest.doMock('@/config', () => ({ DATE_FORMAT: 'YYYY-MM-DD' }));
    const future = '2099-01-01';
    const { handleSkipUntil } = await import('@/handlers');
    await handleSkipUntil(createInteraction({ name: '1', date: future }), data);
    expect(data.skips?.['1']).toBe(future);
    await handleSkipUntil(createInteraction({ name: '<@1>', date: future }), data);
    expect(data.skips?.['1']).toBe(future);
  });

  test('handleSetup writes configuration', async () => {
    jest.resetModules();
    const { saveServerConfig, updateServerConfig, scheduleDailySelection } = setupBasicMocks();
    
    jest.doMock('https', () => createMockHttpsModule());
    jest.doMock('@/serverConfig', () => ({
      saveServerConfig,
      loadServerConfig: jest.fn().mockReturnValue(createMockServerConfig())
    }));
    jest.doMock('@/config', () => createMockConfig(updateServerConfig));
    jest.doMock('@/scheduler', () => ({ scheduleDailySelection }));
    
    const { handleSetup } = await import('@/handlers');
    const interaction = createMockInteractionForSetup();
    const res = await handleSetup(interaction);
    
    expect(saveServerConfig).toHaveBeenCalledWith({
      guildId: 'newGuild',
      channelId: 'newDaily',
      musicChannelId: 'music',
      dailyVoiceChannelId: 'voice',
      token: 'tok',
      timezone: 'UTC',
      language: 'en',
      dailyTime: '09:00',
      dailyDays: '1-5',
      holidayCountries: ['BR'],
      dateFormat: 'YYYY-MM-DD',
      admins: []
    });
    expect(updateServerConfig).toHaveBeenCalled();
    expect(scheduleDailySelection).toHaveBeenCalledWith(interaction.client);
    expect(interaction.reply).toHaveBeenCalledWith('setup.savedDetailed');
    expect(res).toBe(true);
  });

  test('handleSetup validates dateFormat', async () => {
    jest.resetModules();
    const saveServerConfig = jest.fn();
    const updateServerConfig = jest.fn();
    
    jest.doMock('@/serverConfig', () => ({
      saveServerConfig,
      loadServerConfig: jest.fn().mockReturnValue(createMockServerConfig())
    }));
    jest.doMock('@/config', () => createMockConfig(updateServerConfig));
    jest.doMock('@/scheduler', () => ({ scheduleDailySelection: jest.fn() }));
    
    const { handleSetup } = await import('@/handlers');
    const interaction = {
      guildId: 'g',
      options: {
        getChannel: jest.fn(),
        getString: jest.fn((n: string) => (n === 'dateFormat' ? 'bad' : null)),
        getAttachment: jest.fn(() => null),
        getBoolean: jest.fn()
      },
      reply: jest.fn(),
      client: {} as Client
    } as unknown as ChatInputCommandInteraction;
    
    await handleSetup(interaction);
    expect(saveServerConfig).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith('setup.invalidDateFormat');
  });

  test('handleSetup ignores missing guildId', async () => {
    jest.resetModules();
    const saveServerConfig = jest.fn();
    jest.doMock('@/serverConfig', () => ({ saveServerConfig }));
    const { handleSetup } = await import('@/handlers');
    const interaction = {
      guildId: undefined,
      options: { getChannel: jest.fn(), getString: jest.fn(), getAttachment: jest.fn() },
      reply: jest.fn()
    } as unknown as ChatInputCommandInteraction;
    await handleSetup(interaction);
    expect(saveServerConfig).not.toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  test('handleExport attaches files when present', async () => {
    mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(true);
    const interaction = createInteraction();
    await handleExport(interaction);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.any(String),
      files: expect.any(Array)
    });
  });

  test('handleExport reports missing files', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const interaction = createInteraction();
    await handleExport(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.any(String)
    }));
  });

  test('handleImport saves data and updates config', async () => {
    jest.resetModules();
    const writeFile = jest.fn();
    const saveServerConfig = jest.fn();
    const updateServerConfig = jest.fn();
    const scheduleDailySelection = jest.fn();
    
    jest.doMock('https', () => ({
      get: jest.fn((url: string, cb: (res: any) => void) => {
        const EventEmitter = require('events').EventEmitter;
        const res = new EventEmitter();
        cb(res);
        process.nextTick(() => {
          // Retorna JSON válido para ambos os arquivos
          const data = url.includes('serverConfig') 
            ? JSON.stringify({ guildId: 'test', channelId: 'test' })
            : JSON.stringify({ all: [], remaining: [] });
          res.emit('data', Buffer.from(data));
          res.emit('end');
        });
        return { on: jest.fn() };
      })
    }));
    jest.doMock('fs', () => ({
      promises: { writeFile },
      existsSync: jest.fn(),
      readFileSync: jest.fn()
    }));
    jest.doMock('@/serverConfig', () => ({
      saveServerConfig,
      loadServerConfig: jest.fn(),
      ServerConfig: {}
    }));
    jest.doMock('@/config', () => ({
      updateServerConfig
    }));
    jest.doMock('@/scheduler', () => ({ scheduleDailySelection }));
    
    const { handleImport } = await import('@/handlers');
    const interaction = {
      options: {
        getAttachment: jest
          .fn()
          .mockReturnValueOnce({ name: 'serverConfig.json', url: 'serverConfig' })
      },
      reply: jest.fn(),
      client: {} as Client
    } as unknown as ChatInputCommandInteraction;
    
    await handleImport(interaction);
    expect(writeFile).toHaveBeenCalled();
    expect(saveServerConfig).toHaveBeenCalled();
    expect(updateServerConfig).toHaveBeenCalled();
    expect(scheduleDailySelection).toHaveBeenCalledWith(interaction.client);
    expect(interaction.reply).toHaveBeenCalled();
  });

  test('handleImport validates file type', async () => {
    jest.resetModules();
    jest.doMock('https', () => createMockHttpsModule());
    
    const { handleImport } = await import('@/handlers');
    const interaction = {
      options: {
        getAttachment: jest
          .fn()
          .mockReturnValueOnce({ name: 'bad.txt', url: 'u' })
          .mockReturnValueOnce(null)
      },
      reply: jest.fn(),
      client: {} as Client
    } as unknown as ChatInputCommandInteraction;
    
    await handleImport(interaction);
    expect(interaction.reply).toHaveBeenCalled();
  });

  test('handleCheckConfig reports valid config', async () => {
    jest.resetModules();
    jest.dontMock('@/config');
    const interaction = createInteraction();
    const config = await import('@/config');
    config.updateServerConfig({
      guildId: 'g',
      channelId: 'c',
      musicChannelId: 'm',
      dailyVoiceChannelId: 'v',
      token: 't',
      timezone: 'UTC',
      language: 'en',
      dailyTime: '09:00',
      dailyDays: '1-5',
      holidayCountries: ['BR'],
      dateFormat: 'YYYY-MM-DD'
    });
    const { handleCheckConfig } = await import('@/handlers');
    await handleCheckConfig(interaction);
    expect(interaction.reply).toHaveBeenCalledWith('config.valid');
  });

  test('handleCheckConfig reports missing config', async () => {
    jest.resetModules();
    jest.dontMock('@/config');
    const interaction = createInteraction();
    const config = await import('@/config');
    config.updateServerConfig({
      guildId: '',
      channelId: '',
      musicChannelId: '',
      dailyVoiceChannelId: '',
      token: '',
      dateFormat: 'YYYY-MM-DD'
    });
    const { handleCheckConfig } = await import('@/handlers');
    await handleCheckConfig(interaction);
    expect(interaction.reply).toHaveBeenCalledWith('config.invalid');
  });

  test('handleDisable stores infinite date', async () => {
    jest.resetModules();
    const saveServerConfig = jest.fn();
    const updateServerConfig = jest.fn();
    jest.doMock('@/serverConfig', () => ({
      saveServerConfig,
      loadServerConfig: jest.fn()
    }));
    jest.doMock('@/config', () => ({
      CHANNEL_ID: 'c',
      MUSIC_CHANNEL_ID: 'm',
      DATE_FORMAT: 'YYYY-MM-DD',
      updateServerConfig
    }));
    const { handleDisable } = await import('@/handlers');
    const interaction = {
      guildId: 'g',
      options: { getString: jest.fn() },
      reply: jest.fn()
    } as unknown as ChatInputCommandInteraction;
    await handleDisable(interaction);
    expect(saveServerConfig).toHaveBeenCalledWith({
      guildId: 'g',
      channelId: 'c',
      musicChannelId: 'm',
      disabledUntil: '9999-12-31'
    });
    expect(interaction.reply).toHaveBeenCalledWith('bot.disabled');
  });

  test('handleDisableUntil validates date', async () => {
    jest.resetModules();
    const saveServerConfig = jest.fn();
    jest.doMock('@/serverConfig', () => ({
      saveServerConfig,
      loadServerConfig: jest.fn()
    }));
    jest.doMock('@/config', () => ({
      CHANNEL_ID: 'c',
      MUSIC_CHANNEL_ID: 'm',
      DATE_FORMAT: 'YYYY-MM-DD',
      updateServerConfig: jest.fn()
    }));
    const { handleDisableUntil } = await import('@/handlers');
    const interaction = {
      guildId: 'g',
      options: { getString: jest.fn(() => 'bad') },
      reply: jest.fn()
    } as unknown as ChatInputCommandInteraction;
    await handleDisableUntil(interaction);
    expect(saveServerConfig).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith('selection.invalidDate');
  });

  test('handleDisableUntil stores date', async () => {
    jest.resetModules();
    const saveServerConfig = jest.fn();
    const updateServerConfig = jest.fn();
    jest.doMock('@/serverConfig', () => ({
      saveServerConfig,
      loadServerConfig: jest.fn()
    }));
    jest.doMock('@/config', () => ({
      CHANNEL_ID: 'c',
      MUSIC_CHANNEL_ID: 'm',
      DATE_FORMAT: 'YYYY-MM-DD',
      updateServerConfig
    }));
    const { handleDisableUntil } = await import('@/handlers');
    const interaction = {
      guildId: 'g',
      options: { getString: jest.fn(() => '2099-12-31') },
      reply: jest.fn()
    } as unknown as ChatInputCommandInteraction;
    await handleDisableUntil(interaction);
    expect(saveServerConfig).toHaveBeenCalledWith({
      guildId: 'g',
      channelId: 'c',
      musicChannelId: 'm',
      disabledUntil: '2099-12-31'
    });
    expect(interaction.reply).toHaveBeenCalledWith('bot.disabledUntil');
  });
});

describe('handleSetup refactored functions', () => {
  test('getDefaultServerConfig returns correct default config', () => {
    const { getDefaultServerConfig } = require('../handlers');
    const config = getDefaultServerConfig('test-guild-id');
    
    expect(config.guildId).toBe('test-guild-id');
    expect(config.channelId).toBeDefined();
    expect(config.musicChannelId).toBeDefined();
    expect(config.dailyVoiceChannelId).toBeDefined();
    expect(config.admins).toEqual([]);
  });

  test('extractSetupOptions extracts all options correctly', () => {
    const { extractSetupOptions } = require('../handlers');
    const mockInteraction = {
      options: {
        getChannel: jest.fn().mockReturnValue({ id: 'channel-123' }),
        getString: jest.fn().mockReturnValue('test-value')
      }
    };
    
    const options = extractSetupOptions(mockInteraction);
    
    expect(options.daily).toEqual({ id: 'channel-123' });
    expect(options.music).toEqual({ id: 'channel-123' });
    expect(options.voice).toEqual({ id: 'channel-123' });
    expect(options.playerCmd).toBe('test-value');
    expect(options.token).toBe('test-value');
  });

  test('buildServerConfig merges options with existing config', () => {
    const { buildServerConfig } = require('../handlers');
    const existing = {
      guildId: 'existing-guild',
      channelId: 'existing-channel',
      musicChannelId: 'existing-music',
      dailyVoiceChannelId: 'existing-voice',
      playerForwardCommand: 'existing-player',
      token: 'existing-token',
      timezone: 'existing-tz',
      language: 'existing-lang',
      dailyTime: 'existing-time',
      dailyDays: 'existing-days',
      holidayCountries: ['BR'],
      dateFormat: 'existing-format',
      admins: ['admin1']
    };
    
    const options = {
      daily: { id: 'new-daily' },
      music: { id: 'new-music' },
      voice: { id: 'new-voice' },
      playerCmd: 'new-player',
      token: 'new-token',
      timezone: 'new-tz',
      language: 'new-lang',
      dailyTime: 'new-time',
      dailyDays: 'new-days',
      holidays: 'US,CA',
      dateFormat: 'new-format'
    };
    
    const config = buildServerConfig(existing, options, 'new-guild');
    
    expect(config.guildId).toBe('new-guild');
    expect(config.channelId).toBe('new-daily');
    expect(config.musicChannelId).toBe('new-music');
    expect(config.dailyVoiceChannelId).toBe('new-voice');
    expect(config.playerForwardCommand).toBe('new-player');
    expect(config.token).toBe('new-token');
    expect(config.timezone).toBe('new-tz');
    expect(config.language).toBe('new-lang');
    expect(config.dailyTime).toBe('new-time');
    expect(config.dailyDays).toBe('new-days');
    expect(config.holidayCountries).toEqual(['US', 'CA']);
    expect(config.dateFormat).toBe('new-format');
    expect(config.admins).toEqual(['admin1']);
  });

  test('detectChanges identifies changed fields', () => {
    const { detectChanges } = require('../handlers');
    const existing = {
      channelId: 'old-channel',
      musicChannelId: 'old-music',
      dailyVoiceChannelId: 'old-voice',
      playerForwardCommand: 'old-player',
      token: 'old-token',
      guildId: 'old-guild',
      timezone: 'old-tz',
      language: 'old-lang',
      dailyTime: 'old-time',
      dailyDays: 'old-days',
      holidayCountries: ['BR'],
      dateFormat: 'old-format'
    };
    
    const cfg = {
      ...existing,
      channelId: 'new-channel',
      language: 'new-lang',
      holidayCountries: ['US']
    };
    
    const changes = detectChanges(cfg, existing);
    
    expect(changes).toContain('daily');
    expect(changes).toContain('language');
    expect(changes).toContain('holidayCountries');
    expect(changes).not.toContain('musicChannelId');
  });

  describe('handleSubstitute', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.doMock('@/date', () => ({
        todayISO: jest.fn(() => '2024-01-15')
      }));
      mockSaveUsers.mockClear();
    });

    test('substitutes current selected person with another person', async () => {
      const today = '2024-01-15';
      const data: UserData = {
        all: [
          { name: 'Original', id: '1' },
          { name: 'Substitute', id: '2' }
        ],
        remaining: [
          { name: 'Substitute', id: '2' }
        ],
        lastSelected: { name: 'Original', id: '1' },
        lastSelectionDate: today
      };

      const interaction = createInteraction({ substitute: 'Substitute' });
      const { handleSubstitute } = await import('@/handlers');
      
      await handleSubstitute(interaction, data);

      expect(data.lastSelected).toEqual({ name: 'Substitute', id: '2' });
      expect(data.remaining).toHaveLength(1);
      expect(data.remaining[0]).toEqual({ name: 'Original', id: '1' });
      expect(mockSaveUsers).toHaveBeenCalledWith(data);
      expect(interaction.reply).toHaveBeenCalledWith('selection.substituted');
    });

    test('fails when no one is currently selected', async () => {
      const data: UserData = {
        all: [
          { name: 'Original', id: '1' },
          { name: 'Substitute', id: '2' }
        ],
        remaining: [
          { name: 'Substitute', id: '2' }
        ]
      };

      const interaction = createInteraction({ substitute: 'Substitute' });
      const { handleSubstitute } = await import('@/handlers');
      
      await handleSubstitute(interaction, data);

      expect(interaction.reply).toHaveBeenCalledWith('selection.noCurrentSelection');
      expect(mockSaveUsers).not.toHaveBeenCalled();
    });

    test('fails when substitute user is not found', async () => {
      const today = '2024-01-15';
      const data: UserData = {
        all: [
          { name: 'Original', id: '1' }
        ],
        remaining: [],
        lastSelected: { name: 'Original', id: '1' },
        lastSelectionDate: today
      };

      const interaction = createInteraction({ substitute: 'NonExistent' });
      const { handleSubstitute } = await import('@/handlers');
      
      await handleSubstitute(interaction, data);

      expect(interaction.reply).toHaveBeenCalledWith('user.notFound');
      expect(mockSaveUsers).not.toHaveBeenCalled();
    });

    test('fails when substitute user is not in remaining list', async () => {
      const today = '2024-01-15';
      const data: UserData = {
        all: [
          { name: 'Original', id: '1' },
          { name: 'Substitute', id: '2' }
        ],
        remaining: [],
        lastSelected: { name: 'Original', id: '1' },
        lastSelectionDate: today
      };

      const interaction = createInteraction({ substitute: 'Substitute' });
      const { handleSubstitute } = await import('@/handlers');
      
      await handleSubstitute(interaction, data);

      expect(interaction.reply).toHaveBeenCalledWith('selection.substituteNotInRemaining');
      expect(mockSaveUsers).not.toHaveBeenCalled();
    });

    test('accepts user id and mention for substitute', async () => {
      const today = '2024-01-15';
      const data: UserData = {
        all: [
          { name: 'Original', id: '1' },
          { name: 'Substitute', id: '2' }
        ],
        remaining: [
          { name: 'Substitute', id: '2' }
        ],
        lastSelected: { name: 'Original', id: '1' },
        lastSelectionDate: today
      };

      const { handleSubstitute } = await import('@/handlers');
      
      // Test with user ID
      await handleSubstitute(createInteraction({ substitute: '2' }), data);
      expect(data.lastSelected?.id).toBe('2');
      
      // Reset for next test
      data.lastSelected = { name: 'Original', id: '1' };
      data.remaining = [{ name: 'Substitute', id: '2' }];
      
      // Test with mention
      await handleSubstitute(createInteraction({ substitute: '<@2>' }), data);
      expect(data.lastSelected?.id).toBe('2');
    });
  });
});
