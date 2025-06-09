import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Partials,
  ButtonInteraction,
} from 'discord.js';
import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { isHoliday } from './holidays';
import { i18n } from './i18n';

dotenv.config();

// =================== CONFIG ===================
const TOKEN = process.env.DISCORD_TOKEN!;
const CHANNEL_ID = process.env.CHANNEL_ID!;
const GUILD_ID = process.env.GUILD_ID!;
const MUSIC_CHANNEL_ID = process.env.MUSIC_CHANNEL_ID!;
const USERS_FILE = path.join(__dirname, 'users.json');
const TIMEZONE = process.env.TIMEZONE ?? 'America/Sao_Paulo';
const LANGUAGE = process.env.BOT_LANGUAGE ?? 'pt-br';

// Set bot language
i18n.setLanguage(LANGUAGE as 'en' | 'pt-br');

// =================== Interfaces ===================
export interface UserEntry {
  name: string;
  id: string;
}

export interface UserData {
  all: UserEntry[];
  remaining: UserEntry[];
  lastSelected?: UserEntry;
}

// =================== Utils ===================
function loadUsers(): UserData {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      const emptyData: UserData = { all: [], remaining: [] };
      saveUsers(emptyData);
      return emptyData;
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    const emptyData: UserData = { all: [], remaining: [] };
    saveUsers(emptyData);
    return emptyData;
  }
}

function saveUsers(data: UserData): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function selectUser(data: UserData): UserEntry {
  if (data.remaining.length === 0) {
    data.remaining = [...data.all];
  }
  const index = Math.floor(Math.random() * data.remaining.length);
  const selected = data.remaining.splice(index, 1)[0];
  data.lastSelected = selected;
  saveUsers(data);
  return selected;
}

function formatUsers(users: UserEntry[]): string {
  if (users.length === 0) return i18n.t('list.empty');
  return users.map(u => `• ${u.name}`).join('\n');
}

// =================== Handlers ===================
async function handleRegister(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
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

async function handleJoin(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
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

async function handleRemove(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const userName = interaction.options.getString('name', true);
  data.all = data.all.filter(u => u.name !== userName);
  data.remaining = data.remaining.filter(u => u.name !== userName);
  saveUsers(data);
  await interaction.reply(i18n.t('user.removed', { name: userName }));
}

async function handleList(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const all = formatUsers(data.all);
  const pending = formatUsers(data.remaining);
  const selected = formatUsers(data.all.filter(u => !data.remaining.some(r => r.id === u.id)));
  await interaction.reply({
    content: `${i18n.t('list.registered', { users: all })}\n\n${i18n.t('list.pending', { users: pending })}\n\n${i18n.t('list.selected', { users: selected })}`,
    flags: 1 << 6
  });
}

async function handleSelect(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const selected = selectUser(data);
  await interaction.reply(i18n.t('selection.nextUser', { id: selected.id, name: selected.name }));
}

async function handleReset(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
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

async function handleReadd(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
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

async function findNextSong(): Promise<{ text: string; components?: ActionRowBuilder<ButtonBuilder>[] }> {
  const requestsChannel = await client.channels.fetch(MUSIC_CHANNEL_ID);
  if (!requestsChannel?.isTextBased()) {
    return { text: i18n.t('music.channelError') };
  }

  const messages = await (requestsChannel as TextChannel).messages.fetch({ limit: 50 });
  const bunny = '🐰';
  const linkRegex = /https?:\/\/\S+/i;

  for (const msg of Array.from(messages.values()).reverse()) {
    const bunnyReaction = msg.reactions.cache.find(r => r.emoji.name === bunny);
    const alreadyPlayed = !!bunnyReaction && bunnyReaction?.count > 0;
    if (alreadyPlayed) continue;

    const hasLinkInContent = linkRegex.test(msg.content);
    const hasEmbed = msg.embeds.length > 0;
    const hasAttachment = msg.attachments.size > 0;
    if (!hasLinkInContent && !hasEmbed && !hasAttachment) continue;

    let extractedLink: string;
    if (hasAttachment) {
      extractedLink = msg.attachments.first()!.url;
    } else if (hasLinkInContent) {
      extractedLink = linkRegex.exec(msg.content)![0];
    } else {
      const embed = msg.embeds[0];
      extractedLink = embed.url ?? embed.data?.url ?? '';
    }

    const playButton = new ButtonBuilder()
      .setCustomId(`play_${msg.id}`)
      .setLabel('▶️ Play song')
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(playButton);

    return {
      text: i18n.t('music.next', { link: extractedLink, messageUrl: msg.url }),
      components: [row]
    };
  }

  return { text: i18n.t('music.allPlayed') };
}

async function handleNextSong(interaction: ChatInputCommandInteraction): Promise<void> {
  const { text, components } = await findNextSong();
  await interaction.reply({ content: text, components });
}

async function handleClearReactions(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = await interaction.client.channels.fetch(MUSIC_CHANNEL_ID);
  if (!channel?.isTextBased()) {
    await interaction.reply({
      content: i18n.t('music.channelError'),
      components: undefined
    });
    return;
  }

  try {
    const messages = await (channel as TextChannel).messages.fetch();
    let count = 0;

    for (const message of messages.values()) {
      const bunnyReaction = message.reactions.cache.find(r => r.emoji.name === '🐰');
      if (bunnyReaction) {
        await bunnyReaction.remove();
        count++;
      }
    }

    await interaction.reply({
      content: i18n.t('music.reactionsCleared', { count }),
      components: undefined
    });
  } catch (error) {
    console.error('Error clearing reactions:', error);
    await interaction.reply({
      content: i18n.t('music.processError'),
      components: undefined
    });
  }
}

async function handlePlayButton(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;
  if (!customId.startsWith('play_')) return;

  const originalMessageId = customId.replace('play_', '');
  const channel = await interaction.client.channels.fetch(MUSIC_CHANNEL_ID);

  if (!channel?.isTextBased()) {
    await interaction.reply({
      content: i18n.t('music.channelError'),
      flags: 1 << 6
    });
    return;
  }

  try {
    const originalMsg = await (channel as TextChannel).messages.fetch(originalMessageId);
    const linkRegex = /https?:\/\/\S+/i;
    let linkToPlay: string;

    if (originalMsg.attachments?.size > 0) {
      linkToPlay = originalMsg.attachments.first()!.url;
    } else if (linkRegex.test(originalMsg.content)) {
      const match = linkRegex.exec(originalMsg.content);
      linkToPlay = match![0];
    } else if (originalMsg.embeds?.length > 0) {
      const embed = originalMsg.embeds[0];
      linkToPlay = embed.url ?? embed.data?.url ?? '';
    } else {
      linkToPlay = '';
    }

    if (!linkToPlay) {
      await interaction.reply({
        content: i18n.t('music.extractError'),
        flags: 1 << 6
      });
      return;
    }

    await originalMsg.react('🐰');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('🔗 Open song link')
        .setStyle(ButtonStyle.Link)
        .setURL(linkToPlay)
    );

    await interaction.reply({
      content: i18n.t('music.marked', { link: linkToPlay }),
      components: [row],
      flags: 1 << 6
    });

  } catch (error) {
    console.error('Error in play button: ', error);
    await interaction.reply({
      content: i18n.t('music.processError'),
      flags: 1 << 6
    });
  }
}

// =================== Slash Commands ===================
const commands = [
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('register'))
    .setDescription(i18n.getCommandDescription('register'))
    .addStringOption(option =>
      option
        .setName(i18n.getOptionName('register', 'name'))
        .setDescription(i18n.getOptionDescription('register', 'name'))
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('join'))
    .setDescription(i18n.getCommandDescription('join')),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('remove'))
    .setDescription(i18n.getCommandDescription('remove'))
    .addStringOption(option =>
      option
        .setName(i18n.getOptionName('remove', 'name'))
        .setDescription(i18n.getOptionDescription('remove', 'name'))
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('list'))
    .setDescription(i18n.getCommandDescription('list')),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('select'))
    .setDescription(i18n.getCommandDescription('select')),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('reset'))
    .setDescription(i18n.getCommandDescription('reset')),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('next-song'))
    .setDescription(i18n.getCommandDescription('next-song')),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('clear-bunnies'))
    .setDescription(i18n.getCommandDescription('clear-bunnies')),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('readd'))
    .setDescription(i18n.getCommandDescription('readd'))
    .addStringOption(option =>
      option
        .setName(i18n.getOptionName('readd', 'name'))
        .setDescription(i18n.getOptionDescription('readd', 'name'))
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

// =================== Initialization ===================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Reaction,
    Partials.Channel
  ]
});

