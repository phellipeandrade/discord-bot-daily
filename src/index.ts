import {
  Client,
  GatewayIntentBits,
  Partials,
  TextChannel
} from 'discord.js';
import { i18n } from '@/i18n';
import {
  TOKEN,
  LANGUAGE,
  logConfig,
  isConfigValid,
  checkRequiredConfig,
  canUseAdminCommands,
  reloadServerConfig
} from '@/config';
import {
  UserData,
  UserEntry,
  loadUsers,
  saveUsers,
  selectUser,
  formatUsers,
  findUser
} from '@/users';
import {
  handleRegister,
  handleJoin,
  handleRemove,
  handleList,
  handleSelect,
  handleReset,
  handleSkipToday,
  handleSkipUntil,
  handleSetup,
  handleExport,
  handleImport,
  handleCheckConfig,
  handleRole
} from '@/handlers';
import { createCommands, createAdminCommands, createCommandHandlers, registerCommands } from "@/commands";
import {
  handleNextSong,
  findNextSong,
  handlePlayButton,
  handleClearReactions
} from '@/music';
import { scheduleDailySelection } from '@/scheduler';
import { setupChatListener } from '@/chatHandler';
import { simpleReminderService } from '@/simpleReminderService';
import { database } from '@/supabase';
const { version } = require('../package.json');

i18n.setLanguage(LANGUAGE as 'en' | 'pt-br');
logConfig();

const missingCfg = checkRequiredConfig();
if (missingCfg.length === 0) {
  console.log('✅ Required configuration present');
} else {
  console.warn(`⚠️ Missing configuration: ${missingCfg.join(', ')}`);
}

if (process.env.GEMINI_API_KEY) {
  console.info('Gemini API key found');
} else {
  console.warn('Gemini API key not found');
}

let commands = createCommands();
let adminCommands = createAdminCommands();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel]
});

if (process.env.NODE_ENV !== 'test') {
  let commandHandlers = createCommandHandlers();

  client.once('ready', async () => {
    if (!client.user) throw new Error('Client not properly initialized');

    console.log(`🤖 Logged in as ${client.user.tag}`);
    console.log(`📦 Version: ${version}`);

    const users = await loadUsers();
    console.log(
      `👥 Users loaded (${users.all.length}): ${users.all.map((u) => u.name).join(', ') || '(none)'
      }`
    );

    await registerCommands(client, commands);

    console.log('✅ Commands registered');

    scheduleDailySelection(client);

    // Inicializar serviço de lembretes simplificado
    simpleReminderService.setClient(client);
    await simpleReminderService.start();
  });

  client.on('guildCreate', (guild) => {
    const channel =
      guild.systemChannel || guild.channels.cache.find((c) => c.isTextBased());
    if (channel?.isTextBased()) {
      (channel as TextChannel).send(i18n.t('setup.instructions'));
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
      reloadServerConfig();
      console.log(
        `➡️ Command received: /${interaction.commandName} from ${interaction.user.tag}`
      );
      if (
        !isConfigValid() &&
        interaction.commandName !== i18n.getCommandName('setup') &&
        interaction.commandName !== i18n.getCommandName('check-config')
      ) {
        await interaction.reply(
          i18n.t('config.invalid', {
            fields: checkRequiredConfig().join(', ')
          })
        );
        return;
      }
      if (
        adminCommands.has(interaction.commandName) &&
        !(await canUseAdminCommands(interaction.user.id))
      ) {
        await interaction.reply(i18n.t('errors.unauthorized'));
        return;
      }
      const data = await loadUsers();
      const handler = commandHandlers[interaction.commandName];
      const result = handler ? await handler(interaction, data) : undefined;
      if (interaction.commandName === i18n.getCommandName('setup') && result) {
        commands = createCommands();
        adminCommands = createAdminCommands();
        commandHandlers = createCommandHandlers();
        await registerCommands(client, commands);
      }
    } else if (interaction.isButton()) {
      await handlePlayButton(interaction);
    }
  });

  setupChatListener(client);

  client.login(TOKEN);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  simpleReminderService.stop();
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  simpleReminderService.stop();
  await database.close();
  process.exit(0);
});

export {
  UserData,
  UserEntry,
  loadUsers,
  saveUsers,
  selectUser,
  formatUsers,
  findUser,
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
  handleCheckConfig,
  handleRole,
  scheduleDailySelection
};
