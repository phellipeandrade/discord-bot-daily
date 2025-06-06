import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Partials,
  ButtonInteraction,
} from 'discord.js';
import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { isHoliday } from './holidays';

dotenv.config();

// =================== CONFIG ===================
const TOKEN = process.env.DISCORD_TOKEN!;
const CHANNEL_ID = process.env.CHANNEL_ID!;
const GUILD_ID = process.env.GUILD_ID!;
const MUSIC_CHANNEL_ID = process.env.MUSIC_CHANNEL_ID!;
const USERS_FILE = path.join(__dirname, 'users.json');
const TIMEZONE = 'America/Sao_Paulo';

// =================== Interfaces ===================
export interface UserEntry {
  name: string;
  id: string;
}

export interface UserData {
  all: UserEntry[];
  remaining: UserEntry[];
  lastSelected?: UserEntry;
}

// =================== Utilitários ===================
function carregarUsuarios(): UserData {
  if (!fs.existsSync(USERS_FILE)) {
    const vazio: UserData = { all: [], remaining: [] };
    fs.writeFileSync(USERS_FILE, JSON.stringify(vazio, null, 2));
    return vazio;
  }
  try {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    if (!Array.isArray(data.all) || !Array.isArray(data.remaining)) {
      throw new Error('Formato de dados inválido');
    }
    const validarUsuario = (user: any): user is UserEntry =>
      typeof user === 'object' &&
      user !== null &&
      typeof user.name === 'string' &&
      typeof user.id === 'string';

    if (!data.all.every(validarUsuario) || !data.remaining.every(validarUsuario)) {
      throw new Error('Formato de usuário inválido');
    }
    return data;
  } catch {
    const vazio: UserData = { all: [], remaining: [] };
    fs.writeFileSync(USERS_FILE, JSON.stringify(vazio, null, 2));
    return vazio;
  }
}

function salvarUsuarios(data: UserData): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function escolherUsuario(data: UserData): UserEntry {
  if (data.remaining.length === 0) {
    data.remaining = [...data.all];
  }
  const index = Math.floor(Math.random() * data.remaining.length);
  const escolhido = data.remaining.splice(index, 1)[0];
  data.lastSelected = escolhido;
  salvarUsuarios(data);
  return escolhido;
}

export function formatarUsuarios(lista: UserEntry[]): string {
  return lista.length
    ? lista
        .map(u => (typeof u?.name === 'string' ? `• ${u.name}` : '• [inválido]'))
        .join('\n')
    : '(nenhum)';
}

// =================== Handlers ===================
async function handleCadastrar(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const userName = interaction.options.getString('nome', true);
  const userId = interaction.user.id;

  if (!data.all.some(u => u.id === userId)) {
    const novo: UserEntry = { name: userName, id: userId };
    data.all.push(novo);
    data.remaining.push(novo);
    salvarUsuarios(data);
    await interaction.reply(`✅ Usuário \`${userName}\` cadastrado com sucesso.`);
  } else {
    await interaction.reply(`⚠️ O usuário \`${userName}\` já está cadastrado.`);
  }
}

async function handleEntrar(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const displayName = interaction.user.username;
  const userId = interaction.user.id;

  if (!data.all.some(u => u.id === userId)) {
    const novo: UserEntry = { name: displayName, id: userId };
    data.all.push(novo);
    data.remaining.push(novo);
    salvarUsuarios(data);
    await interaction.reply(`✅ Você (${displayName}) foi cadastrado com sucesso.`);
  } else {
    await interaction.reply(`⚠️ Você (${displayName}) já está cadastrado.`);
  }
}

async function handleRemover(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const userName = interaction.options.getString('nome', true);
  data.all = data.all.filter(u => u.name !== userName);
  data.remaining = data.remaining.filter(u => u.name !== userName);
  salvarUsuarios(data);
  await interaction.reply(`🗑️ Usuário \`${userName}\` removido com sucesso.`);
}

async function handleListar(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const todos = formatarUsuarios(data.all);
  const pendentes = formatarUsuarios(data.remaining);
  const jaSelecionados = data.all.filter(u => !data.remaining.some(r => r.id === u.id));
  const selecionados = formatarUsuarios(jaSelecionados);
  await interaction.reply({
    content: `📋 **Cadastrados:**\n${todos}\n\n🔄 **Ainda não sorteados:**\n${pendentes}\n\n✅ **Já sorteados:**\n${selecionados}`,
    flags: 1 << 6
  });
}

async function handleSelecionar(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const escolhido = escolherUsuario(data);
  await interaction.reply(`🎯 O próximo selecionado é: <@${escolhido.id}> (**${escolhido.name}**)`);
}

