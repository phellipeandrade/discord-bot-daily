import * as path from 'path';

describe('serverConfig module', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('loadServerConfig returns null when file missing', async () => {
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(false),
      readFileSync: jest.fn(),
      promises: { writeFile: jest.fn() }
    }));
    const { loadServerConfig } = await import('../serverConfig');
    expect(loadServerConfig()).toBeNull();
  });

  test('loadServerConfig parses existing file', async () => {
    const data = {
      guildId: '1',
      channelId: '2',
      musicChannelId: '3',
      token: 'abc',
      timezone: 'UTC',
      language: 'en',
      dailyTime: '08:00',
      dailyDays: '1-5',
      holidayCountries: ['BR'],
      dateFormat: 'YYYY-MM-DD',
      admins: ['a'],
      sendPlayCommand: false,
      playCommand: '/play'
    };
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      readFileSync: jest.fn().mockReturnValue(JSON.stringify(data)),
      promises: { writeFile: jest.fn() }
    }));
    const { loadServerConfig } = await import('../serverConfig');
    expect(loadServerConfig()).toEqual(data);
  });

  test('loadServerConfig handles read error', async () => {
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      readFileSync: jest.fn(() => {
        throw new Error('fail');
      }),
      promises: { writeFile: jest.fn() }
    }));
    const { loadServerConfig } = await import('../serverConfig');
    expect(loadServerConfig()).toBeNull();
  });

  test('saveServerConfig writes config to file', async () => {
    const writeFile = jest.fn();
    jest.doMock('fs', () => ({
      existsSync: jest.fn(),
      readFileSync: jest.fn(),
      promises: { writeFile }
    }));
    const { saveServerConfig } = await import('../serverConfig');
    const cfg = {
      guildId: '1',
      channelId: '2',
      musicChannelId: '3',
      token: 't',
      timezone: 'UTC',
      language: 'en',
      dailyTime: '09:00',
      dailyDays: '1-5',
      holidayCountries: ['BR'],
      dateFormat: 'YYYY-MM-DD',
      admins: [],
      sendPlayCommand: false,
      playCommand: '/play'
    };
    await saveServerConfig(cfg);
    const expectedPath = path.join(
      path.resolve(__dirname, '..'),
      'serverConfig.json'
    );
    expect(writeFile).toHaveBeenCalledWith(
      expectedPath,
      JSON.stringify(cfg, null, 2),
      'utf-8'
    );
  });

  test('updateServerConfig sets exported variables', async () => {
    jest.doMock('fs', () => ({
      existsSync: jest.fn(),
      readFileSync: jest.fn(),
      promises: { writeFile: jest.fn() }
    }));
    const config = await import('../config');
    config.updateServerConfig({
      guildId: 'g',
      channelId: 'c',
      musicChannelId: 'm',
      token: 'tok',
      timezone: 'UTC',
      language: 'en',
      dailyTime: '10:00',
      dailyDays: '1-5',
      holidayCountries: ['BR', 'US'],
      dateFormat: 'YYYY-MM-DD',
      admins: ['x'],
      sendPlayCommand: false,
      playCommand: '/play'
    });
    expect(config.GUILD_ID).toBe('g');
    expect(config.CHANNEL_ID).toBe('c');
    expect(config.MUSIC_CHANNEL_ID).toBe('m');
    expect(config.TOKEN).toBe('tok');
    expect(config.TIMEZONE).toBe('UTC');
    expect(config.LANGUAGE).toBe('en');
    expect(config.DAILY_TIME).toBe('10:00');
    expect(config.DAILY_DAYS).toBe('1-5');
    expect(config.HOLIDAY_COUNTRIES).toEqual(['BR', 'US']);
    expect(config.DATE_FORMAT).toBe('YYYY-MM-DD');
    expect(config.ADMINS).toEqual(['x']);
    expect(config.SEND_PLAY_COMMAND).toBe(false);
    expect(config.PLAY_COMMAND).toBe('/play');
  });
});
