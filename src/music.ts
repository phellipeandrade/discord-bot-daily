import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  TextChannel
} from 'discord.js';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  DiscordGatewayAdapterCreator
} from '@discordjs/voice';
import play from 'play-dl';
import { i18n } from './i18n';
import { MUSIC_CHANNEL_ID, DAILY_VOICE_CHANNEL_ID } from './config';

export async function findNextSong(
  client: Client
): Promise<{ text: string; components?: ActionRowBuilder<ButtonBuilder>[] }> {
  if (!MUSIC_CHANNEL_ID) {
    return { text: i18n.t('music.channelError') };
  }

  const requestsChannel = await client.channels.fetch(MUSIC_CHANNEL_ID);
  if (!requestsChannel?.isTextBased()) {
    return { text: i18n.t('music.channelError') };
  }

  const messages = await (requestsChannel as TextChannel).messages.fetch({
    limit: 50
  });
  const bunny = '🐰';
  const linkRegex = /https?:\/\/\S+/i;

  for (const msg of Array.from(messages.values()).reverse()) {
    const bunnyReaction = msg.reactions.cache.find(
      (r) => r.emoji.name === bunny
    );
    const alreadyPlayed = !!bunnyReaction && bunnyReaction?.count > 0;
    if (alreadyPlayed) continue;

    const hasLinkInContent = linkRegex.test(msg.content);
    const hasEmbed = msg.embeds.length > 0;
    const hasAttachment = msg.attachments.size > 0;
    if (!hasLinkInContent && !hasEmbed && !hasAttachment) continue;

    let extractedLink: string;
    if (hasAttachment) {
      extractedLink = msg.attachments.first()!.url;
    } else if (hasLinkInContent) {
      extractedLink = linkRegex.exec(msg.content)![0];
    } else {
      const embed = msg.embeds[0];
      extractedLink = embed.url ?? embed.data?.url ?? '';
    }

    const playButton = new ButtonBuilder()
      .setCustomId(`play_${msg.id}`)
      .setLabel('▶️ Play')
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(playButton);

    return {
      text: i18n.t('music.next', { link: extractedLink, messageUrl: msg.url }),
      components: [row]
    };
  }

  return { text: i18n.t('music.allPlayed') };
}

export async function handleNextSong(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const { text, components } = await findNextSong(interaction.client);
  await interaction.reply({ content: text, components });
}

export async function handleClearReactions(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const channel = await interaction.client.channels.fetch(MUSIC_CHANNEL_ID);
  if (!channel?.isTextBased()) {
    await interaction.reply({
      content: i18n.t('music.channelError'),
      components: undefined
    });
    return;
  }

  try {
    const messages = await (channel as TextChannel).messages.fetch();
    let count = 0;

    for (const message of messages.values()) {
      const bunnyReaction = message.reactions.cache.find(
        (r) => r.emoji.name === '🐰'
      );
      if (bunnyReaction) {
        await bunnyReaction.remove();
        count++;
      }
    }

    await interaction.reply({
      content: i18n.t('music.reactionsCleared', { count }),
      components: undefined
    });
  } catch (error) {
    console.error('Error clearing reactions:', error);
    await interaction.reply({
      content: i18n.t('music.processError'),
      components: undefined
    });
  }
}

export let currentConnection: ReturnType<typeof joinVoiceChannel> | null = null;
export let currentPlayer: ReturnType<typeof createAudioPlayer> | null = null;

async function playUrl(client: Client, url: string): Promise<void> {
  if (!DAILY_VOICE_CHANNEL_ID) return;
  const channel = await client.channels.fetch(DAILY_VOICE_CHANNEL_ID);
  if (!channel || !channel.isVoiceBased()) return;
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator:
      channel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator
  });
  currentConnection = connection;
  try {
    const { stream, type } = await play.stream(url);
    const resource = createAudioResource(stream, { inputType: type });
    const player = createAudioPlayer();
    currentPlayer = player;
    connection.subscribe(player);
    player.play(resource);
    await entersState(player, AudioPlayerStatus.Idle, 30_000);
  } finally {
    connection.destroy();
    currentConnection = null;
    currentPlayer = null;
  }
}

export async function handleStopMusic(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (currentPlayer) currentPlayer.stop();
  if (currentConnection) currentConnection.destroy();
  currentPlayer = null;
  currentConnection = null;
  await interaction.reply(i18n.t('music.stopped'));
}

export async function handlePlayButton(
  interaction: ButtonInteraction
): Promise<void> {
  const customId = interaction.customId;
  if (!customId.startsWith('play_')) return;

  const originalMessageId = customId.replace('play_', '');
  const channel = await interaction.client.channels.fetch(MUSIC_CHANNEL_ID);

  if (!channel?.isTextBased()) {
    await interaction.reply({
      content: i18n.t('music.channelError'),
      flags: 1 << 6
    });
    return;
  }

  try {
    const originalMsg = await (channel as TextChannel).messages.fetch(
      originalMessageId
    );
    const linkRegex = /https?:\/\/\S+/i;
    let linkToPlay: string;

    if (originalMsg.attachments?.size > 0) {
      linkToPlay = originalMsg.attachments.first()!.url;
    } else if (linkRegex.test(originalMsg.content)) {
      const match = linkRegex.exec(originalMsg.content);
      linkToPlay = match![0];
    } else if (originalMsg.embeds?.length > 0) {
      const embed = originalMsg.embeds[0];
      linkToPlay = embed.url ?? embed.data?.url ?? '';
    } else {
      linkToPlay = '';
    }

    if (!linkToPlay) {
      await interaction.reply({
        content: i18n.t('music.extractError'),
        flags: 1 << 6
      });
      return;
    }

    await originalMsg.react('🐰');
    await playUrl(interaction.client, linkToPlay);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('🔗 Open song link')
        .setStyle(ButtonStyle.Link)
        .setURL(linkToPlay)
    );

    await interaction.reply({
      content: i18n.t('music.markedPlaying', { link: linkToPlay }),
      components: [row],
      flags: 1 << 6
    });
  } catch (error) {
    console.error('Error in play button: ', error);
    await interaction.reply({
      content: i18n.t('music.processError'),
      flags: 1 << 6
    });
  }
}
