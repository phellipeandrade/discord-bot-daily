import { handleNextSong, handlePlayButton, handleClearReactions, findNextSong } from '@/music';

// Mock do i18n
const mockTranslations: Record<string, string> = {
  'list.empty': '(none)',
  'music.noValidMusic': '✅ No valid music found.',
  'music.marked': '✅ Song marked as played!',
  'music.stopped': '⏹️ Music playback stopped.',
  'music.reactionsCleared': '✅ Removed {{count}} 🐰 reactions made by the bot.',
  'music.channelError': 'Could not access the music channel.',
  'music.processError': 'Error processing the music.',
  'music.extractError': 'Could not extract music link.',
  'music.next': '🎵 Next song: {{link}}',
  'music.allPlayed': '✅ All recent songs have been played.'
};

jest.mock('@/i18n', () => ({
  i18n: {
    t: jest.fn((key: string, params: Record<string, string | number> = {}) => {
      const text = mockTranslations[key] || key;
      return text.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
        const value = params[paramKey];
        return value !== undefined ? String(value) : `{{${paramKey}}}`;
      });
    })
  }
}));

// Mock do discord.js
jest.mock('discord.js', () => ({
  Client: jest.fn(),
  GatewayIntentBits: { Guilds: 1, GuildMessages: 2, GuildVoiceStates: 4, MessageContent: 8 },
  Message: jest.fn(),
  TextChannel: jest.fn(),
  ChatInputCommandInteraction: jest.fn(),
  Collection: jest.fn(),
  Attachment: jest.fn(),
  ButtonInteraction: jest.fn(),
  ApplicationCommandType: { ChatInput: 1 },
  ComponentType: { Button: 2 }
}));

// Mock do config
jest.mock('@/config', () => ({
  MUSIC_CHANNEL_ID: 'music-channel',
  PLAYER_FORWARD_COMMAND: '/play'
}));

describe('music handlers', () => {
  let mockInteraction: any;
  let mockButtonInteraction: any;
  let mockClient: any;
  let mockChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockChannel = {
      isTextBased: () => true,
      messages: {
        fetch: jest.fn().mockResolvedValue(new Map())
      },
      send: jest.fn()
    };

    mockClient = {
      channels: {
        fetch: jest.fn().mockResolvedValue(mockChannel)
      }
    };

    mockInteraction = {
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
      client: mockClient
    };

    mockButtonInteraction = {
      customId: 'play_123',
      reply: jest.fn(),
      client: mockClient
    };
  });

  describe('findNextSong', () => {
    it('should return channel error when MUSIC_CHANNEL_ID is not set', async () => {
      // Temporarily mock empty MUSIC_CHANNEL_ID
      jest.doMock('@/config', () => ({
        MUSIC_CHANNEL_ID: '',
        PLAYER_FORWARD_COMMAND: '/play'
      }));
      
      const { findNextSong } = await import('@/music');
      const result = await findNextSong(mockClient);
      
      expect(result.text).toBe(mockTranslations['music.channelError']);
      expect(result.components).toBeUndefined();
    });

    it('should return all played message when no unplayed songs exist', async () => {
      const messagesMap = new Map();
      mockChannel.messages.fetch.mockResolvedValue(messagesMap);

      const result = await findNextSong(mockClient);

      expect(result.text).toBe(mockTranslations['music.allPlayed']);
      expect(result.components).toBeUndefined();
    });

    it('should randomly select from multiple unplayed songs', async () => {
      // Mock Math.random to control randomization in test
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5); // Will select middle song

      const mockMessage1 = {
        id: 'msg1',
        content: 'https://youtube.com/song1',
        url: 'https://discord.com/msg1',
        reactions: { cache: new Map() },
        embeds: [],
        attachments: new Map()
      };

      const mockMessage2 = {
        id: 'msg2', 
        content: 'https://youtube.com/song2',
        url: 'https://discord.com/msg2',
        reactions: { cache: new Map() },
        embeds: [],
        attachments: new Map()
      };

      const mockMessage3 = {
        id: 'msg3',
        content: 'https://youtube.com/song3', 
        url: 'https://discord.com/msg3',
        reactions: { cache: new Map() },
        embeds: [],
        attachments: new Map()
      };

      const messagesMap = new Map([
        ['msg1', mockMessage1],
        ['msg2', mockMessage2], 
        ['msg3', mockMessage3]
      ]);

      mockChannel.messages.fetch.mockResolvedValue(messagesMap);

      const result = await findNextSong(mockClient);

      expect(result.text).toContain('https://youtube.com/song2');
      expect(result.components).toBeDefined();
      expect(result.components![0].components[0].data.custom_id).toBe('play_msg2');

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should skip songs that already have bunny reactions', async () => {
      const mockBunnyReaction = {
        emoji: { name: '🐰' },
        count: 1
      };

      const mockMessage1 = {
        id: 'msg1',
        content: 'https://youtube.com/song1',
        url: 'https://discord.com/msg1',
        reactions: { 
          cache: new Map([['🐰', mockBunnyReaction]])
        },
        embeds: [],
        attachments: new Map()
      };

      const mockMessage2 = {
        id: 'msg2',
        content: 'https://youtube.com/song2',
        url: 'https://discord.com/msg2', 
        reactions: { cache: new Map() },
        embeds: [],
        attachments: new Map()
      };

      const messagesMap = new Map([
        ['msg1', mockMessage1],
        ['msg2', mockMessage2]
      ]);

      mockChannel.messages.fetch.mockResolvedValue(messagesMap);

      const result = await findNextSong(mockClient);

      // Should select msg2 since msg1 has bunny reaction
      expect(result.text).toContain('https://youtube.com/song2');
      expect(result.components![0].components[0].data.custom_id).toBe('play_msg2');
    });
  });

  describe('handleNextSong', () => {
    it('should handle channel access error', async () => {
      mockClient.channels.fetch.mockResolvedValue(null);

      await handleNextSong(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.channelError'],
        components: undefined
      });
    });

    it('should handle non-text channel', async () => {
      const nonTextChannel = { isTextBased: () => false };
      mockClient.channels.fetch.mockResolvedValue(nonTextChannel);

      await handleNextSong(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.channelError'],
        components: undefined
      });
    });
  });

  describe('handleClearReactions', () => {
    it('should handle channel access error', async () => {
      mockClient.channels.fetch.mockResolvedValue(null);

      await handleClearReactions(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.channelError']
      });
    });

    it('should handle non-text channel', async () => {
      const nonTextChannel = { isTextBased: () => false };
      mockClient.channels.fetch.mockResolvedValue(nonTextChannel);

      await handleClearReactions(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.channelError']
      });
    });
  });

  describe('handlePlayButton', () => {
    it('should handle invalid custom ID', async () => {
      mockButtonInteraction.customId = 'invalid_id';

      await handlePlayButton(mockButtonInteraction);

      expect(mockButtonInteraction.reply).not.toHaveBeenCalled();
    });

    it('should handle channel access error', async () => {
      mockClient.channels.fetch.mockResolvedValue(null);

      await handlePlayButton(mockButtonInteraction);

      expect(mockButtonInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.channelError'],
        flags: 1 << 6
      });
    });

    it('should handle non-text channel', async () => {
      const nonTextChannel = { isTextBased: () => false };
      mockClient.channels.fetch.mockResolvedValue(nonTextChannel);

      await handlePlayButton(mockButtonInteraction);

      expect(mockButtonInteraction.reply).toHaveBeenCalledWith({
        content: mockTranslations['music.channelError'],
        flags: 1 << 6
      });
    });
  });
});
