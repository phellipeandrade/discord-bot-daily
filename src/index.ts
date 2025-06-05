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
const GUILD_ID = process.env.GUILD_ID;
const USERS_FILE = path.join(__dirname, 'users.json');
const TIMEZONE = 'America/Sao_Paulo';

// Não verificar variáveis de ambiente durante testes
if (process.env.NODE_ENV !== 'test' && (!TOKEN || !CHANNEL_ID || !GUILD_ID)) {
  console.error('❌ Faltam variáveis de ambiente: DISCORD_TOKEN, CHANNEL_ID, GUILD_ID.');
  process.exit(1);
}

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
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
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

function formatarUsuarios(lista: UserEntry[]): string {
  return lista.length ? `• ` + lista.map(u => `${u.name}`).join('\n• ') : '(nenhum)';
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
    ephemeral: true
  });
}

async function handleSelecionar(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  const escolhido = escolherUsuario(data);
  await interaction.reply(`🎯 O próximo selecionado é: <@${escolhido.id}> (**${escolhido.name}**)`);
}

async function handleResetar(interaction: ChatInputCommandInteraction, data: UserData): Promise<void> {
  data.remaining = [...data.all];
  salvarUsuarios(data);
  await interaction.reply(`🔄 Lista resetada! Todos os ${data.all.length} usuários estão disponíveis novamente.`);
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
    .setDescription('Reseta a lista, tornando todos os usuários disponíveis novamente')
].map(cmd => cmd.toJSON());

// =================== Inicialização ===================
if (process.env.NODE_ENV !== 'test') {
  if (!TOKEN || !GUILD_ID) {
    throw new Error('TOKEN e GUILD_ID são obrigatórios');
  }

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
    if (!client.user) {
      throw new Error('Cliente não inicializado corretamente');
    }

    console.log(`🤖 Bot online como ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), {
      body: commands
    });

    console.log('✅ Comandos registrados com sucesso.');
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
          (canal as TextChannel).send(`📢 Seleção diária:\n🎯 <@${escolhido.id}> (**${escolhido.name}**) foi o escolhido do dia!`);
        }
      } catch (error) {
        console.error('Erro ao executar seleção diária:', error);
      }
    }, { timezone: TIMEZONE });
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
  handleResetar
};
