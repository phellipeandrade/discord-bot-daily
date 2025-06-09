import { MockCollection } from './MockCollection';

export class MockActionRowBuilder {
  private readonly components: any[] = [];
  
  addComponents(...components: any[]) {
    this.components.push(...components);
    return this;
  }
}

export class MockButtonBuilder {
  private readonly data: any = {};
  
  setCustomId(customId: string) {
    this.data.customId = customId;
    return this;
  }

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

export class MockSlashCommandBuilder {
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

export const mockReactionCache = new MockCollection<string, { emoji: { name: string }, count: number }>([
  ['🐰', { emoji: { name: '🐰' }, count: 0 }]
]);

export const mockMessageTemplate = {
  id: '123',
  content: 'https://example.com/song',
  url: 'https://discord.com/channels/123/456/789',
  reactions: {
    cache: mockReactionCache
  },
  embeds: [],
  attachments: new Map(),
  react: jest.fn()
};

export const mockClient = {
  channels: {
    fetch: jest.fn()
  },
  user: {
    id: 'bot-id'
  }
};

export const mockChannel = {
  isTextBased: () => true,
  messages: {
    fetch: jest.fn()
  }
};

export const GatewayIntentBits = {
  Guilds: 1,
  GuildMessages: 2,
  MessageContent: 4,
  GuildMessageReactions: 8
};

export const Partials = {
  Message: 'Message',
  Channel: 'Channel',
  Reaction: 'Reaction'
};

export const ButtonStyle = {
  Primary: 1,
  Secondary: 2,
  Success: 3,
  Danger: 4,
  Link: 5
};

export const Client = jest.fn(() => mockClient);
export const TextChannel = jest.fn(() => mockChannel);
export const Message = jest.fn(() => ({ ...mockMessageTemplate }));
export const MessageReaction = jest.fn();
export const Collection = MockCollection;
export const ActionRowBuilder = MockActionRowBuilder;
export const ButtonBuilder = MockButtonBuilder;
export const SlashCommandBuilder = MockSlashCommandBuilder; 