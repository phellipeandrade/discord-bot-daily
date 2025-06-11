import {
  handleRegister,
  handleJoin,
  handleRemove,
  handleList,
  handleSelect,
  handleReset,
  handleReadd
} from '../handlers';
import type { UserData } from '../users';
import * as fs from 'fs';
import { ChatInputCommandInteraction } from 'discord.js';

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
        holidayCountries: ['BR']
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
      updateServerConfig
    }));
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
      reply: jest.fn()
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
      holidayCountries: ['BR']
    });
    expect(updateServerConfig).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalled();
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
});
