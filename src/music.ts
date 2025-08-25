import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  TextChannel,
  Message,
} from 'discord.js';

import { i18n } from '@/i18n';
import {
  MUSIC_CHANNEL_ID,
  PLAYER_FORWARD_COMMAND
} from '@/config';




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

    if (
      linkRegex.test(msg.content) ||
      msg.embeds.length > 0 ||
      msg.attachments.size > 0
    ) {
      const attachment =
        msg.attachments.size > 0
          ? Array.from(msg.attachments.values())[0]
          : undefined;
      const extractedLink =
        attachment?.url ||
        linkRegex.exec(msg.content)?.[0] ||
        msg.embeds[0]?.url ||
        '';
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
  await interaction.deferReply();
  const messages = await (channel as TextChannel).messages.fetch();
  let count = 0;
  for (const msg of messages.values()) {
    const bunnyReaction = msg.reactions.cache.find((r) => r.emoji.name === '🐰');
    if (bunnyReaction) {
      await bunnyReaction.remove();
      count++;
    }
  }
  await interaction.editReply({
    content: i18n.t('music.reactionsCleared', { count })
  });
}



export async function handlePlayButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.customId.startsWith('play_')) return;

  const originalMessageId = interaction.customId.replace('play_', '');
  const channel = await interaction.client.channels.fetch(MUSIC_CHANNEL_ID);
  if (!channel?.isTextBased()) {
    await interaction.reply({ content: i18n.t('music.channelError'), flags: 1 << 6 });
    return;
  }

  let originalMsg: Message;
  try {
    originalMsg = await (channel as TextChannel).messages.fetch(originalMessageId);
  } catch (err) {
    await interaction.reply({ content: i18n.t('music.processError'), flags: 1 << 6 });
    return;
  }
  const linkRegex = /https?:\/\/\S+/i;
  const attachment = originalMsg.attachments.size > 0 ? Array.from(originalMsg.attachments.values())[0] : undefined;
  const linkToPlay =
    attachment?.url
    || linkRegex.exec(originalMsg.content)?.[0]
    || originalMsg.embeds[0]?.url
    || '';

  if (!linkToPlay) {
    await interaction.reply({ content: i18n.t('music.extractError'), flags: 1 << 6 });
    return;
  }

  await originalMsg.react('🐰');
  
  // Define o comando padrão se não estiver configurado
  const commandToUse = PLAYER_FORWARD_COMMAND || '/play';
  
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('🔗 Open song link')
      .setStyle(ButtonStyle.Link)
      .setURL(linkToPlay)
  );
  
  await interaction.reply({
    content: i18n.t('music.marked', {
      command: commandToUse,
      link: linkToPlay
    }),
    components: [row],
    flags: 1 << 6
  });
}
