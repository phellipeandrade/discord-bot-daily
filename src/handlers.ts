import * as fs from 'fs';
import * as path from 'path';
import { ChatInputCommandInteraction } from 'discord.js';
import { i18n } from './i18n';
import { UserEntry, UserData, saveUsers, selectUser, formatUsers } from './users';

export async function handleRegister(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const userName = interaction.options.getString('name', true);
  const userId = interaction.user.id;

  if (!data.all.some(u => u.id === userId)) {
    const newUser: UserEntry = { name: userName, id: userId };
    data.all.push(newUser);
    data.remaining.push(newUser);
    saveUsers(data);
    await interaction.reply(i18n.t('user.registered', { name: userName }));
  } else {
    await interaction.reply(i18n.t('user.alreadyRegistered', { name: userName }));
  }
}

export async function handleJoin(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const displayName = interaction.user.username;
  const userId = interaction.user.id;

  if (!data.all.some(u => u.id === userId)) {
    const newUser: UserEntry = { name: displayName, id: userId };
    data.all.push(newUser);
    data.remaining.push(newUser);
    saveUsers(data);
    await interaction.reply(i18n.t('user.selfRegistered', { name: displayName }));
  } else {
    await interaction.reply(i18n.t('user.alreadySelfRegistered', { name: displayName }));
  }
}

export async function handleRemove(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const userName = interaction.options.getString('name', true);
  data.all = data.all.filter(u => u.name !== userName);
  data.remaining = data.remaining.filter(u => u.name !== userName);
  saveUsers(data);
  await interaction.reply(i18n.t('user.removed', { name: userName }));
}

export async function handleList(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const all = formatUsers(data.all);
  const pending = formatUsers(data.remaining);
  const selected = formatUsers(data.all.filter(u => !data.remaining.some(r => r.id === u.id)));
  await interaction.reply({
    content: `${i18n.t('list.registered', { users: all })}\n\n${i18n.t('list.pending', { users: pending })}\n\n${i18n.t('list.selected', { users: selected })}`,
    flags: 1 << 6
  });
}

export async function handleSelect(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const selected = selectUser(data);
  await interaction.reply(i18n.t('selection.nextUser', { id: selected.id, name: selected.name }));
}

export async function handleReset(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  try {
    const originalData = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.original.json'), 'utf-8'));
    saveUsers(originalData);
    await interaction.reply(i18n.t('selection.resetOriginal', { count: originalData.all.length }));
  } catch {
    data.remaining = [...data.all];
    saveUsers(data);
    await interaction.reply(i18n.t('selection.resetAll', { count: data.all.length }));
  }
}

export async function handleReadd(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const userName = interaction.options.getString('name', true);
  const user = data.all.find(u => u.name === userName);

  if (user && !data.remaining.some(u => u.id === user.id)) {
    data.remaining.push(user);
    saveUsers(data);
    await interaction.reply(i18n.t('selection.readded', { name: userName }));
  } else if (user) {
    await interaction.reply(i18n.t('selection.notSelected', { name: userName }));
  } else {
    await interaction.reply(i18n.t('user.notFound', { name: userName }));
  }
}
