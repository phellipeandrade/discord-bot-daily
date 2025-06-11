import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { ChatInputCommandInteraction } from 'discord.js';
import { i18n } from './i18n';
import {
  UserEntry,
  UserData,
  saveUsers,
  selectUser,
  formatUsers
} from './users';
import { parseDateString, todayISO } from './date';
import {
  DATE_FORMAT,
  updateServerConfig,
  TOKEN,
  CHANNEL_ID,
  MUSIC_CHANNEL_ID,
  TIMEZONE,
  LANGUAGE,
  DAILY_TIME,
  DAILY_DAYS,
  HOLIDAY_COUNTRIES,
  USERS_FILE,
  checkRequiredConfig
} from './config';
import { scheduleDailySelection } from './scheduler';
import {
  saveServerConfig,
  loadServerConfig,
  ServerConfig
} from './serverConfig';

async function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      })
      .on('error', reject);
  });
}

export async function handleRegister(
  interaction: ChatInputCommandInteraction,
  data: UserData
): Promise<void> {
  const userName = interaction.options.getString(
    i18n.getOptionName('register', 'name'),
    true
  );
  const userId = interaction.user.id;

  if (!data.all.some((u) => u.id === userId)) {
    const newUser: UserEntry = { name: userName, id: userId };
    data.all.push(newUser);
    data.remaining.push(newUser);
    await saveUsers(data);
    await interaction.reply(i18n.t('user.registered', { name: userName }));
  } else {
    await interaction.reply(
      i18n.t('user.alreadyRegistered', { name: userName })
    );
  }
}

export async function handleJoin(
  interaction: ChatInputCommandInteraction,
  data: UserData
): Promise<void> {
  const displayName = interaction.user.username;
  const userId = interaction.user.id;

  if (!data.all.some((u) => u.id === userId)) {
    const newUser: UserEntry = { name: displayName, id: userId };
    data.all.push(newUser);
    data.remaining.push(newUser);
    await saveUsers(data);
    await interaction.reply(
      i18n.t('user.selfRegistered', { name: displayName })
    );
  } else {
    await interaction.reply(
      i18n.t('user.alreadySelfRegistered', { name: displayName })
    );
  }
}

export async function handleRemove(
  interaction: ChatInputCommandInteraction,
  data: UserData
): Promise<void> {
  const userName = interaction.options.getString(
    i18n.getOptionName('remove', 'name'),
    true
  );
  data.all = data.all.filter((u) => u.name !== userName);
  data.remaining = data.remaining.filter((u) => u.name !== userName);
  await saveUsers(data);
  await interaction.reply(i18n.t('user.removed', { name: userName }));
}

export async function handleList(
  interaction: ChatInputCommandInteraction,
  data: UserData
): Promise<void> {
  const all = formatUsers(data.all);
  const pending = formatUsers(data.remaining);
  const selected = formatUsers(
    data.all.filter((u) => !data.remaining.some((r) => r.id === u.id))
  );
  await interaction.reply({
    content: `${i18n.t('list.registered', { users: all })}\n\n${i18n.t('list.pending', { users: pending })}\n\n${i18n.t('list.selected', { users: selected })}`,
    flags: 1 << 6
  });
}

export async function handleSelect(
  interaction: ChatInputCommandInteraction,
  data: UserData
): Promise<void> {
  const selected = await selectUser(data);
  await interaction.reply(
    i18n.t('selection.nextUser', { id: selected.id, name: selected.name })
  );
}

export async function handleReset(
  interaction: ChatInputCommandInteraction,
  data: UserData
): Promise<void> {
  try {
    const originalData = JSON.parse(
      await fs.promises.readFile(
        path.join(__dirname, 'users.original.json'),
        'utf-8'
      )
    );
    await saveUsers(originalData);
    await interaction.reply(
      i18n.t('selection.resetOriginal', { count: originalData.all.length })
    );
  } catch {
    data.remaining = [...data.all];
    await saveUsers(data);
    await interaction.reply(
      i18n.t('selection.resetAll', { count: data.all.length })
    );
  }
}

export async function handleReadd(
  interaction: ChatInputCommandInteraction,
  data: UserData
): Promise<void> {
  const userName = interaction.options.getString(
    i18n.getOptionName('readd', 'name'),
    true
  );
  const user = data.all.find((u) => u.name === userName);

  if (user && !data.remaining.some((u) => u.id === user.id)) {
    data.remaining.push(user);
    await saveUsers(data);
    await interaction.reply(i18n.t('selection.readded', { name: userName }));
  } else if (user) {
    await interaction.reply(
      i18n.t('selection.notSelected', { name: userName })
    );
  } else {
    await interaction.reply(i18n.t('user.notFound', { name: userName }));
  }
}

export async function handleSkipToday(
  interaction: ChatInputCommandInteraction,
  data: UserData
): Promise<void> {
  const userName = interaction.options.getString(
    i18n.getOptionName('skip-today', 'name'),
    true
  );
  const user = data.all.find((u) => u.name === userName);

  if (!user) {
    await interaction.reply(i18n.t('user.notFound', { name: userName }));
    return;
  }

  const today = todayISO();
  data.skips = data.skips || {};
  data.skips[user.id] = today;
  await saveUsers(data);
  await interaction.reply(i18n.t('selection.skipToday', { name: userName }));
}

