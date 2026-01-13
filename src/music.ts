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

  // Collect all unplayed songs first
  const unplayedSongs = [];
  
  for (const msg of messages.values()) {
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
      
      unplayedSongs.push({
        message: msg,
        link: extractedLink
      });
    }
  }

  // If no unplayed songs found, return the "all played" message
  if (unplayedSongs.length === 0) {
    return { text: i18n.t('music.allPlayed') };
  }

  // Randomly select one song from the unplayed songs
  const randomIndex = Math.floor(Math.random() * unplayedSongs.length);
  const selectedSong = unplayedSongs[randomIndex];

  const playButton = new ButtonBuilder()
    .setCustomId(`play_${selectedSong.message.id}`)
    .setLabel('▶️ Play')
    .setStyle(ButtonStyle.Primary);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(playButton);
  
  return { 
    text: i18n.t('music.next', { 
      link: selectedSong.link, 
      messageUrl: selectedSong.message.url 
    }), 
    components: [row] 
  };
}

export async function handleNextSong(interaction: ChatInputCommandInteraction): Promise<void> {
  const { text, components } = await findNextSong(interaction.client);
  try {
    await interaction.reply({ content: text, components });
  } catch (error) {
    console.error('Error replying to next song interaction:', error);
  }
}

export async function handleClearReactions(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = await interaction.client.channels.fetch(MUSIC_CHANNEL_ID);
  if (!channel?.isTextBased()) {
    try {
      await interaction.reply({ content: i18n.t('music.channelError') });
    } catch (error) {
      console.error('Error replying to clear reactions interaction (channel error):', error);
    }
    return;
  }
  
  try {
    await interaction.deferReply();
  } catch (error) {
    console.error('Error deferring reply:', error);
    return;
  }
  
  const messages = await (channel as TextChannel).messages.fetch();
  let count = 0;
  for (const msg of messages.values()) {
    const bunnyReaction = msg.reactions.cache.find((r) => r.emoji.name === '🐰');
    if (bunnyReaction) {
      try {
        await bunnyReaction.remove();
        count++;
      } catch (error) {
        console.error('Error removing reaction:', error);
      }
    }
  }
  
  try {
    await interaction.editReply({
      content: i18n.t('music.reactionsCleared', { count })
    });
  } catch (error) {
    console.error('Error editing reply:', error);
  }
}



export async function handlePlayButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.customId.startsWith('play_')) return;

  const originalMessageId = interaction.customId.replace('play_', '');
  const channel = await interaction.client.channels.fetch(MUSIC_CHANNEL_ID);
  if (!channel?.isTextBased()) {
    try {
      await interaction.reply({ content: i18n.t('music.channelError'), flags: 1 << 6 });
    } catch (error) {
      console.error('Error replying to interaction (channel error):', error);
    }
    return;
  }

  let originalMsg: Message;
  try {
    originalMsg = await (channel as TextChannel).messages.fetch(originalMessageId);
  } catch (err) {
    try {
      await interaction.reply({ content: i18n.t('music.processError'), flags: 1 << 6 });
    } catch (error) {
      console.error('Error replying to interaction (process error):', error);
    }
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
    try {
      await interaction.reply({ content: i18n.t('music.extractError'), flags: 1 << 6 });
    } catch (error) {
      console.error('Error replying to interaction (extract error):', error);
    }
    return;
  }

  try {
    await originalMsg.react('🐰');
  } catch (error) {
    console.error('Error adding reaction to message:', error);
  }
  
  // Define o comando padrão se não estiver configurado
  const commandToUse = PLAYER_FORWARD_COMMAND || '/play';
  
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('🔗 Open song link')
      .setStyle(ButtonStyle.Link)
      .setURL(linkToPlay)
  );
  
  try {
    await interaction.reply({
      content: i18n.t('music.marked', {
        command: commandToUse,
        link: linkToPlay
      }),
      components: [row],
      flags: 1 << 6
    });
  } catch (error: unknown) {
    console.error('Error replying to interaction (final reply):', error);
    // Se a interação expirou, tenta enviar uma mensagem no canal
    if (error && typeof error === 'object' && 'code' in error && error.code === 10062) {
      try {
        await (channel as TextChannel).send({
          content: i18n.t('music.marked', {
            command: commandToUse,
            link: linkToPlay
          }),
          components: [row]
        });
      } catch (fallbackError) {
        console.error('Error sending fallback message:', fallbackError);
      }
    }
  }
}
