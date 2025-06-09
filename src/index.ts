import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Partials,
  TextChannel
} from 'discord.js';
import * as cron from 'node-cron';
import { isHoliday } from './holidays';
import { i18n } from './i18n';
import {
  TOKEN,
  CHANNEL_ID,
  GUILD_ID,
  TIMEZONE,
  LANGUAGE,
  DAILY_TIME,
  DAILY_DAYS,
  HOLIDAY_COUNTRIES
} from './config';
import {
  UserData,
  UserEntry,
  loadUsers,
  saveUsers,
  selectUser,
  formatUsers
} from './users';
import {
  handleRegister,
  handleJoin,
  handleRemove,
  handleList,
  handleSelect,
  handleReset,
  handleReadd
} from './handlers';
import {
  handleNextSong,
  findNextSong,
  handlePlayButton,
  handleClearReactions
} from './music';

i18n.setLanguage(LANGUAGE as 'en' | 'pt-br');

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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel]
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

  client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
      const data = await loadUsers();
      const handler = commandHandlers[interaction.commandName];
      if (handler) await handler(interaction, data);
    } else if (interaction.isButton()) {
      await handlePlayButton(interaction);
    }
  });

  client.login(TOKEN);

  function scheduleDailySelection(): void {
    const [hour, minute] = DAILY_TIME.split(':').map(n => parseInt(n, 10));
    const cronExpr = `${minute} ${hour} * * ${DAILY_DAYS}`;
    cron.schedule(
      cronExpr,
      async () => {
        if (isHoliday(new Date(), HOLIDAY_COUNTRIES)) {
          console.log(i18n.t('daily.holiday'));
          return;
        }

        const data = await loadUsers();
        const selected = await selectUser(data);

        const { text, components } = await findNextSong(client);

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

export {
  UserData,
  UserEntry,
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
