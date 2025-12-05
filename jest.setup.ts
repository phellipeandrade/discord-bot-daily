
// Configurar variáveis de ambiente para teste
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-key';
process.env.DISCORD_TOKEN = 'test-token';
process.env.GUILD_ID = 'test-guild';
process.env.CHANNEL_ID = 'test-channel';
process.env.MUSIC_CHANNEL_ID = 'test-music-channel';

// Users are now stored in SQLite database, no JSON file needed

// Mock para Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockImplementation(() => {
    // Mock data para simular respostas do banco
    const mockData = {
      users: [],
      reminders: [],
      skips: [],
      config: []
    };

    const createMockQuery = () => {
      const query = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
        then: jest.fn().mockImplementation((callback) => {
          // Simular resposta assíncrona
          return Promise.resolve({ data: mockData.users, error: null }).then(callback);
        })
      };

      // Mock para upsert que retorna dados simulados
      query.upsert.mockResolvedValue({ data: [{ id: 1 }], error: null });

      // Mock para insert que retorna dados simulados
      query.insert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null })
        })
      });

      // Mock para update que retorna sucesso
      query.update.mockReturnValue({
        data: [],
        error: null,
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      });

      // Mock para delete que retorna sucesso
      query.delete.mockReturnValue({
        data: [],
        error: null,
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        not: jest.fn().mockResolvedValue({ data: [], error: null }),
        in: jest.fn().mockResolvedValue({ data: [], error: null })
      });

      return query;
    };

    return {
      from: jest.fn().mockImplementation((_table) => {
        return createMockQuery();
      })
    };
  })
}));

// Mock das funções do fs para outros arquivos que ainda usam
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockImplementation((filePath: string) => {
    if (filePath.includes('i18n/en.json')) {
      return JSON.stringify({
        commands: {
          register: { name: 'register', description: 'Register a new user' },
          list: { name: 'list', description: 'List users' }
        },
        'reminder.notify': 'Reminder: {text}',
        'reminder.parseError': 'parse-error',
        'reminder.defaultReply': 'default',
        'reminder.list.noReminders': 'No reminders found'
      });
    }
    if (filePath.includes('i18n/pt-br.json')) {
      return JSON.stringify({
        commands: {
          listar: { name: 'listar', description: 'Listar usuários' },
          registrar: { name: 'registrar', description: 'Registrar um novo usuário' }
        },
        'reminder.notify': 'Lembrete: {text}',
        'reminder.parseError': 'erro-parse',
        'reminder.defaultReply': 'padrão',
        'reminder.list.noReminders': 'Nenhum lembrete encontrado'
      });
    }
    return JSON.stringify({
      token: 'test-token',
      guildId: 'test-guild',
      channelId: 'test-channel',
      musicChannelId: 'test-music-channel'
    });
  }),
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
  SlashCommandBuilder: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    addStringOption: jest.fn().mockReturnThis(),
    addIntegerOption: jest.fn().mockReturnThis(),
    addBooleanOption: jest.fn().mockReturnThis(),
    addUserOption: jest.fn().mockReturnThis(),
    addChannelOption: jest.fn().mockReturnThis(),
    addRoleOption: jest.fn().mockReturnThis(),
    addMentionableOption: jest.fn().mockReturnThis(),
    addNumberOption: jest.fn().mockReturnThis(),
    addAttachmentOption: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  SlashCommandSubcommandBuilder: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    addStringOption: jest.fn().mockReturnThis(),
    addIntegerOption: jest.fn().mockReturnThis(),
    addBooleanOption: jest.fn().mockReturnThis(),
    addUserOption: jest.fn().mockReturnThis(),
    addChannelOption: jest.fn().mockReturnThis(),
    addRoleOption: jest.fn().mockReturnThis(),
    addMentionableOption: jest.fn().mockReturnThis(),
    addNumberOption: jest.fn().mockReturnThis(),
    addAttachmentOption: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  SlashCommandSubcommandGroupBuilder: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    addSubcommand: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  SlashCommandStringOption: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setRequired: jest.fn().mockReturnThis(),
    addChoices: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  SlashCommandIntegerOption: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setRequired: jest.fn().mockReturnThis(),
    addChoices: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  SlashCommandBooleanOption: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setRequired: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  SlashCommandUserOption: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setRequired: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  SlashCommandChannelOption: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setRequired: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  SlashCommandRoleOption: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setRequired: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  SlashCommandMentionableOption: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setRequired: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  SlashCommandNumberOption: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setRequired: jest.fn().mockReturnThis(),
    addChoices: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
  SlashCommandAttachmentOption: jest.fn().mockImplementation(() => ({
    setName: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setRequired: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnValue({})
  })),
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
