beforeEach(() => {
  jest.resetModules();
});

test('checkRequiredConfig returns missing fields', async () => {
  const config = await import('@/config');
  config.TOKEN = '';
  config.GUILD_ID = '';
  config.CHANNEL_ID = '';
  config.MUSIC_CHANNEL_ID = '';
  config.DAILY_VOICE_CHANNEL_ID = '';
  expect(config.checkRequiredConfig()).toEqual([
    'TOKEN',
    'GUILD_ID',
    'CHANNEL_ID',
    'MUSIC_CHANNEL_ID'
  ]);
});

test('isConfigValid returns true when all fields set', async () => {
  const config = await import('@/config');
  config.TOKEN = 't';
  config.GUILD_ID = 'g';
  config.CHANNEL_ID = 'c';
  config.MUSIC_CHANNEL_ID = 'm';
  config.DAILY_VOICE_CHANNEL_ID = '';
  expect(config.isConfigValid()).toBe(true);
});

test('isAdmin checks list', async () => {
  const config = await import('@/config');
  config.ADMINS = ['1'];
  expect(config.isAdmin('1')).toBe(true);
  expect(config.isAdmin('2')).toBe(false);
});

test('canUseAdminCommands respects roles', async () => {
  const config = await import('@/config');
  config.ADMINS = ['1'];
  await expect(config.canUseAdminCommands('1')).resolves.toBe(true);
  await expect(config.canUseAdminCommands('2')).resolves.toBe(false);
});


test('ADMINS loaded from config file', async () => {
  jest.doMock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(true),
    readFileSync: jest
      .fn()
      .mockReturnValue(
        JSON.stringify({ admins: ['a', 'b'] })
      ),
    promises: { writeFile: jest.fn() }
  }));
  jest.resetModules();
  const cfg = await import('@/config');
  expect(cfg.ADMINS).toEqual(['a', 'b']);
});

test('reloadServerConfig updates values from file', async () => {
  jest.doMock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(true),
    readFileSync: jest
      .fn()
      .mockReturnValue(
        JSON.stringify({
          guildId: 'g1',
          channelId: 'c1',
          musicChannelId: 'm1'
        })
      ),
    promises: { writeFile: jest.fn() }
  }));
  const cfg = await import('@/config');
  cfg.reloadServerConfig();
  expect(cfg.GUILD_ID).toBe('g1');
  expect(cfg.CHANNEL_ID).toBe('c1');
  expect(cfg.MUSIC_CHANNEL_ID).toBe('m1');
});





