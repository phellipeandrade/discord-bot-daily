import {
  handleRegister,
  handleJoin,
  handleRemove,
  handleList,
  handleSelect,
  handleReset,
  handleReadd,
  handleExport,
  handleImport
} from '../handlers';
import type { UserData } from '../users';
import * as fs from 'fs';
import { ChatInputCommandInteraction, Client } from 'discord.js';

// Mock do i18n
jest.mock('../i18n', () => ({
  i18n: {
    t: jest.fn((key: string, params: Record<string, string | number> = {}) => {
      const text = key;
      return text.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
        const value = params[paramKey];
        return value !== undefined ? String(value) : `{{${paramKey}}}`;
      });
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

jest.mock('../users', () => {
  const actual = jest.requireActual('../users');
  return {
    ...actual,
    saveUsers: (data: UserData) => mockSaveUsers(data),
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

  test('handleSelect readds previous user on same day', async () => {
    const userA = { name: 'A', id: '1' };
    const userB = { name: 'B', id: '2' };
    data.all.push(userA, userB);
    data.remaining.push(userA, userB);
    const today = new Date().toISOString().split('T')[0];
    mockSelectUser.mockResolvedValueOnce(userA);
    const interaction = createInteraction();
    await handleSelect(interaction, data);
    data.lastSelected = userA;
    data.lastSelectionDate = today;
    data.remaining = [userB];
    mockSelectUser.mockResolvedValueOnce(userB);
    await handleSelect(interaction, data);
    expect(data.remaining.some((u) => u.id === '1')).toBe(true);
    const msg = (interaction.reply as jest.Mock).mock.calls[1][0];
    expect(String(msg)).toContain('selection.readded');
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

  test('handleSkipToday sets skip for today', async () => {
    data.all.push({ name: 'A', id: '1' });
    const interaction = createInteraction({ name: 'A' });
    const today = new Date().toISOString().split('T')[0];
    const { handleSkipToday } = await import('../handlers');
    await handleSkipToday(interaction, data);
    expect(data.skips?.['1']).toBe(today);
    expect(mockSaveUsers).toHaveBeenCalled();
  });

  test('handleSkipToday accepts id and mention', async () => {
    data.all.push({ name: 'A', id: '1' });
    const today = new Date().toISOString().split('T')[0];
    const { handleSkipToday } = await import('../handlers');
    await handleSkipToday(createInteraction({ name: '1' }), data);
    expect(data.skips?.['1']).toBe(today);
    await handleSkipToday(createInteraction({ name: '<@1>' }), data);
    expect(data.skips?.['1']).toBe(today);
  });

  test('handleSkipUntil sets future skip', async () => {
    data.all.push({ name: 'A', id: '1' });
    const future = '2099-01-01';
    const interaction = createInteraction({ name: 'A', date: future });
    const { handleSkipUntil } = await import('../handlers');
    await handleSkipUntil(interaction, data);
    expect(data.skips?.['1']).toBe(future);
    expect(mockSaveUsers).toHaveBeenCalled();
  });

  test('handleSkipUntil accepts id and mention', async () => {
    data.all.push({ name: 'A', id: '1' });
    const future = '2099-01-01';
    const { handleSkipUntil } = await import('../handlers');
    await handleSkipUntil(createInteraction({ name: '1', date: future }), data);
    expect(data.skips?.['1']).toBe(future);
    await handleSkipUntil(createInteraction({ name: '<@1>', date: future }), data);
    expect(data.skips?.['1']).toBe(future);
  });

  test('handleSetup writes configuration', async () => {
    jest.resetModules();
    const EventEmitter = (await import('events')).EventEmitter;
    const saveServerConfig = jest.fn();
    const updateServerConfig = jest.fn();
    const scheduleDailySelection = jest.fn();
    jest.doMock('https', () => ({
      get: jest.fn(
        (_url: string, cb: (res: import('http').IncomingMessage) => void) => {
          const res =
            new EventEmitter() as unknown as import('http').IncomingMessage;
          cb(res);
          process.nextTick(() => {
            res.emit('data', Buffer.from('testData'));
            res.emit('end');
          });
          return { on: jest.fn() };
        }
      )
    }));
    jest.doMock('../serverConfig', () => ({
      saveServerConfig,
      loadServerConfig: jest.fn().mockReturnValue({
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
      })
    }));
  jest.doMock('../config', () => ({
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
      updateServerConfig,

    }));
    jest.doMock('../scheduler', () => ({ scheduleDailySelection }));
    const { handleSetup } = await import('../handlers');
    const interaction = {
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
    expect(interaction.reply).toHaveBeenCalled();
    expect(res).toBe(true);
  });


  test('handleSetup validates dateFormat', async () => {
    jest.resetModules();
    const saveServerConfig = jest.fn();
    jest.doMock('../serverConfig', () => ({
      saveServerConfig,
      loadServerConfig: jest.fn().mockReturnValue({
        guildId: 'g',
        channelId: 'c',
        musicChannelId: 'm',
        dailyVoiceChannelId: 'v',
        token: 'tok',
        timezone: 'UTC',
        language: 'en',
        dailyTime: '09:00',
        dailyDays: '1-5',
        holidayCountries: ['BR'],
        dateFormat: 'YYYY-MM-DD'
      })
    }));
    const updateServerConfig = jest.fn();
    jest.doMock('../config', () => ({
      TOKEN: 'tok',
      CHANNEL_ID: 'c',
      MUSIC_CHANNEL_ID: 'm',
      DAILY_VOICE_CHANNEL_ID: 'v',
      TIMEZONE: 'UTC',
      LANGUAGE: 'en',
      DAILY_TIME: '09:00',
      DAILY_DAYS: '1-5',
      HOLIDAY_COUNTRIES: ['BR'],
      DATE_FORMAT: 'YYYY-MM-DD',
      updateServerConfig
    }));
    jest.doMock('../scheduler', () => ({ scheduleDailySelection: jest.fn() }));
    const { handleSetup } = await import('../handlers');
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
    jest.doMock('../serverConfig', () => ({ saveServerConfig }));
    const { handleSetup } = await import('../handlers');
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
    expect(interaction.reply).toHaveBeenCalledWith(expect.any(String));
  });

  test('handleImport saves data and updates config', async () => {
    jest.resetModules();
    const EventEmitter = (await import('events')).EventEmitter;
    const writeFile = jest.fn();
    const saveServerConfig = jest.fn();
    const updateServerConfig = jest.fn();
    const scheduleDailySelection = jest.fn();
    jest.doMock('https', () => ({
      get: jest.fn(
        (_url: string, cb: (res: import('http').IncomingMessage) => void) => {
          const res =
            new EventEmitter() as unknown as import('http').IncomingMessage;
          cb(res);
          process.nextTick(() => {
            res.emit('data', Buffer.from('{}'));
            res.emit('end');
          });
          return { on: jest.fn() };
        }
      )
    }));
    jest.doMock('fs', () => ({
      promises: { writeFile },
      existsSync: jest.fn(),
      readFileSync: jest.fn()
    }));
    jest.doMock('../serverConfig', () => ({
      saveServerConfig,
      loadServerConfig: jest.fn(),
      ServerConfig: {}
    }));
    jest.doMock('../config', () => ({
      USERS_FILE: 'users.json',
      updateServerConfig
    }));
    jest.doMock('../scheduler', () => ({ scheduleDailySelection }));
    const { handleImport } = await import('../handlers');
    const interaction = {
      options: {
        getAttachment: jest
          .fn()
          .mockReturnValueOnce({ name: 'users.json', url: 'u' })
          .mockReturnValueOnce({ name: 'serverConfig.json', url: 'c' })
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
    const EventEmitter = (await import('events')).EventEmitter;
    jest.doMock('https', () => ({
      get: jest.fn(
        (_url: string, cb: (res: import('http').IncomingMessage) => void) => {
          const res =
            new EventEmitter() as unknown as import('http').IncomingMessage;
          cb(res);
          process.nextTick(() => {
            res.emit('data', Buffer.from('{}'));
            res.emit('end');
          });
          return { on: jest.fn() };
        }
      )
    }));
    const { handleImport } = await import('../handlers');
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
    jest.dontMock('../config');
    const interaction = createInteraction();
    const config = await import('../config');
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
    const { handleCheckConfig } = await import('../handlers');
    await handleCheckConfig(interaction);
    expect(interaction.reply).toHaveBeenCalledWith('config.valid');
  });

  test('handleCheckConfig reports missing config', async () => {
    jest.resetModules();
    jest.dontMock('../config');
    const interaction = createInteraction();
    const config = await import('../config');
  config.updateServerConfig({
      guildId: '',
      channelId: '',
      musicChannelId: '',
      dailyVoiceChannelId: '',
      token: '',
      dateFormat: 'YYYY-MM-DD'
    });
    const { handleCheckConfig } = await import('../handlers');
    await handleCheckConfig(interaction);
    expect(interaction.reply).toHaveBeenCalledWith('config.invalid');
  });
});