if (process.env.NODE_ENV !== 'test') {
  const commandHandlers: Record<string, (i: ChatInputCommandInteraction, d: UserData) => Promise<void>> = {
    [i18n.getCommandName('register')]: handleRegister,
    [i18n.getCommandName('remove')]: handleRemove,
    [i18n.getCommandName('list')]: handleList,
    [i18n.getCommandName('select')]: handleSelect,
    [i18n.getCommandName('join')]: handleJoin,
    [i18n.getCommandName('reset')]: handleReset,
    [i18n.getCommandName('next-song')]: async interaction => {
      await handleNextSong(interaction);
    },
    [i18n.getCommandName('clear-bunnies')]: async interaction => {
      await handleClearReactions(interaction);
    },
    [i18n.getCommandName('readd')]: handleReadd
  };

  client.once('ready', async () => {
    if (!client.user) throw new Error('Client not properly initialized');

    console.log(`🤖 Bot online as ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), {
      body: commands
    });

    console.log('✅ Commands registered successfully.');

    scheduleDailySelection();
  });

  client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const data = loadUsers();
      const handler = commandHandlers[interaction.commandName];
      if (handler) await handler(interaction, data);
    } else if (interaction.isButton()) {
      await handlePlayButton(interaction);
    }
  });

  client.login(TOKEN);

  // =================== Scheduling ===================
  function scheduleDailySelection(): void {
    cron.schedule(
      '0 9 * * 1-5',
      async () => {
        if (isHoliday(new Date())) {
          console.log(i18n.t('daily.holiday'));
          return;
        }

        const data = loadUsers();
        const selected = selectUser(data);

        const { text, components } = await findNextSong();

        const channel = await client.channels.fetch(CHANNEL_ID);
        if (channel?.isTextBased()) {
          (channel as TextChannel).send({
            content:
              `${i18n.t('daily.announcement', { id: selected.id, name: selected.name })}\n\n` +
              text,
            components
          });
        }
      },
      { timezone: TIMEZONE }
    );
  }
}

// Export functions for testing
export {
  loadUsers,
  saveUsers,
  selectUser,
  formatUsers,
  handleRegister,
  handleJoin,
  handleRemove,
  handleList,
  handleSelect,
  handleReset,
  handleNextSong,
  findNextSong,
  handlePlayButton,
  handleClearReactions
};
