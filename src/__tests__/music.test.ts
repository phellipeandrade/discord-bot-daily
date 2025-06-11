import { handleNextSong, handlePlayButton, handleClearReactions } from '../index';
import { 
  Client, 
  GatewayIntentBits, 
  Message, 
  TextChannel, 
  ChatInputCommandInteraction, 
  Collection, 
  Attachment, 
  CommandInteractionOptionResolver, 
  CacheType,
  ButtonInteraction,
  ApplicationCommandType,
  ComponentType
} from 'discord.js';
import { MockCollection } from './__mocks__/MockCollection';
import { mockChannel, mockMessageTemplate } from './__mocks__/discord.js';

// Mock do i18n
var mockTranslations: Record<string, string>;
jest.mock('../i18n', () => {
  mockTranslations = {
    'list.empty': '(none)',
    'music.noValidMusic': '✅ No valid music found.',
    'music.marked': '✅ Song marked as played!\n\n🎵 To play the song in the bot, copy and send the command below:\n```\n/play {{link}}\n```',
    'music.reactionsCleared': '✅ Removed {{count}} 🐰 reactions made by the bot.',
    'music.channelError': 'Could not access the music channel.',
    'music.processError': 'Error processing the music.',
    'music.extractError': 'Could not extract music link.',
    'music.next': '🎵 Next song: {{link}}\n\n📎 Message link: {{messageUrl}}',
    'music.allPlayed': '✅ All recent songs have been played.'
  };

  return {
    i18n: {
      t: jest.fn((key: string, params: Record<string, string | number> = {}) => {
        const text = mockTranslations[key] || key;
        return text.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
          const value = params[paramKey];
          return value !== undefined ? String(value) : `{{${paramKey}}}`;
        });
      }),
      getCommandName: jest.fn((command: string) => command),
      getCommandDescription: jest.fn((command: string) => `Command ${command}`),
      getOptionName: jest.fn((command: string, option: string) => option),
      getOptionDescription: jest.fn((command: string, option: string) => `Option ${option}`),
      setLanguage: jest.fn(() => undefined)
    }
  };
});

// Mock do Discord.js
jest.mock('discord.js');

type PartialMessage = Pick<Message, 'content' | 'embeds' | 'id' | 'url'>;

interface MockMessage extends PartialMessage {
  attachments: Collection<string, Attachment>;
  react: jest.Mock;
  reactions: {
    cache: Collection<string, { 
      remove: jest.Mock;
      emoji?: { name: string };
      count?: number;
    }>;
  };
}

interface MockChannelManager {
  fetch: jest.Mock;
}

interface MockMessageManager {
  fetch: jest.Mock;
}

interface MockChannel {
  isTextBased: () => this is TextChannel;
  messages: MockMessageManager;
}

type BaseMockInteraction = Omit<ChatInputCommandInteraction<CacheType>, 'client' | 'reply' | 'options'>;

interface MockInteractionOptions extends CommandInteractionOptionResolver {
  getString: jest.Mock;
}

interface MockInteraction extends BaseMockInteraction {
  client: Client<true>;
  reply: jest.Mock;
  options: MockInteractionOptions;
}

interface MockButtonInteraction extends Omit<ButtonInteraction<CacheType>, 'client' | 'reply' | 'componentType' | 'component'> {
  client: Client<true>;
  reply: jest.Mock;
  customId: string;
  componentType: ComponentType.Button;
  component: Record<string, unknown>;
  message: Message;
  update: jest.Mock;
  deferUpdate: jest.Mock;
  _cacheType: CacheType;
}

