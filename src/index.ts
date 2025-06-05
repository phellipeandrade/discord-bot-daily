import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel
} from 'discord.js';
import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// =================== CONFIG ===================
const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const GUILD_ID = process.env.GUILD_ID; // ID do servidor do Discord
const USERS_FILE = path.join(__dirname, 'users.json');
const TIMEZONE = 'America/Sao_Paulo';

if (!TOKEN || !CHANNEL_ID || !GUILD_ID) {
  console.error('❌ Faltam variáveis de ambiente: DISCORD_TOKEN, CHANNEL_ID, GUILD_ID.');
  process.exit(1);
}

// =================== Interfaces ===================
interface UserData {
  all: string[];
  remaining: string[];
  lastSelected?: string;
}

// =================== Utilitários ===================
function carregarUsuarios(): UserData {
  if (!fs.existsSync(USERS_FILE)) {
    const vazio: UserData = { all: [], remaining: [] };
    fs.writeFileSync(USERS_FILE, JSON.stringify(vazio, null, 2));
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function salvarUsuarios(data: UserData): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function escolherUsuario(data: UserData): string {
  if (data.remaining.length === 0) {
    data.remaining = [...data.all];
  }
  const index = Math.floor(Math.random() * data.remaining.length);
  const escolhido = data.remaining.splice(index, 1)[0];
  data.lastSelected = escolhido;
  salvarUsuarios(data);
  return escolhido;
}

// =================== Handlers ===================
async function handleCadastrar(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const userName = interaction.options.getString('nome', true);
  if (!data.all.includes(userName)) {
    data.all.push(userName);
    data.remaining.push(userName);
    salvarUsuarios(data);
    await interaction.reply(`✅ Usuário \`${userName}\` cadastrado com sucesso.`);
  } else {
    await interaction.reply(`⚠️ O usuário \`${userName}\` já está cadastrado.`);
  }
}

async function handleEntrar(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const displayName = interaction.member?.user?.username || interaction.user.username;
  if (!data.all.includes(displayName)) {
    data.all.push(displayName);
    data.remaining.push(displayName);
    salvarUsuarios(data);
    await interaction.reply(`✅ Você (${displayName}) foi cadastrado com sucesso.`);
  } else {
    await interaction.reply(`⚠️ Você (${displayName}) já está cadastrado.`);
  }
}

async function handleRemover(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const userName = interaction.options.getString('nome', true);
  if (data.all.includes(userName)) {
    data.all = data.all.filter(u => u !== userName);
    data.remaining = data.remaining.filter(u => u !== userName);
    salvarUsuarios(data);
    await interaction.reply(`🗑️ Usuário \`${userName}\` removido com sucesso.`);
  } else {
    await interaction.reply(`⚠️ O usuário \`${userName}\` não está na lista.`);
  }
}

async function handleListar(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const todos = data.all.length ? `• ${data.all.join('\n• ')}` : '(nenhum)';
  const pendentes = data.remaining.length ? `• ${data.remaining.join('\n• ')}` : '(nenhum)';
  await interaction.reply({
    content: `📋 **Cadastrados:**\n${todos}\n\n🔄 **Ainda não sorteados:**\n${pendentes}`,
    ephemeral: true
  });
}

async function handleSelecionar(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const escolhido = escolherUsuario(data);
  await interaction.reply(`🎯 O próximo selecionado é: **${escolhido}**`);
}

async function handleResetar(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  data.remaining = [...data.all];
  salvarUsuarios(data);
  await interaction.reply(`🔄 Lista resetada! Todos os ${data.all.length} usuários estão disponíveis novamente.`);
}

// =================== Registro de comandos ===================
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
    .setDescription('Reseta a lista, tornando todos os usuários disponíveis novamente')
].map(cmd => cmd.toJSON());

// =================== Inicialização ===================
if (process.env.NODE_ENV !== 'test') {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  const commandHandlers: Record<string, (i: ChatInputCommandInteraction, d: UserData) => Promise<void>> = {
    cadastrar: handleCadastrar,
    remover: handleRemover,
    listar: handleListar,
    selecionar: handleSelecionar,
    entrar: handleEntrar,
    resetar: handleResetar
  };

  client.once('ready', async () => {
    console.log(`🤖 Bot online como ${client.user?.tag}`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(client.user!.id, GUILD_ID), {
      body: commands
    });

    console.log('✅ Comandos registrados no servidor com sucesso.');
    agendarSelecaoDiaria();
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const data = carregarUsuarios();
    const handler = commandHandlers[interaction.commandName];
    if (handler) await handler(interaction, data);
  });

  client.login(TOKEN);

  // =================== Agendamento ===================
  function agendarSelecaoDiaria(): void {
    cron.schedule('0 9 * * 1-5', async () => {
      try {
        const data = carregarUsuarios();
        const escolhido = escolherUsuario(data);
        const canal = await client.channels.fetch(CHANNEL_ID!);
        if (canal?.isTextBased()) {
          (canal as TextChannel).send(`📢 Seleção diária:\n🎯 **${escolhido}** foi o escolhido do dia!`);
        }
      } catch (error) {
        console.error('Erro ao executar seleção diária:', error);
      }
    }, { timezone: TIMEZONE });
  }
}
