require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const { Player } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const TEST_URL = process.env.TEST_URL;

async function main() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates
    ]
  });

  const player = new Player(client);
  player.extractors.register(YoutubeiExtractor);

  client.once('ready', async () => {
    console.log(`🤖 Logado como ${client.user.tag}`);
    const guild = await client.guilds.fetch(GUILD_ID);
    const voiceChannel = await guild.channels.fetch(VOICE_CHANNEL_ID);

    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
      console.error('❌ Canal especificado não é um canal de voz guild.');
      process.exit(1);
    }

    try {
      console.log(`🔊 Tocando: ${TEST_URL}`);
      await player.play(voiceChannel, TEST_URL);
      console.log('✅ Reprodução iniciada com sucesso!');
    } catch (e) {
      console.error('❌ Erro ao reproduzir:', e);
    }
  });

  await client.login(TOKEN);
}

main();
