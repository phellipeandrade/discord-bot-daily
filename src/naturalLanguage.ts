import { GoogleGenAI } from '@google/genai';
import { i18n } from '@/i18n';
import { Message } from 'discord.js';
import { loadUsers, saveUsers, findUser } from '@/users';
import { loadServerConfig, saveServerConfig, ServerConfig } from '@/serverConfig';
import { canUseAdminCommands } from '@/config';
import { parseDateString, todayISO, formatDateString } from '@/date';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Tipos de comandos que podem ser interpretados
export enum NaturalCommandType {
  SKIP_TODAY = 'skip_today',
  SKIP_UNTIL = 'skip_until',
  REGISTER = 'register',
  REMOVE = 'remove',
  READD = 'readd',
  SETUP_CONFIG = 'setup_config',
  HELP = 'help',
  UNKNOWN = 'unknown'
}

// Interface para resultado da interpretação
export interface NaturalCommandResult {
  command: NaturalCommandType;
  confidence: number;
  parameters: Record<string, string>;
  explanation: string;
  requiresAdmin: boolean;
}

// Schema para classificação de comandos naturais
const naturalCommandSchema = {
  type: 'object',
  properties: {
    command: {
      type: 'string',
      enum: Object.values(NaturalCommandType)
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    parameters: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        date: { type: 'string' },
        configField: { type: 'string' },
        configValue: { type: 'string' }
      },
      additionalProperties: true
    },
    explanation: { type: 'string' },
    requiresAdmin: { type: 'boolean' }
  },
  required: ['command', 'confidence', 'parameters', 'explanation', 'requiresAdmin'],
  additionalProperties: false
} as const;

/**
 * Interpreta uma mensagem em linguagem natural e converte para comandos do bot
 */
export async function interpretNaturalCommand(
  message: string,
  userId: string,
  userName: string
): Promise<NaturalCommandResult | null> {
  if (!apiKey) {
    return null;
  }

  try {
    const prompt = `
Você é um assistente que interpreta mensagens em linguagem natural e as converte para comandos de um bot do Discord.

Comandos disponíveis:
- skip_today: Pular usuário hoje (ex: "pula o João hoje", "skip João today")
- skip_until: Pular usuário até uma data (ex: "pula o João até amanhã", "skip João until 2024-01-15")
- register: Registrar usuário (ex: "registra o João", "register João")
- remove: Remover usuário (ex: "remove o João", "remove João")
- readd: Readicionar usuário (ex: "readiciona o João", "readd João")
- setup_config: Configurar bot (ex: "configura o canal para #geral", "set channel to #general")
- help: Ajuda (ex: "ajuda", "help", "como usar")

Responda apenas com um JSON válido seguindo este schema:
${JSON.stringify(naturalCommandSchema, null, 2)}

Exemplos de entrada e saída:

Entrada: "pula o João amanhã"
Saída: {
  "command": "skip_until",
  "confidence": 0.9,
  "parameters": {
    "userName": "João",
    "date": "tomorrow"
  },
  "explanation": "Interpretado como pular o usuário João até amanhã",
  "requiresAdmin": true
}

Entrada: "registra a Maria"
Saída: {
  "command": "register",
  "confidence": 0.95,
  "parameters": {
    "userName": "Maria"
  },
  "explanation": "Interpretado como registrar a usuária Maria",
  "requiresAdmin": true
}

Entrada: "configura o horário para 14:30"
Saída: {
  "command": "setup_config",
  "confidence": 0.85,
  "parameters": {
    "configField": "dailyTime",
    "configValue": "14:30"
  },
  "explanation": "Interpretado como configurar o horário diário para 14:30",
  "requiresAdmin": true
}

Mensagem do usuário: "${message}"
Usuário: ${userName} (ID: ${userId})

Responda apenas com o JSON:`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: naturalCommandSchema
      }
    });
    
    const response = result.text || '';
    
    // Extrair JSON da resposta
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validar se segue o schema
    if (!parsed.command || !Object.values(NaturalCommandType).includes(parsed.command)) {
      return null;
    }

    return {
      command: parsed.command as NaturalCommandType,
      confidence: parsed.confidence || 0,
      parameters: parsed.parameters || {},
      explanation: parsed.explanation || '',
      requiresAdmin: parsed.requiresAdmin || false
    };
  } catch (error) {
    console.error('Error interpreting natural command:', error);
    return null;
  }
}

/**
 * Executa um comando natural interpretado
 */
export async function executeNaturalCommand(
  result: NaturalCommandResult,
  message: Message
): Promise<string> {
  const { command, parameters, requiresAdmin } = result;

  // Verificar permissões de admin se necessário
  if (requiresAdmin && !(await canUseAdminCommands(message.author.id))) {
    return i18n.t('errors.unauthorized');
  }

  try {
    switch (command) {
      case NaturalCommandType.SKIP_TODAY:
        return await handleSkipToday(parameters.userName, message);
      
      case NaturalCommandType.SKIP_UNTIL:
        return await handleSkipUntil(parameters.userName, parameters.date, message);
      
      case NaturalCommandType.REGISTER:
        return await handleRegister(parameters.userName, message);
      
      case NaturalCommandType.REMOVE:
        return await handleRemove(parameters.userName, message);
      
      case NaturalCommandType.READD:
        return await handleReadd(parameters.userName, message);
      
      case NaturalCommandType.SETUP_CONFIG:
        return await handleSetupConfig(parameters.configField, parameters.configValue, message);
      
      case NaturalCommandType.HELP:
        return getHelpMessage();
      
      default:
        return i18n.t('errors.unknownCommand');
    }
  } catch (error) {
    console.error('Error executing natural command:', error);
    return i18n.t('errors.executionError');
  }
}

