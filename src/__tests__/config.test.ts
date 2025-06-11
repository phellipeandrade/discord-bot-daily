beforeEach(() => {
  jest.resetModules();
});

test('checkRequiredConfig returns missing fields', async () => {
  const config = await import('../config');
  config.TOKEN = '' as any;
  config.GUILD_ID = '' as any;
  config.CHANNEL_ID = '' as any;
  config.MUSIC_CHANNEL_ID = '' as any;
  expect(config.checkRequiredConfig()).toEqual([
    'TOKEN',
    'GUILD_ID',
    'CHANNEL_ID',
    'MUSIC_CHANNEL_ID'
  ]);
});

test('isConfigValid returns true when all fields set', async () => {
  const config = await import('../config');
  config.TOKEN = 't';
  config.GUILD_ID = 'g';
  config.CHANNEL_ID = 'c';
  config.MUSIC_CHANNEL_ID = 'm';
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
