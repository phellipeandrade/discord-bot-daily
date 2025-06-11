beforeEach(() => {
  jest.resetModules();
});

test('checkRequiredConfig returns missing fields', () => {
  const config = require('../config');
  config.TOKEN = '';
  config.GUILD_ID = '';
  config.CHANNEL_ID = '';
  config.MUSIC_CHANNEL_ID = '';
  expect(config.checkRequiredConfig()).toEqual([
    'TOKEN',
    'GUILD_ID',
    'CHANNEL_ID',
    'MUSIC_CHANNEL_ID'
  ]);
});

test('isConfigValid returns true when all fields set', () => {
  const config = require('../config');
  config.TOKEN = 't';
  config.GUILD_ID = 'g';
  config.CHANNEL_ID = 'c';
  config.MUSIC_CHANNEL_ID = 'm';
  expect(config.isConfigValid()).toBe(true);
});

test('isAdmin checks list', () => {
  const config = require('../config');
  config.ADMINS = ['1'];
  expect(config.isAdmin('1')).toBe(true);
  expect(config.isAdmin('2')).toBe(false);
});

test('canUseAdminCommands respects roles', async () => {
  const config = require('../config');
  config.ADMINS = ['1'];
  await expect(config.canUseAdminCommands('1')).resolves.toBe(true);
  await expect(config.canUseAdminCommands('2')).resolves.toBe(false);
});

test('ADMINS loaded from environment variable', () => {
  process.env.ADMIN_IDS = 'a,b';
  jest.resetModules();
  const cfg = require('../config');
  expect(cfg.ADMINS).toEqual(['a', 'b']);
  delete process.env.ADMIN_IDS;
});
