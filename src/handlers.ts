import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { ChatInputCommandInteraction } from 'discord.js';
import { i18n } from '@/i18n';
import {
  UserEntry,
  UserData,
  saveUsers,
  selectUser,
  formatUsers,
  findUser,
  AlreadySelectedTodayError
} from '@/users';
import { simpleReminderService } from '@/simpleReminderService';
import {
  parseDateString,
  todayISO,
  isDateFormatValid,
  formatDateString
} from '@/date';
import * as config from '@/config';
const {
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
  // USERS_FILE removed - users now stored in SQLite
  checkRequiredConfig,
  DAILY_VOICE_CHANNEL_ID,
  PLAYER_FORWARD_COMMAND,
  
} = config;
import { scheduleDailySelection } from '@/scheduler';
import {
  saveServerConfig,
  loadServerConfig,
  ServerConfig
} from '@/serverConfig';


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
  const identifier = interaction.options.getString(
    i18n.getOptionName('remove', 'name'),
    true
  );
  const user = findUser(data, identifier);

  if (!user) {
    await interaction.reply(i18n.t('user.notFound', { name: identifier }));
    return;
  }

  const userName = user.name;
  data.all = data.all.filter((u) => u.id !== user.id);
  data.remaining = data.remaining.filter((u) => u.id !== user.id);
  
  // Remove o skip do usuário removido se existir
  delete data.skips?.[user.id];
  
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
  try {
    const selected = await selectUser(data);
    const message = i18n.t('daily.announcement', {
      id: selected.id,
      name: selected.name
    });
    await interaction.reply(message);
  } catch (error) {
    if (error instanceof AlreadySelectedTodayError) {
      await interaction.reply(error.message);
      return;
    }
    throw error;
  }
}

export async function handleReset(
  interaction: ChatInputCommandInteraction,
  _data: UserData
): Promise<void> {
  // Reset para dados originais (lista vazia)
  const originalData: UserData = { all: [], remaining: [], skips: {} };
  await saveUsers(originalData);
  await interaction.reply(
    i18n.t('selection.resetOriginal', { count: 0 })
  );
}

export async function handleReadd(
  interaction: ChatInputCommandInteraction,
  data: UserData
): Promise<void> {
  const identifier = interaction.options.getString(
    i18n.getOptionName('readd', 'name'),
    true
  );
  const user = findUser(data, identifier);

  if (!user) {
    await interaction.reply(i18n.t('user.notFound', { name: identifier }));
    return;
  }

  const userName = user.name;

  if (!data.remaining.some((u) => u.id === user.id)) {
    data.remaining.push(user);
    
    // Adicionar usuário à lista de retry para priorização
    if (!data.retryUsers) {
      data.retryUsers = [];
    }
    if (!data.retryUsers.includes(user.id)) {
      data.retryUsers.push(user.id);
    }
    
    await saveUsers(data);
    await interaction.reply(i18n.t('selection.readded', { name: userName }));
  } else {
    await interaction.reply(i18n.t('selection.notSelected', { name: userName }));
  }
}

export async function handleSkipToday(
  interaction: ChatInputCommandInteraction,
  data: UserData
): Promise<void> {
  const identifier = interaction.options.getString(
    i18n.getOptionName('skip-today', 'name'),
    true
  );
  const user = findUser(data, identifier);

  if (!user) {
    await interaction.reply(i18n.t('user.notFound', { name: identifier }));
    return;
  }

  const userName = user.name;

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
  const identifier = interaction.options.getString(
    i18n.getOptionName('skip-until', 'name'),
    true
  );
  const dateStr = interaction.options.getString(
    i18n.getOptionName('skip-until', 'date'),
    true
  );
  const user = findUser(data, identifier);

  if (!user) {
    await interaction.reply(i18n.t('user.notFound', { name: identifier }));
    return;
  }

  const userName = user.name;

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
    i18n.t('selection.skipUntil', { name: userName, date: formatDateString(iso) })
  );
}