export async function handleSkipUntil(
  interaction: ChatInputCommandInteraction,
  data: UserData
): Promise<void> {
  const userName = interaction.options.getString(
    i18n.getOptionName('skip-until', 'name'),
    true
  );
  const dateStr = interaction.options.getString(
    i18n.getOptionName('skip-until', 'date'),
    true
  );
  const user = data.all.find((u) => u.name === userName);

  if (!user) {
    await interaction.reply(i18n.t('user.notFound', { name: userName }));
    return;
  }

  const iso = parseDateString(dateStr);
  if (!iso) {
    await interaction.reply(
      i18n.t('selection.invalidDate', { format: DATE_FORMAT })
    );
    return;
  }
  data.skips = data.skips || {};
  data.skips[user.id] = iso;
  await saveUsers(data);
  await interaction.reply(
    i18n.t('selection.skipUntil', { name: userName, date: iso })
  );
}

export async function handleSetup(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guildId) return;
  const existing = loadServerConfig() || {
    guildId: interaction.guildId,
    channelId: CHANNEL_ID,
    musicChannelId: MUSIC_CHANNEL_ID,
    token: TOKEN,
    timezone: TIMEZONE,
    language: LANGUAGE,
    dailyTime: DAILY_TIME,
    dailyDays: DAILY_DAYS,
    holidayCountries: HOLIDAY_COUNTRIES
  };

  const daily = interaction.options.getChannel(
    i18n.getOptionName('setup', 'daily'),
    false
  );
  const music = interaction.options.getChannel(
    i18n.getOptionName('setup', 'music'),
    false
  );
  const token =
    interaction.options.getString(i18n.getOptionName('setup', 'token')) ??
    existing.token;
  const timezone =
    interaction.options.getString(i18n.getOptionName('setup', 'timezone')) ??
    existing.timezone;
  const language =
    interaction.options.getString(i18n.getOptionName('setup', 'language')) ??
    existing.language;
  const dailyTime =
    interaction.options.getString(i18n.getOptionName('setup', 'dailyTime')) ??
    existing.dailyTime;
  const dailyDays =
    interaction.options.getString(i18n.getOptionName('setup', 'dailyDays')) ??
    existing.dailyDays;
  const holidays = interaction.options.getString(
    i18n.getOptionName('setup', 'holidayCountries')
  );

  const cfg: ServerConfig = {
    guildId: interaction.guildId,
    channelId: daily?.id ?? existing.channelId,
    musicChannelId: music?.id ?? existing.musicChannelId,
    token,
    timezone,
    language,
    dailyTime,
    dailyDays,
    holidayCountries: holidays
      ? holidays.split(',').map((c) => c.trim().toUpperCase())
      : existing.holidayCountries
  };

  await saveServerConfig(cfg);
  updateServerConfig(cfg);
  scheduleDailySelection(interaction.client);
  await interaction.reply(i18n.t('setup.saved'));
}

export async function handleExport(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const usersPath = USERS_FILE;
  const configPath = path.join(__dirname, 'serverConfig.json');

  const files: Array<{ attachment: string; name: string }> = [];
  if (fs.existsSync(usersPath)) {
    files.push({ attachment: usersPath, name: 'users.json' });
  }
  if (fs.existsSync(configPath)) {
    files.push({ attachment: configPath, name: 'serverConfig.json' });
  }

  if (files.length === 0) {
    await interaction.reply(i18n.t('export.noFiles'));
  } else {
    await interaction.reply({
      content: i18n.t('export.success'),
      files
    });
  }
}

export async function handleImport(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const usersFile = interaction.options.getAttachment(
    i18n.getOptionName('import', 'users'),
    false
  );
  const configFile = interaction.options.getAttachment(
    i18n.getOptionName('import', 'config'),
    false
  );

  if (!usersFile && !configFile) {
    await interaction.reply(i18n.t('import.invalid'));
    return;
  }

  try {
    if (usersFile) {
      if (!usersFile.name.endsWith('.json')) throw new Error('invalid');
      const text = await fetchText(usersFile.url);
      await fs.promises.writeFile(USERS_FILE, text, 'utf-8');
    }

    if (configFile) {
      if (!configFile.name.endsWith('.json')) throw new Error('invalid');
      const text = await fetchText(configFile.url);
      const cfg = JSON.parse(text) as ServerConfig;
      await saveServerConfig(cfg);
      updateServerConfig(cfg);
      scheduleDailySelection(interaction.client);
    }

    await interaction.reply(i18n.t('import.success'));
  } catch {
    await interaction.reply(i18n.t('import.invalid'));
  }
}

export async function handleCheckConfig(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const missing = checkRequiredConfig();
  if (missing.length === 0) {
    await interaction.reply(i18n.t('config.valid'));
  } else {
    await interaction.reply(
      i18n.t('config.invalid', { fields: missing.join(', ') })
    );
  }
}
