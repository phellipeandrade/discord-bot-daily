import * as path from 'path';

describe('serverConfig module', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('loadServerConfig returns null when file missing', () => {
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(false),
      readFileSync: jest.fn(),
      promises: { writeFile: jest.fn() }
    }));
    const { loadServerConfig } = require('../serverConfig');
    expect(loadServerConfig()).toBeNull();
  });

  test('loadServerConfig parses existing file', () => {
    const data = {
      guildId: '1',
      channelId: '2',
      musicChannelId: '3',
      token: 'abc'
    };
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(true),
      readFileSync: jest.fn().mockReturnValue(JSON.stringify(data)),
      promises: { writeFile: jest.fn() }
    }));
    const { loadServerConfig } = require('../serverConfig');
    expect(loadServerConfig()).toEqual(data);
  });

  test('saveServerConfig writes config to file', async () => {
    const writeFile = jest.fn();
    jest.doMock('fs', () => ({
      existsSync: jest.fn(),
      readFileSync: jest.fn(),
      promises: { writeFile }
    }));
    const { saveServerConfig } = require('../serverConfig');
    const cfg = { guildId: '1', channelId: '2', musicChannelId: '3', token: 't' };
    await saveServerConfig(cfg);
    const expectedPath = path.join(path.resolve(__dirname, '..'), 'serverConfig.json');
    expect(writeFile).toHaveBeenCalledWith(
      expectedPath,
      JSON.stringify(cfg, null, 2),
      'utf-8'
    );
  });

  test('updateServerConfig sets exported variables', () => {
    jest.doMock('fs', () => ({
      existsSync: jest.fn(),
      readFileSync: jest.fn(),
      promises: { writeFile: jest.fn() }
    }));
    const config = require('../config');
    config.updateServerConfig({
      guildId: 'g',
      channelId: 'c',
      musicChannelId: 'm',
      token: 'tok'
    });
    expect(config.GUILD_ID).toBe('g');
    expect(config.CHANNEL_ID).toBe('c');
    expect(config.MUSIC_CHANNEL_ID).toBe('m');
    expect(config.TOKEN).toBe('tok');
  });
});