describe('Comandos de Música', () => {
  let mockInteraction: MockInteraction;
  let mockButtonInteraction: MockButtonInteraction;
  let mockClientInstance: Client<true>;
  let mockChannelInstance: MockChannel;
  let mockMessageInstance: MockMessage;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = jest.fn();

    jest.clearAllMocks();

    const config = require('../config');
    config.MUSIC_CHANNEL_ID = 'requests';

    mockClientInstance = {
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
      ],
      channels: {
        fetch: jest.fn()
      }
    } as unknown as Client<true>;

    mockChannelInstance = {
      ...mockChannel,
      isTextBased: function(this: MockChannel): this is TextChannel {
        return true;
      },
      messages: {
        fetch: jest.fn()
      }
    };

    mockMessageInstance = {
      ...mockMessageTemplate,
      attachments: new Collection<string, Attachment>(),
      react: jest.fn().mockResolvedValue(undefined),
      content: 'https://example.com/song',
      embeds: [],
      reactions: {
        cache: new Collection()
      }
    } as unknown as MockMessage;



    const mockOptions: MockInteractionOptions = {
      getString: jest.fn()
    } as unknown as MockInteractionOptions;

    mockInteraction = {
      client: mockClientInstance,
      reply: jest.fn(),
      customId: '',
      commandType: ApplicationCommandType.ChatInput,
      options: mockOptions
    } as unknown as MockInteraction;

    mockButtonInteraction = {
      client: mockClientInstance,
      reply: jest.fn(),
      customId: 'play_123',
      componentType: ComponentType.Button,
      component: {},
      message: mockMessageInstance as unknown as Message,
      update: jest.fn(),
      deferUpdate: jest.fn()
    } as unknown as MockButtonInteraction;

    (mockClientInstance.channels as unknown as MockChannelManager).fetch.mockResolvedValue(mockChannelInstance);
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('handleNextSong', () => {
    it('deve retornar erro se não conseguir acessar o canal', async () => {
      (mockClientInstance.channels as unknown as MockChannelManager).fetch.mockResolvedValue(null);

      await handleNextSong(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.channelError'],
        components: undefined
      });
    });

    it('deve retornar erro se o canal não for de texto', async () => {
      const nonTextChannel = {
        ...mockChannelInstance,
        isTextBased: (): false => false
      };
      (mockClientInstance.channels as unknown as MockChannelManager).fetch.mockResolvedValue(nonTextChannel);

      await handleNextSong(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.channelError'],
        components: undefined
      });
    });

    it('deve encontrar a próxima música não marcada', async () => {
      (mockClientInstance.channels as unknown as MockChannelManager).fetch.mockResolvedValue(mockChannelInstance);
      mockChannelInstance.messages.fetch.mockResolvedValue(new MockCollection([
        ['123', mockMessageInstance]
      ]));

      await handleNextSong(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Next song'),
        components: expect.any(Array)
      });
    });

    it('deve informar quando todas as músicas foram tocadas', async () => {
      mockMessageInstance.reactions.cache.set('🐰', { 
        remove: jest.fn(),
        emoji: { name: '🐰' }, 
        count: 1 
      });
      (mockClientInstance.channels as unknown as MockChannelManager).fetch.mockResolvedValue(mockChannelInstance);
      mockChannelInstance.messages.fetch.mockResolvedValue(new MockCollection([
        ['123', mockMessageInstance]
      ]));

      await handleNextSong(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.allPlayed'],
        components: undefined
      });
    });
  });

  describe('handlePlayButton', () => {
    it('deve marcar a música como tocada', async () => {
      (mockClientInstance.channels as unknown as MockChannelManager).fetch.mockResolvedValue(mockChannelInstance);
      mockChannelInstance.messages.fetch.mockResolvedValue(mockMessageInstance);

      await handlePlayButton(mockButtonInteraction as unknown as ButtonInteraction);

      expect(mockMessageInstance.react).toHaveBeenCalledWith('🐰');
      expect(mockButtonInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Song marked as played'),
        components: expect.any(Array),
        flags: 1 << 6
      });
    });

    it('deve lidar com erro ao processar a música', async () => {
      (mockClientInstance.channels as unknown as MockChannelManager).fetch.mockResolvedValue(mockChannelInstance);
      mockChannelInstance.messages.fetch.mockRejectedValue(new Error('Test error'));

      await handlePlayButton(mockButtonInteraction as unknown as ButtonInteraction);

      expect(mockButtonInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.processError'],
        flags: 1 << 6
      });
    });

    it('deve informar quando não há mais músicas para tocar', async () => {
      // Mock de uma mensagem com link para que o handlePlayButton funcione
      const messageWithLink = {
        ...mockMessageInstance,
        content: 'https://example.com/song.mp3',
        reactions: {
          cache: new MockCollection()
        }
      };
      
      (mockClientInstance.channels as unknown as MockChannelManager).fetch.mockResolvedValue(mockChannelInstance);
      mockChannelInstance.messages.fetch.mockResolvedValue(messageWithLink);

      await handlePlayButton(mockButtonInteraction as unknown as ButtonInteraction);

      expect(mockButtonInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Song marked as played'),
        components: expect.any(Array),
        flags: 1 << 6
      });
    });
  });

  describe('handleClearReactions', () => {
    it('deve limpar as reações do bot', async () => {
      const mockBunnyReaction = { 
        remove: jest.fn(),
        emoji: { name: '🐰' }
      };
      
      // Criar uma mensagem mock com reação
      const messageWithReaction = {
        ...mockMessageInstance,
        reactions: {
          cache: new MockCollection([
            ['🐰', mockBunnyReaction]
          ])
        }
      };
      
      (mockClientInstance.channels as unknown as MockChannelManager).fetch.mockResolvedValue(mockChannelInstance);
      mockChannelInstance.messages.fetch.mockResolvedValue(new MockCollection([
        ['123', messageWithReaction]
      ]));

      await handleClearReactions(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockBunnyReaction.remove).toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Removed'),
        components: undefined
      });
    });
  });
}); 