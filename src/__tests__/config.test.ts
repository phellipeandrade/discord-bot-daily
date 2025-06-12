beforeEach(() => {
  jest.resetModules();
});

test('checkRequiredConfig returns missing fields', async () => {
  const config = await import('../config');
  config.TOKEN = '';
  config.GUILD_ID = '';
  config.CHANNEL_ID = '';
  config.MUSIC_CHANNEL_ID = '';
  config.DAILY_VOICE_CHANNEL_ID = '';
  expect(config.checkRequiredConfig()).toEqual([
    'TOKEN',
    'GUILD_ID',
    'CHANNEL_ID',
    'MUSIC_CHANNEL_ID',
    'DAILY_VOICE_CHANNEL_ID'
  ]);
});

test('isConfigValid returns true when all fields set', async () => {
  const config = await import('../config');
  config.TOKEN = 't';
  config.GUILD_ID = 'g';
  config.CHANNEL_ID = 'c';
  config.MUSIC_CHANNEL_ID = 'm';
  config.DAILY_VOICE_CHANNEL_ID = 'd';
  expect(config.isConfigValid()).toBe(true);
});

test('isAdmin checks list', async () => {
  const config = await import('../config');
  config.ADMINS = ['1'];
  expect(config.isAdmin('1')).toBe(true);
  expect(config.isAdmin('2')).toBe(false);
});

test('canUseAdminCommands respects roles', async () => {
  const config = await import('../config');
  config.ADMINS = ['1'];
  await expect(config.canUseAdminCommands('1')).resolves.toBe(true);
  await expect(config.canUseAdminCommands('2')).resolves.toBe(false);
});

test('ADMINS loaded from environment variable', async () => {
  process.env.ADMIN_IDS = 'a,b';
  jest.resetModules();
  const cfg = await import('../config');
  expect(cfg.ADMINS).toEqual(['a', 'b']);
  delete process.env.ADMIN_IDS;
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
  const cfg = await import('../config');
  cfg.reloadServerConfig();
  expect(cfg.GUILD_ID).toBe('g1');
  expect(cfg.CHANNEL_ID).toBe('c1');
  expect(cfg.MUSIC_CHANNEL_ID).toBe('m1');
});

test('YOUTUBE_COOKIE loaded from cookies.txt when not set', async () => {
  jest.doMock('fs', () => ({
    existsSync: jest.fn().mockImplementation((p) =>
      p.toString().includes('cookies.txt') ? true : false
    ),
    readFileSync: jest
      .fn()
      .mockReturnValue('domain\tFALSE\t/\tFALSE\t0\tSID\tabcd'),
    promises: { writeFile: jest.fn() }
  }));
  jest.resetModules();
  const cfg = await import('../config');
  expect(cfg.YOUTUBE_COOKIE).toBe('SID=abcd');
});

test('YOUTUBE_COOKIE loaded from path in YOUTUBE_COOKIE_FILE', async () => {
  process.env.YOUTUBE_COOKIE_FILE = '/tmp/mycookie.txt';
  jest.doMock('fs', () => ({
    existsSync: jest.fn().mockImplementation((p) => p === '/tmp/mycookie.txt'),
    readFileSync: jest.fn().mockReturnValue('d\tF\t/\tF\t0\tSAPISID\txyz'),
    promises: { writeFile: jest.fn() }
  }));
  jest.resetModules();
  const cfg = await import('../config');
  expect(cfg.YOUTUBE_COOKIE).toBe('SAPISID=xyz');
  delete process.env.YOUTUBE_COOKIE_FILE;
});

test('parseCookieFile ignores malformed lines and deduplicates', async () => {
  const { parseCookieFile } = await import('../config');
  const content = [
    '# comment',
    'bad line',
    'domain\tF\t/\tF\t0\tSID\ta',
    'domain\tF\t/\tF\t0\tSID\tb'
  ].join('\n');
  expect(parseCookieFile(content)).toBe('SID=b');
});
