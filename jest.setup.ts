import path from 'path';

// Configurar variáveis de ambiente para teste
// Users are now stored in SQLite database, no JSON file needed

// Mock para Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            insert: jest.fn().mockReturnValue({
              update: jest.fn().mockReturnValue({
                delete: jest.fn().mockReturnValue({
                  then: jest.fn().mockResolvedValue({ data: [], error: null })
                })
              })
            })
          })
        })
      })
    })
  }))
}));

// Mock das funções do fs para outros arquivos que ainda usam
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

// Mock para better-sqlite3
jest.mock('better-sqlite3', () => {
  const mockDatabase = {
    prepare: jest.fn().mockReturnValue({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      iterate: jest.fn()
    }),
    exec: jest.fn(),
    close: jest.fn(),
    transaction: jest.fn((fn) => fn()),
    pragma: jest.fn()
  };

  return jest.fn(() => mockDatabase);
});

// Mock para @google/genai
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn().mockResolvedValue({
        text: JSON.stringify({ reply: 'default' })
      })
    }
  }))
}));

// Mock para discord.js
jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn(),
    on: jest.fn(),
    user: { setActivity: jest.fn() },
    users: { fetch: jest.fn() }
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    GuildVoiceStates: 4,
    MessageContent: 8
  },
  Partials: {
    Message: 1,
    Channel: 2
  },
  TextChannel: jest.fn(),
  VoiceChannel: jest.fn(),
  Message: jest.fn(),
  ChatInputCommandInteraction: jest.fn(),
  SlashCommandBuilder: jest.fn(),
  SlashCommandSubcommandBuilder: jest.fn(),
  SlashCommandSubcommandGroupBuilder: jest.fn(),
  SlashCommandStringOption: jest.fn(),
  SlashCommandIntegerOption: jest.fn(),
  SlashCommandBooleanOption: jest.fn(),
  SlashCommandUserOption: jest.fn(),
  SlashCommandChannelOption: jest.fn(),
  SlashCommandRoleOption: jest.fn(),
  SlashCommandMentionableOption: jest.fn(),
  SlashCommandNumberOption: jest.fn(),
  SlashCommandAttachmentOption: jest.fn(),
  ApplicationCommandOptionType: {
    String: 3,
    Integer: 4,
    Boolean: 5,
    User: 6,
    Channel: 7,
    Role: 8,
    Mentionable: 9,
    Number: 10,
    Attachment: 11
  },
  PermissionFlagsBits: {
    SendMessages: 1,
    ViewChannel: 2
  }
}));

// Mock para node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn()
  }))
}));
