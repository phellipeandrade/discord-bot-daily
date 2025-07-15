import {
  handleNextSong,
  handlePlayButton,
  handleClearReactions
} from '@/index';
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
import { MockCollection } from '@/__tests__/__mocks__/MockCollection';
import { mockChannel, mockMessageTemplate } from '@/__tests__/__mocks__/discord.js';

// Mock do i18n
var mockTranslations: Record<string, string>;
jest.mock('@/i18n', () => {
  mockTranslations = {
    'list.empty': '(none)',
    'music.noValidMusic': '✅ No valid music found.',
    'music.marked':
      '✅ Song marked as played!\n\n🎵 To play the song in the bot, copy and send the command below:\n```\n{{command}} {{link}}\n```',
    'music.markedPlaying':
      '✅ Song marked as played!\n\n🎵 Playing in the voice channel.',
    'music.forwarded':
      '✅ Song marked as played!\n\n🎵 Copy and send the command below:\n```\n{{command}} {{link}}\n```',
    'music.stopped': '⏹️ Music playback stopped.',
    'music.reactionsCleared':
      '✅ Removed {{count}} 🐰 reactions made by the bot.',
    'music.channelError': 'Could not access the music channel.',
    'music.processError': 'Error processing the music.',
    'music.extractError': 'Could not extract music link.',
    'music.next': '🎵 Next song: {{link}}\n\n📎 Message link: {{messageUrl}}',
    'music.allPlayed': '✅ All recent songs have been played.'
  };

  return {
    i18n: {
      t: jest.fn(
        (key: string, params: Record<string, string | number> = {}) => {
          const text = mockTranslations[key] || key;
          return text.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
            const value = params[paramKey];
            return value !== undefined ? String(value) : `{{${paramKey}}}`;
          });
        }
      ),
      getCommandName: jest.fn((command: string) => command),
      getCommandDescription: jest.fn((command: string) => `Command ${command}`),
      getOptionName: jest.fn((command: string, option: string) => option),
      getOptionDescription: jest.fn(
        (command: string, option: string) => `Option ${option}`
      ),
      setLanguage: jest.fn(() => undefined)
    }
  };
});

// Mock de bibliotecas de player
jest.mock('discord-player', () => ({
  Player: jest.fn().mockImplementation(() => ({
    extractors: { register: jest.fn() },
    play: jest.fn(),
    nodes: new Map()
  }))
}));
jest.mock('discord-player-youtubei', () => ({ YoutubeiExtractor: {} }));
// Mock do Discord.js
jest.mock('discord.js');

type PartialMessage = Pick<Message, 'content' | 'embeds' | 'id' | 'url'>;