/**
 * Manipula comando skip-today
 */
async function handleSkipToday(userName: string, _message: Message): Promise<string> {
  const data = await loadUsers();
  const user = findUser(data, userName);
  
  if (!user) {
    return i18n.t('user.notFound', { name: userName });
  }

  const today = todayISO();
  data.skips = data.skips || {};
  data.skips[user.id] = today;
  await saveUsers(data);
  
  return i18n.t('selection.skipToday', { name: user.name });
}

/**
 * Manipula comando skip-until
 */
async function handleSkipUntil(userName: string, date: string, _message: Message): Promise<string> {
  const data = await loadUsers();
  const user = findUser(data, userName);
  
  if (!user) {
    return i18n.t('user.notFound', { name: userName });
  }

  const iso = parseDateString(date);
  if (!iso) {
    return i18n.t('selection.invalidDate', { format: 'YYYY-MM-DD' });
  }
  
  data.skips = data.skips || {};
  data.skips[user.id] = iso;
  await saveUsers(data);
  
  return i18n.t('selection.skipUntil', { name: user.name, date: formatDateString(iso) });
}

/**
 * Manipula comando register
 */
async function handleRegister(userName: string, _message: Message): Promise<string> {
  const data = await loadUsers();
  
  // Verificar se usuário já existe
  if (data.all.some(u => u.name.toLowerCase() === userName.toLowerCase())) {
    return i18n.t('user.alreadyRegistered', { name: userName });
  }

  // Criar novo usuário (sem ID específico, será gerado automaticamente)
  const newUser = { name: userName, id: `temp_${Date.now()}` };
  data.all.push(newUser);
  data.remaining.push(newUser);
  await saveUsers(data);
  
  return i18n.t('user.registered', { name: userName });
}

/**
 * Manipula comando remove
 */
async function handleRemove(userName: string, _message: Message): Promise<string> {
  const data = await loadUsers();
  const user = findUser(data, userName);
  
  if (!user) {
    return i18n.t('user.notFound', { name: userName });
  }

  // Remover usuário da lista
  data.all = data.all.filter(u => u.id !== user.id);
  data.remaining = data.remaining.filter(u => u.id !== user.id);
  await saveUsers(data);
  
  return i18n.t('user.removed', { name: user.name });
}

/**
 * Manipula comando readd
 */
async function handleReadd(userName: string, _message: Message): Promise<string> {
  const data = await loadUsers();
  const user = findUser(data, userName);
  
  if (!user) {
    return i18n.t('user.notFound', { name: userName });
  }

  // Readicionar usuário à lista de remaining se não estiver lá
  if (!data.remaining.some(u => u.id === user.id)) {
    data.remaining.push(user);
    await saveUsers(data);
    return i18n.t('selection.readded', { name: user.name });
  } else {
    return i18n.t('selection.notSelected', { name: user.name });
  }
}

/**
 * Manipula configuração do bot
 */
async function handleSetupConfig(field: string, value: string, _message: Message): Promise<string> {
  const config = loadServerConfig();
  if (!config) {
    return i18n.t('config.notFound');
  }

  // Mapear campos de configuração
  const fieldMappings: Record<string, keyof ServerConfig> = {
    'channel': 'channelId',
    'canal': 'channelId',
    'musicChannel': 'musicChannelId',
    'canalMusica': 'musicChannelId',
    'time': 'dailyTime',
    'horario': 'dailyTime',
    'timezone': 'timezone',
    'fuso': 'timezone',
    'language': 'language',
    'idioma': 'language',
    'days': 'dailyDays',
    'dias': 'dailyDays'
  };

  const configField = fieldMappings[field.toLowerCase()];
  if (!configField) {
    return i18n.t('config.invalidField', { field });
  }

  // Atualizar configuração
  (config as unknown as Record<string, string>)[configField] = value;
  await saveServerConfig(config);

  return i18n.t('config.updated', { field, value });
}

/**
 * Retorna mensagem de ajuda
 */
function getHelpMessage(): string {
  return `
🤖 **Comandos em Linguagem Natural**

Você pode usar linguagem natural para interagir comigo! Exemplos:

**Gerenciar Usuários:**
• "registra o João" / "register João"
• "remove a Maria" / "remove Maria"
• "readiciona o Pedro" / "readd Pedro"

**Pular Seleções:**
• "pula o João hoje" / "skip João today"
• "pula a Maria até amanhã" / "skip Maria until tomorrow"
• "pula o Pedro até 15/01/2024" / "skip Pedro until 2024-01-15"

**Configurações:**
• "configura o canal para #geral" / "set channel to #general"
• "configura o horário para 14:30" / "set time to 14:30"
• "configura o fuso horário para America/Sao_Paulo" / "set timezone to America/Sao_Paulo"

**Ajuda:**
• "ajuda" / "help" / "como usar"

💡 **Dica:** Quanto mais específico você for, melhor eu entendo!
`;
}


