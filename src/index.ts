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
import { i18n } from './i18n';
import {
  TOKEN,
  GUILD_ID,
  LANGUAGE,
  DATE_FORMAT,
  logConfig
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
  handleReadd,
  handleSkipToday,
  handleSkipUntil,
  handleSetup,
  handleExport,
  handleImport
} from './handlers';
import {
  handleNextSong,
  findNextSong,
  handlePlayButton,
  handleClearReactions
} from './music';
import { scheduleDailySelection } from './scheduler';

i18n.setLanguage(LANGUAGE as 'en' | 'pt-br');
logConfig();

const commands = [
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('register'))
    .setDescription(i18n.getCommandDescription('register'))
    .addStringOption((option) =>
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
    .addStringOption((option) =>
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
    .addStringOption((option) =>
      option
        .setName(i18n.getOptionName('readd', 'name'))
        .setDescription(i18n.getOptionDescription('readd', 'name'))
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('skip-today'))
    .setDescription(i18n.getCommandDescription('skip-today'))
    .addStringOption((option) =>
      option
        .setName(i18n.getOptionName('skip-today', 'name'))
        .setDescription(i18n.getOptionDescription('skip-today', 'name'))
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('skip-until'))
    .setDescription(i18n.getCommandDescription('skip-until'))
    .addStringOption((option) =>
      option
        .setName(i18n.getOptionName('skip-until', 'name'))
        .setDescription(i18n.getOptionDescription('skip-until', 'name'))
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName(i18n.getOptionName('skip-until', 'date'))
        .setDescription(
          i18n.t('commands.skip-until.options.date.description', {
            format: DATE_FORMAT
          })
        )
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('setup'))
    .setDescription(i18n.getCommandDescription('setup'))
    .addChannelOption((option) =>
      option
        .setName(i18n.getOptionName('setup', 'daily'))
        .setDescription(i18n.getOptionDescription('setup', 'daily'))
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName(i18n.getOptionName('setup', 'music'))
        .setDescription(i18n.getOptionDescription('setup', 'music'))
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName(i18n.getOptionName('setup', 'token'))
        .setDescription(i18n.getOptionDescription('setup', 'token'))
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName(i18n.getOptionName('setup', 'timezone'))
        .setDescription(i18n.getOptionDescription('setup', 'timezone'))
        .addChoices(
          { name: 'America/Sao_Paulo', value: 'America/Sao_Paulo' },
          { name: 'America/New_York', value: 'America/New_York' },
          { name: 'UTC', value: 'UTC' }
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName(i18n.getOptionName('setup', 'language'))
        .setDescription(i18n.getOptionDescription('setup', 'language'))
        .addChoices(
          { name: 'en', value: 'en' },
          { name: 'pt-br', value: 'pt-br' }
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName(i18n.getOptionName('setup', 'dailyTime'))
        .setDescription(i18n.getOptionDescription('setup', 'dailyTime'))
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName(i18n.getOptionName('setup', 'dailyDays'))
        .setDescription(i18n.getOptionDescription('setup', 'dailyDays'))
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName(i18n.getOptionName('setup', 'holidayCountries'))
        .setDescription(i18n.getOptionDescription('setup', 'holidayCountries'))
        .addChoices(
          { name: 'BR', value: 'BR' },
          { name: 'US', value: 'US' },
          { name: 'BR,US', value: 'BR,US' }
        )
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('export'))
    .setDescription(i18n.getCommandDescription('export')),
  new SlashCommandBuilder()
    .setName(i18n.getCommandName('import'))
    .setDescription(i18n.getCommandDescription('import'))
    .addAttachmentOption((option) =>
      option
        .setName(i18n.getOptionName('import', 'users'))
        .setDescription(i18n.getOptionDescription('import', 'users'))
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName(i18n.getOptionName('import', 'config'))
        .setDescription(i18n.getOptionDescription('import', 'config'))
        .setRequired(false)
    )
].map((cmd) => cmd.toJSON());

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
  const commandHandlers: Record<
    string,
    (i: ChatInputCommandInteraction, d: UserData) => Promise<void>
  > = {
    [i18n.getCommandName('register')]: handleRegister,
    [i18n.getCommandName('remove')]: handleRemove,
    [i18n.getCommandName('list')]: handleList,
    [i18n.getCommandName('select')]: handleSelect,
    [i18n.getCommandName('join')]: handleJoin,
    [i18n.getCommandName('reset')]: handleReset,
    [i18n.getCommandName('next-song')]: async (interaction) => {
      await handleNextSong(interaction);
    },
    [i18n.getCommandName('clear-bunnies')]: async (interaction) => {
      await handleClearReactions(interaction);
    },
    [i18n.getCommandName('readd')]: handleReadd,
    [i18n.getCommandName('skip-today')]: handleSkipToday,
    [i18n.getCommandName('skip-until')]: handleSkipUntil,
    [i18n.getCommandName('setup')]: async (interaction) => {
      await handleSetup(interaction);
    },
    [i18n.getCommandName('export')]: async (interaction) => {
      await handleExport(interaction);
    },
    [i18n.getCommandName('import')]: async (interaction) => {
      await handleImport(interaction);
    }
  };

  client.once('ready', async () => {
    if (!client.user) throw new Error('Client not properly initialized');

    console.log(`🤖 Logged in as ${client.user.tag}`);

    const users = await loadUsers();
    console.log(
      `👥 Users loaded (${users.all.length}): ${
        users.all.map((u) => u.name).join(', ') || '(none)'
      }`
    );

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    const route = GUILD_ID
      ? Routes.applicationGuildCommands(client.user.id, GUILD_ID)
      : Routes.applicationCommands(client.user.id);
    await rest.put(route, { body: commands });

    console.log('✅ Commands registered');

    scheduleDailySelection(client);
  });

  client.on('guildCreate', (guild) => {
    const channel =
      guild.systemChannel || guild.channels.cache.find((c) => c.isTextBased());
    if (channel && channel.isTextBased()) {
      (channel as TextChannel).send(i18n.t('setup.instructions'));
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
      console.log(
        `➡️ Command received: /${interaction.commandName} from ${interaction.user.tag}`
      );
      const data = await loadUsers();
      const handler = commandHandlers[interaction.commandName];
      if (handler) await handler(interaction, data);
    } else if (interaction.isButton()) {
      await handlePlayButton(interaction);
    }
  });

  client.login(TOKEN);
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
  handleClearReactions,
  handleSkipToday,
  handleSkipUntil,
  handleSetup,
  handleExport,
  handleImport,
  scheduleDailySelection
};