async function handleResetar(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  try {
    const originalData = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.original.json'), 'utf-8'));
    salvarUsuarios(originalData);
    await interaction.reply(`🔄 Lista resetada ao estado original com ${originalData.all.length} usuários.`);
  } catch {
    data.remaining = [...data.all];
    salvarUsuarios(data);
    await interaction.reply(`🔄 Lista resetada! Todos os ${data.all.length} usuários estão disponíveis novamente.`);
  }
}

async function buscarProximaMusica(): Promise<{ texto: string; componentes?: ActionRowBuilder<ButtonBuilder>[] }> {
  const pedidosChannel = await client.channels.fetch(MUSIC_CHANNEL_ID);
  if (!pedidosChannel?.isTextBased()) {
    return { texto: '✅ Nenhuma música válida encontrada.' };
  }

  const messages = await (pedidosChannel as TextChannel).messages.fetch({ limit: 50 });
  const coelhinho = '🐰';
  const linkRegex = /https?:\/\/\S+/i;

  for (const msg of Array.from(messages.values()).reverse()) {
    const coelho = msg.reactions.cache.find(r => r.emoji.name === coelhinho);
    const jaTocada = !!coelho && coelho?.count > 0;
    if (jaTocada) continue;

    const temLinkNoContent = linkRegex.test(msg.content);
    const temEmbed = msg.embeds.length > 0;
    const temAttachment = msg.attachments.size > 0;
    if (!temLinkNoContent && !temEmbed && !temAttachment) continue;

    let linkExtraido: string;
    if (temAttachment) {
      linkExtraido = msg.attachments.first()!.url;
    } else if (temLinkNoContent) {
      linkExtraido = linkRegex.exec(msg.content)![0];
    } else {
      const embed = msg.embeds[0];
      linkExtraido = embed.url ?? embed.data?.url ?? '';
    }

    const buttonTocar = new ButtonBuilder()
      .setCustomId(`play_${msg.id}`)
      .setLabel('▶️ Tocar música')
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttonTocar);

    const textoCompleto = `🎶 Próxima música: ${linkExtraido}\n🔗 [Ir para a mensagem original](${msg.url})`;
    return { texto: textoCompleto, componentes: [row] };
  }

  return { texto: '✅ Todas as últimas músicas válidas já foram tocadas!' };
}

async function handleProximaMusica(interaction: ChatInputCommandInteraction): Promise<void> {
  const { texto, componentes } = await buscarProximaMusica();
  await interaction.reply({ content: texto, components: componentes });
}

async function handleLimparCoelhinhos(interaction: ChatInputCommandInteraction): Promise<void> {
  // 1) Recupera o canal de pedidos de música
  const pedidosChannel = await interaction.client.channels.fetch(MUSIC_CHANNEL_ID);
  if (!pedidosChannel?.isTextBased()) {
    await interaction.reply('❌ Não foi possível acessar o canal de pedidos de músicas.');
    return;
  }

  // 2) Busca as últimas 50 mensagens (ou limite que desejar)
  const messages = await pedidosChannel.messages.fetch({ limit: 50 });
  const botId = interaction.client.user.id;
  const coelhinho = '🐰';
  let removidas = 0;

  // 3) Para cada mensagem, procura reação 🐰 e, se o bot tiver reagido, remove apenas a reação do bot
  for (const msg of messages.values()) {
    const reaction = msg.reactions.cache.get(coelhinho);
    if (!reaction) continue;

    // reaction.users.remove(botId) remove apenas a reação daquele usuário específico
    try {
      await reaction.users.remove(botId);
      removidas += 1;
    } catch {
      // se falhar em alguma mensagem, apenas ignora e continua
    }
  }

  // 4) Responde ao usuário informando quantas remoções foram feitas
  await interaction.reply(`✅ Removidas ${removidas} reações 🐰 feitas pelo bot.`);
}

async function handlePlayButton(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;
  if (!customId.startsWith('play_')) return;

  const originalMessageId = customId.replace('play_', '');
  const channel = await interaction.client.channels.fetch(MUSIC_CHANNEL_ID);

  if (!channel?.isTextBased()) {
    await interaction.reply({
      content: '❌ Falha ao processar a música (canal de música não encontrado).',
      flags: 1 << 6
    });
    return;
  }

  try {
    const originalMsg = await (channel as TextChannel).messages.fetch(originalMessageId);
    const linkRegex = /https?:\/\/\S+/i;
    let linkParaPlay: string;

    if (originalMsg.attachments.size > 0) {
      linkParaPlay = originalMsg.attachments.first()!.url;
    } else if (linkRegex.test(originalMsg.content)) {
      const match = linkRegex.exec(originalMsg.content);
      linkParaPlay = match![0];
    } else if (originalMsg.embeds.length > 0) {
      const embed = originalMsg.embeds[0];
      linkParaPlay = embed.url ?? embed.data?.url ?? '';
    } else {
      linkParaPlay = '';
    }

    if (!linkParaPlay) {
      await interaction.reply({
        content: '❌ Não foi possível extrair o link desta música.',
        flags: 1 << 6
      });
      return;
    }

    // Marca a música com o emoji 🐰
    await originalMsg.react('🐰');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('🔗 Abrir link da música')
        .setStyle(ButtonStyle.Link)
        .setURL(linkParaPlay)
    );

    await interaction.reply({
      content:
        `✅ Música marcada como tocada!\n\n` +
        `🎵 Para tocar a música no bot, copie e envie o comando abaixo:\n` +
        `\`\`\`\n/play ${linkParaPlay}\n\`\`\``,
      components: [row],
      flags: 1 << 6
    });

  } catch (error) {
    console.error('Erro no botão "play_": ', error);
    await interaction.reply({
      content: '❌ Ocorreu um erro ao processar a música.',
      flags: 1 << 6
    });
  }
}