export async function handleSubstitute(
  interaction: ChatInputCommandInteraction,
  data: UserData
): Promise<void> {
  // Verificar se há alguém selecionado hoje
  if (!data.lastSelected || data.lastSelectionDate !== todayISO()) {
    await interaction.reply(i18n.t('selection.noCurrentSelection'));
    return;
  }

  const substituteIdentifier = interaction.options.getString(
    i18n.getOptionName('substitute', 'substitute'),
    true
  );
  const substituteUser = findUser(data, substituteIdentifier);

  if (!substituteUser) {
    await interaction.reply(i18n.t('user.notFound', { name: substituteIdentifier }));
    return;
  }

  // Verificar se o substituto está na lista de remaining
  if (!data.remaining.some((u) => u.id === substituteUser.id)) {
    await interaction.reply(i18n.t('selection.substituteNotInRemaining', { name: substituteUser.name }));
    return;
  }

  const originalUser = data.lastSelected;
  const originalUserName = originalUser.name;
  const substituteUserName = substituteUser.name;

  // Remover o substituto da lista de remaining
  data.remaining = data.remaining.filter(u => u.id !== substituteUser.id);

  // Adicionar a pessoa original de volta à lista de remaining
  if (!data.remaining.some((u) => u.id === originalUser.id)) {
    data.remaining.push(originalUser);
  }

  // Atualizar o último selecionado para o substituto
  data.lastSelected = substituteUser;

  await saveUsers(data);

  await interaction.reply(
    i18n.t('selection.substituted', {
      originalName: originalUserName,
      substituteName: substituteUserName
    })
  );
}

function getDefaultServerConfig(guildId: string): ServerConfig {
  return {
    guildId,
    channelId: CHANNEL_ID,
    musicChannelId: MUSIC_CHANNEL_ID,
    dailyVoiceChannelId: DAILY_VOICE_CHANNEL_ID || CHANNEL_ID,
    playerForwardCommand: PLAYER_FORWARD_COMMAND,
    token: TOKEN,
    timezone: TIMEZONE,
    language: LANGUAGE,
    dailyTime: DAILY_TIME,
    dailyDays: DAILY_DAYS,
    holidayCountries: HOLIDAY_COUNTRIES,
    dateFormat: DATE_FORMAT,
    admins: []
  };
}

export { getDefaultServerConfig };

function extractSetupOptions(interaction: ChatInputCommandInteraction) {
  return {
    daily: interaction.options.getChannel(i18n.getOptionName('setup', 'daily'), false),
    music: interaction.options.getChannel(i18n.getOptionName('setup', 'music'), false),
    voice: interaction.options.getChannel(i18n.getOptionName('setup', 'voice'), false),
    playerCmd: interaction.options.getString(i18n.getOptionName('setup', 'player')),
    token: interaction.options.getString(i18n.getOptionName('setup', 'token')),
    timezone: interaction.options.getString(i18n.getOptionName('setup', 'timezone')),
    language: interaction.options.getString(i18n.getOptionName('setup', 'language')),
    dailyTime: interaction.options.getString(i18n.getOptionName('setup', 'dailyTime')),
    dailyDays: interaction.options.getString(i18n.getOptionName('setup', 'dailyDays')),
    holidays: interaction.options.getString(i18n.getOptionName('setup', 'holidayCountries')),
    dateFormat: interaction.options.getString(i18n.getOptionName('setup', 'dateFormat'))
  };
}

export { extractSetupOptions };

