import { handleNextSong, handlePlayButton, handleClearReactions } from '@/music';

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