// =================== Slash Commands ===================
const commands = [
  new SlashCommandBuilder()
    .setName('cadastrar')
    .setDescription('Cadastra um usuário pelo nome')
    .addStringOption(opt =>
      opt.setName('nome')
        .setDescription('Nome de exibição do usuário')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('entrar')
    .setDescription('Adiciona você mesmo à lista de usuários'),
  new SlashCommandBuilder()
    .setName('remover')
    .setDescription('Remove um usuário')
    .addStringOption(opt =>
      opt.setName('nome')
        .setDescription('Nome de exibição do usuário')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('listar')
    .setDescription('Lista todos os usuários cadastrados'),
  new SlashCommandBuilder()
    .setName('selecionar')
    .setDescription('Seleciona aleatoriamente o próximo usuário'),
  new SlashCommandBuilder()
    .setName('resetar')
    .setDescription('Reseta a lista, tornando todos os usuários disponíveis novamente'),
  new SlashCommandBuilder()
    .setName('proxima-musica')
    .setDescription('Seleciona a próxima música do canal de pedidos'),
  new SlashCommandBuilder()
    .setName('limpar-coelhinhos')
    .setDescription('Limpa todas as reações 🐰 feitas pelo bot')
].map(cmd => cmd.toJSON());

// =================== Inicialização ===================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,

    // Esta linha é essencial para "ver" e remover reações:
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Reaction,
    Partials.Channel
  ]
});

if (process.env.NODE_ENV !== 'test') {
  const commandHandlers: Record<string, (i: ChatInputCommandInteraction, d: UserData) => Promise<void>> = {
    cadastrar: handleCadastrar,
    remover: handleRemover,
    listar: handleListar,
    selecionar: handleSelecionar,
    entrar: handleEntrar,
    resetar: handleResetar,
    'proxima-musica': async interaction => {
      await handleProximaMusica(interaction);
    },
    'limpar-coelhinhos': async interaction => {
      await handleLimparCoelhinhos(interaction);
    }
  };

  client.once('ready', async () => {
    if (!client.user) throw new Error('Cliente não inicializado corretamente');

    // Log de inicialização
    console.log(`🤖 Bot online como ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), {
      body: commands
    });

    // Log de registro de comandos
    console.log('✅ Comandos registrados com sucesso.');

    agendarSelecaoDiaria();
  });

  client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const data = carregarUsuarios();
      const handler = commandHandlers[interaction.commandName];
      if (handler) await handler(interaction, data);
    } else if (interaction.isButton()) {
      await handlePlayButton(interaction);
    }
  });
  

  client.login(TOKEN);

  // =================== Agendamento ===================
  function agendarSelecaoDiaria(): void {
    cron.schedule(
      '0 9 * * 1-5',
      async () => {
        // Verifica se é feriado
        if (isHoliday(new Date())) {
          console.log('🎉 Hoje é feriado! Não haverá sorteio da daily.');
          return;
        }

        // 1) Seleciona quem conduz a daily
        const data = carregarUsuarios();
        const escolhido = escolherUsuario(data);

        // 2) Recupera texto e componentes da próxima música
        const { texto, componentes } = await buscarProximaMusica();

        // 3) Envia a mensagem no canal de daily, incluindo texto existente + próxima música + botão
        const canal = await client.channels.fetch(CHANNEL_ID);
        if (canal?.isTextBased()) {
          (canal as TextChannel).send({
            content:
              `📢 Bom dia time!\n` +
              `🎙️ Hoje a daily será conduzida por <@${escolhido.id}> (**${escolhido.name}**).\n\n` +
              texto,
            components: componentes
          });
        }
      },
      { timezone: TIMEZONE }
    );
  }
}

// Exportar funções para testes
export {
  carregarUsuarios,
  salvarUsuarios,
  escolherUsuario,
  handleCadastrar,
  handleEntrar,
  handleRemover,
  handleListar,
  handleSelecionar,
  handleResetar,
  handleProximaMusica
};