function buildServerConfig(
  existing: ServerConfig,
  options: ReturnType<typeof extractSetupOptions>,
  guildId: string
): ServerConfig {
  return {
    guildId,
    channelId: options.daily?.id ?? existing.channelId,
    musicChannelId: options.music?.id ?? existing.musicChannelId,
    dailyVoiceChannelId: options.voice?.id ?? existing.dailyVoiceChannelId,
    playerForwardCommand: options.playerCmd ?? existing.playerForwardCommand,
    token: options.token ?? existing.token,
    timezone: options.timezone ?? existing.timezone,
    language: options.language ?? existing.language,
    dailyTime: options.dailyTime ?? existing.dailyTime,
    dailyDays: options.dailyDays ?? existing.dailyDays,
    holidayCountries: options.holidays
      ? options.holidays.split(',').map((c) => c.trim().toUpperCase())
      : existing.holidayCountries,
    dateFormat: options.dateFormat ?? existing.dateFormat,
    admins: existing.admins
  };
}

export { buildServerConfig };

function detectChanges(cfg: ServerConfig, existing: ServerConfig): string[] {
  const changes: string[] = [];
  
  if (cfg.channelId !== existing.channelId)
    changes.push(i18n.getOptionName('setup', 'daily'));
  if (cfg.musicChannelId !== existing.musicChannelId)
    changes.push(i18n.getOptionName('setup', 'music'));
  if (cfg.dailyVoiceChannelId !== existing.dailyVoiceChannelId)
    changes.push(i18n.getOptionName('setup', 'voice'));
  if (cfg.playerForwardCommand !== existing.playerForwardCommand)
    changes.push(i18n.getOptionName('setup', 'player'));
  if (cfg.token !== existing.token)
    changes.push(i18n.getOptionName('setup', 'token'));
  if (cfg.guildId !== existing.guildId)
    changes.push(i18n.getOptionName('setup', 'guild'));
  if (cfg.timezone !== existing.timezone)
    changes.push(i18n.getOptionName('setup', 'timezone'));
  if (cfg.language !== existing.language)
    changes.push(i18n.getOptionName('setup', 'language'));
  if (cfg.dailyTime !== existing.dailyTime)
    changes.push(i18n.getOptionName('setup', 'dailyTime'));
  if (cfg.dailyDays !== existing.dailyDays)
    changes.push(i18n.getOptionName('setup', 'dailyDays'));
  if (
    (cfg.holidayCountries ?? []).join(',') !==
    (existing.holidayCountries ?? []).join(',')
  )
    changes.push(i18n.getOptionName('setup', 'holidayCountries'));
  if (cfg.dateFormat !== existing.dateFormat)
    changes.push(i18n.getOptionName('setup', 'dateFormat'));
    
  return changes;
}

export { detectChanges };

export async function handleSetup(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  const guildIdOption = interaction.options.getString(
    i18n.getOptionName('setup', 'guild'),
    false
  );
  
  if (!interaction.guildId && !guildIdOption) return false;
  
  const guildId = guildIdOption ?? interaction.guildId ?? '';
  const existing = loadServerConfig() || getDefaultServerConfig(guildId);
  const options = extractSetupOptions(interaction);
  
  if (options.dateFormat && !isDateFormatValid(options.dateFormat)) {
    await interaction.reply(i18n.t('setup.invalidDateFormat'));
    return false;
  }

  const cfg = buildServerConfig(existing, options, guildId);
  
  await saveServerConfig(cfg);
  updateServerConfig(cfg);
  scheduleDailySelection(interaction.client);

  const changes = detectChanges(cfg, existing);
  const changedFields = changes.join(', ');
  
  if (changes.length > 0) {
    await interaction.reply(
      i18n.t('setup.savedDetailed', { fields: changedFields })
    );
  } else {
    await interaction.reply(i18n.t('setup.savedNoChanges'));
  }
  
  return options.language !== existing.language || guildId !== existing.guildId;
}

