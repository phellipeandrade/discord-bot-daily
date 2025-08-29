import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  REST,
  Routes,
  type RESTPostAPIApplicationCommandsJSONBody
} from 'discord.js';
import { i18n } from '@/i18n';
import {
  TOKEN,
  GUILD_ID,
  DATE_FORMAT
} from '@/config';
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
  handleSubstitute,
  handleSetup,
  handleExport,
  handleImport,
  handleCheckConfig,
  handleRole,
  handleDisable,
  handleDisableUntil,
  handleEnable,
  handleReminders,
  handleDeleteReminder
} from '@/handlers';
import {
  handleNextSong,
  handleClearReactions
} from '@/music';
import { UserData } from '@/users';

export function createCommands(): RESTPostAPIApplicationCommandsJSONBody[] {
  return [
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
      .setName(i18n.getCommandName('substitute'))
      .setDescription(i18n.getCommandDescription('substitute'))
      .addStringOption((option) =>
        option
          .setName(i18n.getOptionName('substitute', 'substitute'))
          .setDescription(i18n.getOptionDescription('substitute', 'substitute'))
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(i18n.getCommandName('reminders'))
      .setDescription(i18n.getCommandDescription('reminders')),
    new SlashCommandBuilder()
      .setName(i18n.getCommandName('delete-reminder'))
      .setDescription(i18n.getCommandDescription('delete-reminder'))
      .addIntegerOption((option) =>
        option
          .setName(i18n.getOptionName('delete-reminder', 'id'))
          .setDescription(i18n.getOptionDescription('delete-reminder', 'id'))
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
      .addChannelOption((option) =>
        option
          .setName(i18n.getOptionName('setup', 'voice'))
          .setDescription(i18n.getOptionDescription('setup', 'voice'))
          .setRequired(false)
      )
      .addStringOption((option) =>
        option
          .setName(i18n.getOptionName('setup', 'player'))
          .setDescription(i18n.getOptionDescription('setup', 'player'))
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
          .setName(i18n.getOptionName('setup', 'guild'))
          .setDescription(i18n.getOptionDescription('setup', 'guild'))
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
      )
      .addStringOption((option) =>
        option
          .setName(i18n.getOptionName('setup', 'dateFormat'))
          .setDescription(i18n.getOptionDescription('setup', 'dateFormat'))
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
      ),
    new SlashCommandBuilder()
      .setName(i18n.getCommandName('role'))
      .setDescription(i18n.getCommandDescription('role'))
      .addUserOption((option) =>
        option
          .setName(i18n.getOptionName('role', 'user'))
          .setDescription(i18n.getOptionDescription('role', 'user'))
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName(i18n.getOptionName('role', 'role'))
          .setDescription(i18n.getOptionDescription('role', 'role'))
          .addChoices(
            { name: 'admin', value: 'admin' },
            { name: 'user', value: 'user' }
          )
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(i18n.getCommandName('disable'))
      .setDescription(i18n.getCommandDescription('disable')),
    new SlashCommandBuilder()
      .setName(i18n.getCommandName('disable-until'))
      .setDescription(i18n.getCommandDescription('disable-until'))
      .addStringOption((option) =>
        option
          .setName(i18n.getOptionName('disable-until', 'date'))
          .setDescription(
            i18n.t('commands.disable-until.options.date.description', {
              format: DATE_FORMAT
            })
          )
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(i18n.getCommandName('enable'))
      .setDescription(i18n.getCommandDescription('enable')),
    new SlashCommandBuilder()
      .setName(i18n.getCommandName('check-config'))
      .setDescription(i18n.getCommandDescription('check-config'))
  ].map((cmd) => cmd.toJSON());
}

export function createAdminCommands(): Set<string> {
  return new Set([
    i18n.getCommandName('remove'),
    i18n.getCommandName('reset'),
    i18n.getCommandName('readd'),
    i18n.getCommandName('skip-today'),
    i18n.getCommandName('skip-until'),
    i18n.getCommandName('substitute'),
    i18n.getCommandName('setup'),
    i18n.getCommandName('export'),
    i18n.getCommandName('import'),
    i18n.getCommandName('role'),
    i18n.getCommandName('clear-bunnies'),
    i18n.getCommandName('check-config'),
    i18n.getCommandName('register'),
    i18n.getCommandName('disable'),
    i18n.getCommandName('disable-until'),
    i18n.getCommandName('enable')
  ]);
}

export type CommandHandler = (
  i: ChatInputCommandInteraction,
  d: UserData
) => Promise<void | boolean>;

export function createCommandHandlers(): Record<string, CommandHandler> {
  return {
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
    [i18n.getCommandName('substitute')]: handleSubstitute,
    [i18n.getCommandName('setup')]: async (interaction) => {
      return await handleSetup(interaction);
    },
    [i18n.getCommandName('export')]: async (interaction) => {
      await handleExport(interaction);
    },
    [i18n.getCommandName('import')]: async (interaction) => {
      await handleImport(interaction);
    },
    [i18n.getCommandName('role')]: async (interaction) => {
      await handleRole(interaction);
    },
    [i18n.getCommandName('check-config')]: async (interaction) => {
      await handleCheckConfig(interaction);
    },
    [i18n.getCommandName('disable')]: async (interaction) => {
      await handleDisable(interaction);
    },
    [i18n.getCommandName('disable-until')]: async (interaction) => {
      await handleDisableUntil(interaction);
    },
    [i18n.getCommandName('enable')]: async (interaction) => {
      await handleEnable(interaction);
    },
    [i18n.getCommandName('reminders')]: async (interaction) => {
      await handleReminders(interaction);
    },
    [i18n.getCommandName('delete-reminder')]: async (interaction) => {
      await handleDeleteReminder(interaction);
    }
  };
}

export async function registerCommands(
  client: Client,
  commands: RESTPostAPIApplicationCommandsJSONBody[]
): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(client.user!.id, GUILD_ID)
    : Routes.applicationCommands(client.user!.id);
  await rest.put(route, { body: commands });
  console.log('✅ Commands registered');
}