interface MockMessage extends PartialMessage {
  attachments: Collection<string, Attachment>;
  react: jest.Mock;
  reactions: {
    cache: Collection<
      string,
      {
        remove: jest.Mock;
        emoji?: { name: string };
        count?: number;
      }
    >;
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
  isVoiceBased?: () => boolean;
  guild?: { id: string; voiceAdapterCreator: unknown };
  messages: MockMessageManager;
  send: jest.Mock;
}

type BaseMockInteraction = Omit<
  ChatInputCommandInteraction<CacheType>,
  'client' | 'reply' | 'options'
>;

interface MockInteractionOptions extends CommandInteractionOptionResolver {
  getString: jest.Mock;
  getBoolean: jest.Mock;
}

interface MockInteraction extends BaseMockInteraction {
  client: Client<true>;
  reply: jest.Mock;
  deferReply: jest.Mock;
  editReply: jest.Mock;
  options: MockInteractionOptions;
}

interface MockButtonInteraction
  extends Omit<
    ButtonInteraction<CacheType>,
    'client' | 'reply' | 'componentType' | 'component'
  > {
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
  let mockVoiceChannelInstance: MockChannel;
  let mockMessageInstance: MockMessage;
  let originalConsoleError: typeof console.error;

  beforeEach(async () => {
    originalConsoleError = console.error;
    console.error = jest.fn();

    jest.clearAllMocks();

    const config = await import('@/config');
    config.MUSIC_CHANNEL_ID = 'requests';
    config.DAILY_VOICE_CHANNEL_ID = 'dailyVoice';
    config.PLAYER_FORWARD_COMMAND = '';

    mockClientInstance = {
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
      ],
      channels: {
        fetch: jest.fn()
      }
    } as unknown as Client<true>;

    mockChannelInstance = {
      ...mockChannel,
      isTextBased: function (this: MockChannel): this is TextChannel {
        return true;
      },
      messages: {
        fetch: jest.fn()
      },
      send: jest.fn()
    };
  mockVoiceChannelInstance = {
    ...mockChannel,
    isTextBased: function (this: MockChannel): this is TextChannel {
      return true;
    },
    isVoiceBased: () => true,
    guild: { id: 'g', voiceAdapterCreator: {} },
    messages: { fetch: jest.fn() },
    send: jest.fn()
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
      getString: jest.fn(),
      getBoolean: jest.fn()
    } as unknown as MockInteractionOptions;

    mockInteraction = {
      client: mockClientInstance,
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
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

    (
      mockClientInstance.channels as unknown as MockChannelManager
    ).fetch.mockImplementation((id: string) => {
      if (id === 'requests') return Promise.resolve(mockChannelInstance);
      if (id === 'dailyVoice') return Promise.resolve(mockVoiceChannelInstance);
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('handleNextSong', () => {
    it('deve retornar erro se não conseguir acessar o canal', async () => {
      (
        mockClientInstance.channels as unknown as MockChannelManager
      ).fetch.mockResolvedValue(null);

      await handleNextSong(
        mockInteraction as unknown as ChatInputCommandInteraction
      );

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
      (
        mockClientInstance.channels as unknown as MockChannelManager
      ).fetch.mockResolvedValue(nonTextChannel);

      await handleNextSong(
        mockInteraction as unknown as ChatInputCommandInteraction
      );

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.channelError'],
        components: undefined
      });
    });

    it('deve encontrar a próxima música não marcada', async () => {
      (
        mockClientInstance.channels as unknown as MockChannelManager
      ).fetch.mockImplementation((id: string) => {
        if (id === 'requests') return Promise.resolve(mockChannelInstance);
        if (id === 'dailyVoice') return Promise.resolve(mockVoiceChannelInstance);
        return Promise.resolve(null);
      });
      mockChannelInstance.messages.fetch.mockResolvedValue(
        new MockCollection([['123', mockMessageInstance]])
      );

      await handleNextSong(
        mockInteraction as unknown as ChatInputCommandInteraction
      );

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
      (
        mockClientInstance.channels as unknown as MockChannelManager
      ).fetch.mockImplementation((id: string) => {
        if (id === 'requests') return Promise.resolve(mockChannelInstance);
        if (id === 'dailyVoice') return Promise.resolve(mockVoiceChannelInstance);
        return Promise.resolve(null);
      });
      mockChannelInstance.messages.fetch.mockResolvedValue(
        new MockCollection([['123', mockMessageInstance]])
      );

      await handleNextSong(
        mockInteraction as unknown as ChatInputCommandInteraction
      );

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.allPlayed'],
        components: undefined
      });
    });
  });

  describe('handlePlayButton', () => {
    it('deve marcar a música como tocada', async () => {
      (
        mockClientInstance.channels as unknown as MockChannelManager
      ).fetch.mockImplementation((id: string) => {
        if (id === 'requests') return Promise.resolve(mockChannelInstance);
        if (id === 'dailyVoice') return Promise.resolve(mockVoiceChannelInstance);
        return Promise.resolve(null);
      });
      mockChannelInstance.messages.fetch.mockResolvedValue(mockMessageInstance);

      await handlePlayButton(
        mockButtonInteraction as unknown as ButtonInteraction
      );
      expect(mockMessageInstance.react).toHaveBeenCalledWith('🐰');
      expect(mockButtonInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Song marked as played'),
        components: expect.any(Array),
        flags: 1 << 6
      });
    });

    it('deve orientar a usar outro bot quando configurado', async () => {
      const config = await import('@/config');
      config.PLAYER_FORWARD_COMMAND = '/play';

      (
        mockClientInstance.channels as unknown as MockChannelManager
      ).fetch.mockImplementation((id: string) => {
        if (id === 'requests') return Promise.resolve(mockChannelInstance);
        if (id === 'dailyVoice') return Promise.resolve(mockVoiceChannelInstance);
        return Promise.resolve(null);
      });
      mockChannelInstance.messages.fetch.mockResolvedValue(mockMessageInstance);

      await handlePlayButton(
        mockButtonInteraction as unknown as ButtonInteraction
      );

      expect(mockVoiceChannelInstance.send).not.toHaveBeenCalled();
      const expectedMsg = mockTranslations['music.marked']
        .replace('{{command}}', '/play')
        .replace('{{link}}', 'https://example.com/song');
      expect(mockButtonInteraction.reply).toHaveBeenCalledWith({
        content: expectedMsg,
        components: expect.any(Array),
        flags: 1 << 6
      });
    });


    it('deve lidar com erro ao processar a música', async () => {
      (
        mockClientInstance.channels as unknown as MockChannelManager
      ).fetch.mockImplementation((id: string) => {
        if (id === 'requests') return Promise.resolve(mockChannelInstance);
        if (id === 'dailyVoice') return Promise.resolve(mockVoiceChannelInstance);
        return Promise.resolve(null);
      });
      mockChannelInstance.messages.fetch.mockRejectedValue(
        new Error('Test error')
      );

      await handlePlayButton(
        mockButtonInteraction as unknown as ButtonInteraction
      );

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

      (
        mockClientInstance.channels as unknown as MockChannelManager
      ).fetch.mockImplementation((id: string) => {
        if (id === 'requests') return Promise.resolve(mockChannelInstance);
        if (id === 'dailyVoice') return Promise.resolve(mockVoiceChannelInstance);
        return Promise.resolve(null);
      });
      mockChannelInstance.messages.fetch.mockResolvedValue(messageWithLink);

      await handlePlayButton(
        mockButtonInteraction as unknown as ButtonInteraction
      );

      expect(mockButtonInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Song marked as played'),
        components: expect.any(Array),
        flags: 1 << 6
      });
    });
  });

  describe('handleStopMusic', () => {
    it('deve parar a reprodução e responder', async () => {
      const music = await import('@/music');
      const queue = { delete: jest.fn() } as any;
      music.musicPlayer.instance = {
        extractors: { register: jest.fn() },
        play: jest.fn(),
        nodes: new Map([["guild", queue]])
      } as any;
      const interaction = {
        reply: jest.fn(),
        guildId: 'guild',
        client: {} as Client
      } as unknown as ChatInputCommandInteraction;
      await music.handleStopMusic(interaction);
      expect(queue.delete).toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        mockTranslations['music.stopped']
      );
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
          cache: new MockCollection([['🐰', mockBunnyReaction]])
        }
      };

      (
        mockClientInstance.channels as unknown as MockChannelManager
      ).fetch.mockImplementation((id: string) => {
        if (id === 'requests') return Promise.resolve(mockChannelInstance);
        if (id === 'dailyVoice') return Promise.resolve(mockVoiceChannelInstance);
        return Promise.resolve(null);
      });
      mockChannelInstance.messages.fetch.mockResolvedValue(
        new MockCollection([['123', messageWithReaction]])
      );

      await handleClearReactions(
        mockInteraction as unknown as ChatInputCommandInteraction
      );

      expect(mockBunnyReaction.remove).toHaveBeenCalled();
      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Removed'),
        components: undefined
      });
    });

    it('deve retornar erro se não conseguir acessar o canal', async () => {
      (mockClientInstance.channels as unknown as MockChannelManager).fetch.mockResolvedValueOnce(null);

      await handleClearReactions(
        mockInteraction as unknown as ChatInputCommandInteraction
      );

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.channelError']
      });
    });

    it('deve informar quando nenhuma reação foi removida', async () => {
      const messageWithoutReaction = {
        ...mockMessageInstance,
        reactions: { cache: new MockCollection() }
      };

      (mockClientInstance.channels as unknown as MockChannelManager).fetch.mockResolvedValue(mockChannelInstance);
      mockChannelInstance.messages.fetch.mockResolvedValue(
        new MockCollection([['123', messageWithoutReaction]])
      );

      await handleClearReactions(
        mockInteraction as unknown as ChatInputCommandInteraction
      );

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: mockTranslations['music.reactionsCleared'].replace('{{count}}', '0'),
        components: undefined
      });
    });
  });
});