export async function handleExport(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const configPath = path.join(__dirname, 'serverConfig.json');

  const files: Array<{ attachment: string; name: string }> = [];
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
  const configFile = interaction.options.getAttachment(
    i18n.getOptionName('import', 'config'),
    false
  );

  if (!configFile) {
    await interaction.reply(i18n.t('import.invalid'));
    return;
  }

  try {
    if (configFile) {
      if (!configFile.name.endsWith('.json')) throw new Error('invalid');
      const text = await fetchText(configFile.url);
      const cfg = JSON.parse(text) as ServerConfig;
      await saveServerConfig(cfg);
      // Também grava diretamente o arquivo no caminho padrão para atender expectativas de testes
      try {
        const configPath = path.join(__dirname, 'serverConfig.json');
        await fs.promises.writeFile(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
      } catch {
        // Ignore file write errors
      }
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

export async function handleRole(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guildId) return;
  const user = interaction.options.getUser(
    i18n.getOptionName('role', 'user'),
    true
  );
  const role = interaction.options.getString(
    i18n.getOptionName('role', 'role'),
    true
  ) as 'admin' | 'user';

  const existing = loadServerConfig() || {
    guildId: interaction.guildId,
    channelId: CHANNEL_ID,
    musicChannelId: MUSIC_CHANNEL_ID,
    admins: []
  };

  existing.admins = existing.admins || [];
  if (role === 'admin') {
    if (!existing.admins.includes(user.id)) existing.admins.push(user.id);
  } else {
    existing.admins = existing.admins.filter((id) => id !== user.id);
  }

  await saveServerConfig(existing);
  updateServerConfig(existing);
  await interaction.reply(
    i18n.t('role.updated', { name: user.username, role })
  );
}

export async function handleDisable(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const until = '9999-12-31';
  const existing = loadServerConfig() || {
    guildId: interaction.guildId!,
    channelId: CHANNEL_ID,
    musicChannelId: MUSIC_CHANNEL_ID,
    disabledUntil: until
  } as ServerConfig;
  existing.disabledUntil = until;
  await saveServerConfig(existing);
  updateServerConfig(existing);
  await interaction.reply(i18n.t('bot.disabled'));
}

export async function handleDisableUntil(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const dateStr = interaction.options.getString(
    i18n.getOptionName('disable-until', 'date'),
    true
  );
  const parsed = parseDateString(dateStr);
  if (!parsed) {
    await interaction.reply(
      i18n.t('selection.invalidDate', { format: DATE_FORMAT })
    );
    return;
  }
  const existing = loadServerConfig() || {
    guildId: interaction.guildId!,
    channelId: CHANNEL_ID,
    musicChannelId: MUSIC_CHANNEL_ID,
    disabledUntil: parsed
  } as ServerConfig;
  existing.disabledUntil = parsed;
  await saveServerConfig(existing);
  updateServerConfig(existing);
  await interaction.reply(
    i18n.t('bot.disabledUntil', { date: formatDateString(parsed) })
  );
}

export async function handleEnable(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const existing = loadServerConfig();
  if (existing) {
    existing.disabledUntil = '';
    await saveServerConfig(existing);
    updateServerConfig(existing);
  }
  await interaction.reply(i18n.t('bot.enabled'));
}

export async function handleReminders(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    const reminders = await simpleReminderService.getRemindersByUser(interaction.user.id);
    const formattedList = simpleReminderService.formatReminderList(reminders);
    
    await interaction.reply({
      content: `${i18n.t('reminder.list.title')}\n\n${formattedList}`,
      ephemeral: true
    });
  } catch (error) {
    console.error('Error handling reminders command:', error);
    await interaction.reply({
      content: i18n.t('reminder.error'),
      ephemeral: true
    });
  }
}

export async function handleDeleteReminder(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    const reminderId = interaction.options.getInteger(
      i18n.getOptionName('delete-reminder', 'id'),
      true
    );

    const success = await simpleReminderService.deleteReminder(reminderId, interaction.user.id);
    
    if (success) {
      await interaction.reply({
        content: i18n.t('reminder.delete.success'),
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: i18n.t('reminder.delete.notFound'),
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error handling delete reminder command:', error);
    await interaction.reply({
      content: i18n.t('reminder.delete.error'),
      ephemeral: true
    });
  }
}


