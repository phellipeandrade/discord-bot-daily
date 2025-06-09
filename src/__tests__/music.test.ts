import { handleNextSong, handlePlayButton, handleClearReactions } from '../index';
import { Client, GatewayIntentBits } from 'discord.js';
import { MockCollection } from './__mocks__/MockCollection';
import { mockChannel, mockMessageTemplate } from './__mocks__/discord.js';

// Mock classes
class MockActionRowBuilder {
  private readonly components: any[] = [];
  
  addComponents(...components: any[]) {
    this.components.push(...components);
    return this;
  }
}

class MockButtonBuilder {
  private readonly data: any = {};
  
  setLabel(label: string) {
    this.data.label = label;
    return this;
  }
  
  setStyle(style: any) {
    this.data.style = style;
    return this;
  }
  
  setURL(url: string) {
    this.data.url = url;
    return this;
  }
}

class MockSlashCommandBuilder {
  private name = '';
  private description = '';
  private readonly options: any[] = [];

  setName(name: string) {
    this.name = name;
    return this;
  }

  setDescription(description: string) {
    this.description = description;
    return this;
  }

  addStringOption(fn: (option: any) => any) {
    const option = {
      name: '',
      description: '',
      required: false,
      setName(name: string) {
        this.name = name;
        return this;
      },
      setDescription(description: string) {
        this.description = description;
        return this;
      },
      setRequired(required: boolean) {
        this.required = required;
        return this;
      }
    };
    this.options.push(fn(option));
    return this;
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      options: this.options
    };
  }
}

// Mock do i18n
jest.mock('../i18n', () => ({
  i18n: {
    t: jest.fn((key: string, params: Record<string, any> = {}) => {
      const translations: Record<string, string> = {
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

      let text = translations[key] || key;
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);
    }),
    getCommandName: jest.fn((command: string) => command),
    getCommandDescription: jest.fn((command: string) => `Command ${command}`),
    getOptionName: jest.fn((command: string, option: string) => option),
    getOptionDescription: jest.fn((command: string, option: string) => `Option ${option}`),
    setLanguage: jest.fn((lang: 'en' | 'pt-br') => {})
  }
}));

// Mock do Discord.js
jest.mock('discord.js');

describe('Comandos de Música', () => {
  let mockInteraction: any;
  let mockClientInstance: any;
  let mockChannelInstance: any;
  let mockMessageInstance: any;
  let originalConsoleError: any;

  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = jest.fn();
    
    jest.clearAllMocks();

    mockClientInstance = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
      ]
    });
    mockChannelInstance = { ...mockChannel };
    mockMessageInstance = {
      ...mockMessageTemplate,
      attachments: new Map(),
      react: jest.fn().mockResolvedValue(undefined),
      content: 'https://example.com/song',
      embeds: []
    };

    mockInteraction = {
      client: mockClientInstance,
      reply: jest.fn(),
      customId: '',
      options: {
        getString: jest.fn()
      }
    };

    mockClientInstance.channels.fetch.mockResolvedValue(mockChannelInstance);
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('handleNextSong', () => {
    it('deve retornar erro se não conseguir acessar o canal', async () => {
      mockClientInstance.channels.fetch.mockResolvedValue(null);

      await handleNextSong(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Could not access the music channel.',
        components: undefined
      });
    });

    it('deve retornar erro se o canal não for de texto', async () => {
      mockChannelInstance.isTextBased = () => false;
      mockClientInstance.channels.fetch.mockResolvedValue(mockChannelInstance);

      await handleNextSong(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Could not access the music channel.',
        components: undefined
      });
    });

    it('deve encontrar a próxima música não marcada', async () => {
      mockClientInstance.channels.fetch.mockResolvedValue(mockChannelInstance);
      mockChannelInstance.messages.fetch.mockResolvedValue(new MockCollection([
        ['123', mockMessageInstance]
      ]));

      await handleNextSong(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '🎵 Next song: https://example.com/song\n\n📎 Message link: https://discord.com/channels/123/456/789',
        components: expect.any(Array)
      });
    });

    it('deve informar quando todas as músicas foram tocadas', async () => {
      mockMessageInstance.reactions.cache.set('🐰', { emoji: { name: '🐰' }, count: 1 });
      mockClientInstance.channels.fetch.mockResolvedValue(mockChannelInstance);
      mockChannelInstance.messages.fetch.mockResolvedValue(new MockCollection([
        ['123', mockMessageInstance]
      ]));

      await handleNextSong(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '✅ All recent songs have been played.',
        components: undefined
      });
    });
  });

  describe('handlePlayButton', () => {
    it('deve marcar a música como tocada', async () => {
      const messageId = '123';
      const mockMessage = { 
        id: messageId,
        content: 'https://example.com/song',
        react: jest.fn().mockResolvedValue(undefined),
        attachments: {
          size: 0
        },
        embeds: []
      };

      mockInteraction = {
        ...mockInteraction,
        customId: `play_${messageId}`,
        client: mockClientInstance
      };

      mockClientInstance.channels.fetch.mockResolvedValue(mockChannelInstance);
      mockChannelInstance.messages.fetch.mockResolvedValue(mockMessage);

      await handlePlayButton(mockInteraction);

      expect(mockMessage.react).toHaveBeenCalledWith('🐰');
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '✅ Song marked as played!\n\n🎵 To play the song in the bot, copy and send the command below:\n```\n/play https://example.com/song\n```',
        components: expect.any(Array),
        flags: 1 << 6
      });
    });

    it('deve lidar com erro ao processar a música', async () => {
      const messageId = '123';
      mockInteraction = {
        ...mockInteraction,
        customId: `play_${messageId}`,
        client: mockClientInstance
      };

      mockClientInstance.channels.fetch.mockResolvedValue(mockChannelInstance);
      mockChannelInstance.messages.fetch.mockRejectedValue(new Error('Test error'));

      await handlePlayButton(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Error processing the music.',
        flags: 1 << 6
      });
    });
  });

  describe('handleClearReactions', () => {
    it('deve limpar as reações do bot', async () => {
      const mockBunnyReaction = {
        emoji: { name: '🐰' },
        remove: jest.fn().mockResolvedValue(undefined)
      };

      const mockMessage = {
        ...mockMessageInstance,
        reactions: {
          cache: {
            find: jest.fn().mockReturnValue(mockBunnyReaction)
          }
        }
      };

      mockClientInstance.channels.fetch.mockResolvedValue(mockChannelInstance);
      mockChannelInstance.messages.fetch.mockResolvedValue(new MockCollection([
        ['123', mockMessage]
      ]));

      await handleClearReactions(mockInteraction);

      expect(mockBunnyReaction.remove).toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '✅ Removed 1 🐰 reactions made by the bot.',
        components: undefined
      });
    });
  });
}); 