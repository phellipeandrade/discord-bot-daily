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

jest.mock('../users', () => ({
  saveUsers: (data: UserData) => mockSaveUsers(data),
  selectUser: (data: UserData) => mockSelectUser(data),
  formatUsers: (users: Array<{ name: string; id: string }>) =>
    mockFormatUsers(users)
}));

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

interface MockInteractionOptions {
  [key: string]: string | undefined;
}

function createInteraction(options: MockInteractionOptions = {}) {
  return {
    options: {
      getString: jest.fn().mockImplementation((n: string) => options[n])
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

  test('handleSkipToday sets skip for today', async () => {
    data.all.push({ name: 'A', id: '1' });
    const interaction = createInteraction({ name: 'A' });
    const today = new Date().toISOString().split('T')[0];
    const { handleSkipToday } = await import('../handlers');
    await handleSkipToday(interaction, data);
    expect(data.skips?.['1']).toBe(today);
    expect(mockSaveUsers).toHaveBeenCalled();
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

  test('handleSetup writes configuration', async () => {
    jest.resetModules();
    const saveServerConfig = jest.fn();
    const updateServerConfig = jest.fn();
    const scheduleDailySelection = jest.fn();
    jest.doMock('../serverConfig', () => ({
      saveServerConfig,
      loadServerConfig: jest.fn().mockReturnValue({
        guildId: 'guild',
        channelId: 'old',
        musicChannelId: 'music',
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
      TIMEZONE: 'America/Sao_Paulo',
      LANGUAGE: 'en',
      DAILY_TIME: '09:00',
      DAILY_DAYS: '1-5',
      HOLIDAY_COUNTRIES: ['BR'],
      DATE_FORMAT: 'YYYY-MM-DD',
      updateServerConfig
    }));
    jest.doMock('../scheduler', () => ({ scheduleDailySelection }));
    const { handleSetup } = await import('../handlers');
    const interaction = {
      guildId: 'guild',
      options: {
        getChannel: jest
          .fn()
          .mockReturnValueOnce({ id: 'newDaily' })
          .mockReturnValueOnce(null),
        getString: jest.fn((name: string) =>
          name === 'timezone' ? 'UTC' : null
        )
      },
      reply: jest.fn(),
      client: {} as Client
    } as unknown as ChatInputCommandInteraction;
    await handleSetup(interaction);
    expect(saveServerConfig).toHaveBeenCalledWith({
      guildId: 'guild',
      channelId: 'newDaily',
      musicChannelId: 'music',
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
        getString: jest.fn((n: string) => (n === 'dateFormat' ? 'bad' : null))
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
      options: { getChannel: jest.fn(), getString: jest.fn() },
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
      get: jest.fn((_url: string, cb: (res: any) => void) => {
        const res = new EventEmitter();
        cb(res);
        process.nextTick(() => {
          res.emit('data', Buffer.from('{}'));
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
    jest.doMock('../serverConfig', () => ({
      saveServerConfig,
      loadServerConfig: jest.fn(),
      ServerConfig: {}
    }));
    jest.doMock('../config', () => ({ USERS_FILE: 'users.json', updateServerConfig }));
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
      get: jest.fn((_url: string, cb: (res: any) => void) => {
        const res = new EventEmitter();
        cb(res);
        process.nextTick(() => {
          res.emit('data', Buffer.from('{}'));
          res.emit('end');
        });
        return { on: jest.fn() };
      })
    }));
    const { handleImport } = await import('../handlers');
    const interaction = {
      options: {
        getAttachment: jest.fn().mockReturnValueOnce({ name: 'bad.txt', url: 'u' }).mockReturnValueOnce(null)
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
      token: '',
      dateFormat: 'YYYY-MM-DD'
    });
    const { handleCheckConfig } = await import('../handlers');
    await handleCheckConfig(interaction);
    expect(interaction.reply).toHaveBeenCalledWith('config.invalid');
  });
});
