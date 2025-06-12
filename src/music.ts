import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  TextChannel,
  ChannelType
} from 'discord.js';
import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import ffmpegPath from 'ffmpeg-static';
import { i18n } from './i18n';
import { MUSIC_CHANNEL_ID, DAILY_VOICE_CHANNEL_ID } from './config';

if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}

// centraliza instância do player
export const musicPlayer = { instance: null as Player | null };

function getPlayer(client: Client): Player {
  if (!musicPlayer.instance) {
    const player = new Player(client);
    // carrega todos extractors padrão (Spotify, SoundCloud, etc)
    player.extractors.loadMulti(DefaultExtractors);
    // adiciona suporte ao YouTube
    player.extractors.register(YoutubeiExtractor, {});
    musicPlayer.instance = player;
  }
  return musicPlayer.instance;
}

// Função de reprodução na voz
async function playUrl(client: Client, url: string): Promise<void> {
  console.log('🔊 Entrando em playUrl com URL:', url);
  if (!DAILY_VOICE_CHANNEL_ID) {
    console.warn('⚠️ DAILY_VOICE_CHANNEL_ID não configurado');
    return;
  }
  const channel = await client.channels.fetch(DAILY_VOICE_CHANNEL_ID);
  if (!channel || channel.type !== ChannelType.GuildVoice) {
    console.warn('⚠️ Canal não é um canal de voz guild ou não encontrado');
    return;
  }
  const player = getPlayer(client);
  await player.play(channel, url, {
    nodeOptions: {
      leaveOnEnd: true,
      leaveOnStop: true
    }
  });
}

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

  const messages = await (requestsChannel as TextChannel).messages.fetch({ limit: 50 });
  const bunny = '🐰';
  const linkRegex = /https?:\/\/\S+/i;

  for (const msg of Array.from(messages.values()).reverse()) {
    const bunnyReaction = msg.reactions.cache.find((r) => r.emoji.name === bunny);
    if (bunnyReaction && bunnyReaction.count > 0) continue;

    if (linkRegex.test(msg.content) || msg.embeds.length > 0 || msg.attachments.size > 0) {
      const extractedLink = msg.attachments.first()?.url
        || linkRegex.exec(msg.content)![0]
        || msg.embeds[0].url
        || '';
      const playButton = new ButtonBuilder()
        .setCustomId(`play_${msg.id}`)
        .setLabel('▶️ Play')
        .setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(playButton);
      return { text: i18n.t('music.next', { link: extractedLink, messageUrl: msg.url }), components: [row] };
    }
  }

  return { text: i18n.t('music.allPlayed') };
}

export async function handleNextSong(interaction: ChatInputCommandInteraction): Promise<void> {
  const { text, components } = await findNextSong(interaction.client);
  await interaction.reply({ content: text, components });
}

export async function handleClearReactions(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = await interaction.client.channels.fetch(MUSIC_CHANNEL_ID);
  if (!channel?.isTextBased()) {
    await interaction.reply({ content: i18n.t('music.channelError') });
    return;
  }
  const messages = await (channel as TextChannel).messages.fetch();
  let count = 0;
  for (const msg of messages.values()) {
    const bunnyReaction = msg.reactions.cache.find((r) => r.emoji.name === '🐰');
    if (bunnyReaction) {
      await bunnyReaction.remove();
      count++;
    }
  }
  await interaction.reply({ content: i18n.t('music.reactionsCleared', { count }) });
}

export async function handleStopMusic(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = getPlayer(interaction.client);
  const queue = interaction.guildId ? player.nodes.get(interaction.guildId) : null;
  if (queue) queue.delete();
  await interaction.reply(i18n.t('music.stopped'));
}

export async function handlePlayButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.customId.startsWith('play_')) return;

  const originalMessageId = interaction.customId.replace('play_', '');
  const channel = await interaction.client.channels.fetch(MUSIC_CHANNEL_ID);
  if (!channel?.isTextBased()) {
    await interaction.reply({ content: i18n.t('music.channelError'), flags: 1 << 6 });
    return;
  }

  const originalMsg = await (channel as TextChannel).messages.fetch(originalMessageId);
  const linkRegex = /https?:\/\/\S+/i;
  const linkToPlay =
    originalMsg.attachments.first()?.url
    || linkRegex.exec(originalMsg.content)?.[0]
    || originalMsg.embeds[0]?.url
    || '';

  if (!linkToPlay) {
    await interaction.reply({ content: i18n.t('music.extractError'), flags: 1 << 6 });
    return;
  }

  await originalMsg.react('🐰');
  try {
    await playUrl(interaction.client, linkToPlay);
    console.log('✅ playUrl finalizado com sucesso');
  } catch (err) {
    console.error('❌ erro em playUrl:', err);
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel('🔗 Open song link').setStyle(ButtonStyle.Link).setURL(linkToPlay)
  );

  await interaction.reply({
    content: i18n.t('music.markedPlaying', { link: linkToPlay }),
    components: [row],
    flags: 1 << 6
  });
}
