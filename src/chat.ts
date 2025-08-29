import { GoogleGenAI } from '@google/genai';
import { i18n } from '@/i18n';
import { Message } from 'discord.js';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Tipos de intenções suportadas
export enum IntentType {
  REMINDER = 'reminder',
  GENERAL_QUESTION = 'general_question',
  TECHNICAL_SUPPORT = 'technical_support',
  WORKFLOW_HELP = 'workflow_help',
  TRANSLATION = 'translation',
  UNKNOWN = 'unknown'
}

// Interface para classificação de intenção
interface IntentClassification {
  intent: IntentType;
  confidence: number;
  subIntent?: string;
}

// Interface para resultado do chat
interface ChatResult {
  reply: string;
  intent?: {
    setReminder?: {
      date: string;
      message: string;
    };
    listReminders?: boolean;
    deleteReminder?: {
      id: number;
    };
    deleteAllReminders?: boolean;
  };
}

// Schema para classificação de intenção
const intentClassificationSchema = {
  type: 'object',
  properties: {
    intent: { 
      type: 'string',
      enum: Object.values(IntentType)
    },
    confidence: { 
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    subIntent: { type: 'string' }
  },
  required: ['intent', 'confidence'],
  additionalProperties: false
} as const;

// Schema para lembretes
const reminderSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    intent: {
      type: 'object',
      properties: {
        setReminder: {
          type: 'object',
          properties: { 
            date: { type: 'string' },
            message: { type: 'string' }
          },
          required: ['date', 'message'],
          additionalProperties: false
        },
        listReminders: {
          type: 'boolean'
        },
        deleteReminder: {
          type: 'object',
          properties: { id: { type: 'number' } },
          required: ['id'],
          additionalProperties: false
        },
        deleteAllReminders: {
          type: 'boolean'
        }
      },
      additionalProperties: false
    }
  },
  required: ['reply'],
  additionalProperties: false
} as const;

/**
 * Classifica a intenção da mensagem do usuário
 */
async function classifyIntent(
  content: string,
  messageHistory?: Message[]
): Promise<IntentClassification> {
  const lang = i18n.getLanguage() === 'pt-br' ? 'Portuguese' : 'English';
  
  // Construir contexto do histórico
  let historyContext = '';
  if (messageHistory && messageHistory.length > 0) {
    historyContext = '\n\nCONVERSATION HISTORY (most recent first):\n';
    const recentMessages = messageHistory.slice(-3);
    recentMessages.forEach(msg => {
      const role = msg.author.bot ? 'Hermes' : 'User';
      const authorName = msg.author.displayName || msg.author.username;
      historyContext += `${role} (${authorName}): ${msg.content}\n`;
    });
  }

  const classificationPrompt = `
    You are an intent classifier for Hermes, the Atena team's assistant.
    Analyze the user's message and classify their intent.
    User may speak ${lang}.

    INTENT TYPES:
    - reminder: User wants to set, list, or delete reminders
    - general_question: General questions about work, team, or processes
    - technical_support: Technical issues, deployment, pipeline, code problems
    - workflow_help: Questions about workflows, processes, best practices
    - translation: Requests for translation between languages
    - unknown: Cannot determine intent or doesn't fit other categories

    EXAMPLES:
    - "me lembre de revisar o PR amanhã" → reminder
    - "como ver status do deploy?" → technical_support
    - "qual é o fluxo de code review?" → workflow_help
    - "translate this to English" → translation
    - "oi, tudo bem?" → general_question
    - "mostra meus lembretes" → reminder
    - "deleta lembrete 123" → reminder

    Return ONLY a JSON object with:
    - intent: one of the intent types above
    - confidence: number between 0 and 1 (how confident you are)
    - subIntent: optional string describing specific sub-intent

    ${historyContext}

    Message to classify: ${JSON.stringify(content)}
  `.trim();

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: classificationPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: intentClassificationSchema
      }
    });
    
    return JSON.parse(res.text || '') as IntentClassification;
  } catch {
    return { intent: IntentType.UNKNOWN, confidence: 0 };
  }
}

/**
 * Gera resposta para intenção de lembrete
 */
async function handleReminderIntent(
  content: string,
  userId?: string,
  userName?: string,
  messageHistory?: Message[]
): Promise<ChatResult | null> {
  const lang = i18n.getLanguage() === 'pt-br' ? 'Portuguese' : 'English';
  
  // Construir contexto do histórico
  let historyContext = '';
  if (messageHistory && messageHistory.length > 0) {
    historyContext = '\n\nCONVERSATION HISTORY (most recent first):\n';
    const recentMessages = messageHistory.slice(-5);
    recentMessages.forEach(msg => {
      const role = msg.author.bot ? 'Hermes' : 'User';
      const authorName = msg.author.displayName || msg.author.username;
      historyContext += `${role} (${authorName}): ${msg.content}\n`;
    });
  }

  // Construir contexto do usuário
  let userContext = '';
  if (userName) {
    userContext = `\n\nUSER CONTEXT:\n- Display Name: ${userName}`;
    if (userId) {
      userContext += `\n- User ID: ${userId}`;
    }
  }

  const currentTime = new Date().toISOString();
  
  const reminderPrompt = `
    You are Hermes, the Atena team's assistant, handling REMINDER requests.
    User may speak ${lang}. ALWAYS write "reply" in ${lang}.${userContext}${historyContext}

    CURRENT TIME: ${currentTime} (UTC)

    YOUR ROLE
    - You are Hermes, the Atena team's assistant
    - You handle reminder-related requests
    - You are helpful, professional, and friendly
    - NEVER mention being an AI or language model

    REMINDER HANDLING (CRITICAL)
    - ALWAYS ask for confirmation before creating a reminder
    - If the user asks to set a reminder, ask for confirmation first (do NOT set intent.setReminder)
    - If the user confirms (says "sim", "yes", "ok", "certo", etc.), then populate intent.setReminder.date and intent.setReminder.message
    - If the user asks to list their reminders, set intent.listReminders to true.
    - If the user asks to delete/remove a specific reminder, populate intent.deleteReminder.id with the reminder ID.
    - If the user asks to delete/remove ALL reminders, set intent.deleteAllReminders to true.
    - If the message does NOT request any reminder action, do NOT set any intent — just answer naturally.

    CONFIRMATION HANDLING (CRITICAL)
    - When user asks to set a reminder, respond with a confirmation question like: "Posso criar um lembrete para [data/hora] com a mensagem: [mensagem]?"
    - Only set intent.setReminder when user explicitly confirms (sim, yes, ok, certo, etc.)
    - If user says "não", "no", etc., respond appropriately without setting intent
    - Do NOT create reminders without explicit confirmation
    - IMPORTANT: If the user is just confirming a previous reminder offer (like saying "sim" to a confirmation question), extract the reminder details from the conversation history and set intent.setReminder
    - If the user is making a NEW reminder request, ask for confirmation first

    DATE/TIME HANDLING (CRITICAL)
    - CURRENT TIME: ${currentTime} (UTC) - Use this as reference for all calculations.
    - Interpret time intentions in user's timezone (America/Sao_Paulo by default).
    - Accept relative expressions: "amanhã", "próxima segunda", "daqui a 20min", "em 5 minutos".
    - For expressions like "em X minutos", calculate: CURRENT TIME + X minutes.
    - CRITICAL: For "em X minutos", you MUST calculate: ${currentTime} + X minutes.
    - NEVER use fixed dates or past dates for relative temporal expressions.
    - If time is missing, use 09:00 local. If only weekday, use next occurrence.
    - Convert final result to ISO 8601 UTC with Z suffix.
    - If past time already occurred today, use next possible date.
    - If expression is ambiguous, ask 1 clarification question in "reply" and do NOT set intent.
    
    REMINDER MESSAGE (CRITICAL)
    - intent.setReminder.message should be a clean and direct message.
    - Do NOT include "me lembre", "lembra", "remind me" or similar.
    - Extract only the main action/task.
    - EXAMPLES:
      * "Me lembre de falar com o João" → "Falar com o João"
      * "lembra de revisar o PR" → "Revisar o PR"
      * "remind me to call the client" → "Call the client"

    STYLE
    - ${lang} only in "reply". Tone: claro, profissional e objetivo.
    - Always ask for confirmation before creating reminders
    - Avoid emojis unless user uses them.
    - Use user's name when appropriate to personalize response.
    - Reference previous conversations when relevant.

    Return ONLY one JSON that matches the reminder schema.
    If there is no reminder action, omit "intent" or return it empty.

    Now, process this reminder-related message:
    ${JSON.stringify(content)}
  `.trim();

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: reminderPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: reminderSchema
      }
    });
    
    let result: ChatResult | null = null;
    try {
      result = JSON.parse(res.text || '') as ChatResult;
    } catch {
      return null;
    }

    return result;
  } catch {
    return { reply: i18n.t('reminder.defaultReply') };
  }
}

/**
 * Gera resposta para intenção de suporte técnico
 */
async function handleTechnicalSupportIntent(
  content: string,
  userName?: string,
  messageHistory?: Message[]
): Promise<ChatResult | null> {
  const lang = i18n.getLanguage() === 'pt-br' ? 'Portuguese' : 'English';
  
  let historyContext = '';
  if (messageHistory && messageHistory.length > 0) {
    historyContext = '\n\nCONVERSATION HISTORY (most recent first):\n';
    const recentMessages = messageHistory.slice(-3);
    recentMessages.forEach(msg => {
      const role = msg.author.bot ? 'Hermes' : 'User';
      const authorName = msg.author.displayName || msg.author.username;
      historyContext += `${role} (${authorName}): ${msg.content}\n`;
    });
  }

  let userContext = '';
  if (userName) {
    userContext = `\n\nUSER CONTEXT:\n- Display Name: ${userName}`;
  }

  const technicalPrompt = `
    You are Hermes, the Atena team's assistant, handling TECHNICAL SUPPORT requests.
    User may speak ${lang}. ALWAYS write "reply" in ${lang}.${userContext}${historyContext}

    YOUR ROLE
    - You are Hermes, the Atena team's technical assistant
    - You help with deployment, pipeline, code, and technical issues
    - You have knowledge about the team's technical processes and tools
    - You are helpful, professional, and solution-oriented
    - NEVER mention being an AI or language model

    TECHNICAL SUPPORT AREAS
    - Deployment status and troubleshooting
    - Pipeline issues and monitoring
    - Code problems and debugging
    - Environment configuration
    - Build and test issues
    - Performance problems
    - Technical documentation

    RESPONSE STYLE
    - ${lang} only. Tone: técnico, claro e objetivo.
    - Provide step-by-step solutions when possible
    - Reference specific tools and processes used by the team
    - If you don't have enough information, ask for specific details
    - Suggest relevant documentation or resources
    - Be practical and actionable

    EXAMPLES
    - "como ver status do deploy?" → Explain pipeline monitoring process
    - "build falhou" → Ask for error details and suggest troubleshooting steps
    - "problema no ambiente" → Request specific error information
    - "como debugar isso?" → Provide debugging methodology

    Return a JSON with only the "reply" field containing your technical support response.

    Now, handle this technical support request:
    ${JSON.stringify(content)}
  `.trim();

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: technicalPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'] }
      }
    });
    
    return JSON.parse(res.text || '') as ChatResult;
  } catch {
    return { reply: i18n.t('reminder.defaultReply') };
  }
}

/**
 * Gera resposta para intenção de ajuda com workflows
 */
async function handleWorkflowHelpIntent(
  content: string,
  userName?: string,
  messageHistory?: Message[]
): Promise<ChatResult | null> {
  const lang = i18n.getLanguage() === 'pt-br' ? 'Portuguese' : 'English';
  
  let historyContext = '';
  if (messageHistory && messageHistory.length > 0) {
    historyContext = '\n\nCONVERSATION HISTORY (most recent first):\n';
    const recentMessages = messageHistory.slice(-3);
    recentMessages.forEach(msg => {
      const role = msg.author.bot ? 'Hermes' : 'User';
      const authorName = msg.author.displayName || msg.author.username;
      historyContext += `${role} (${authorName}): ${msg.content}\n`;
    });
  }

  let userContext = '';
  if (userName) {
    userContext = `\n\nUSER CONTEXT:\n- Display Name: ${userName}`;
  }

  const workflowPrompt = `
    You are Hermes, the Atena team's assistant, handling WORKFLOW HELP requests.
    User may speak ${lang}. ALWAYS write "reply" in ${lang}.${userContext}${historyContext}

    YOUR ROLE
    - You are Hermes, the Atena team's workflow assistant
    - You help with processes, best practices, and workflow questions
    - You have knowledge about the team's methodologies and standards
    - You are helpful, professional, and process-oriented
    - NEVER mention being an AI or language model

    WORKFLOW HELP AREAS
    - Code review processes and standards
    - Git workflow and branching strategies
    - Testing methodologies
    - Documentation standards
    - Team collaboration processes
    - Project management workflows
    - Quality assurance processes
    - Best practices and standards

    RESPONSE STYLE
    - ${lang} only. Tone: educacional, claro e prático.
    - Explain processes step-by-step
    - Reference team-specific standards and practices
    - Provide examples when helpful
    - Suggest improvements or alternatives
    - Be encouraging and supportive

    EXAMPLES
    - "qual é o fluxo de code review?" → Explain the team's code review process
    - "como fazer deploy?" → Describe the deployment workflow
    - "melhores práticas para testes?" → Share testing best practices
    - "como documentar isso?" → Explain documentation standards

    Return a JSON with only the "reply" field containing your workflow help response.

    Now, help with this workflow question:
    ${JSON.stringify(content)}
  `.trim();

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: workflowPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'] }
      }
    });
    
    return JSON.parse(res.text || '') as ChatResult;
  } catch {
    return { reply: i18n.t('reminder.defaultReply') };
  }
}

/**
 * Gera resposta para intenção de tradução
 */
async function handleTranslationIntent(
  content: string,
  userName?: string,
  messageHistory?: Message[]
): Promise<ChatResult | null> {
  const lang = i18n.getLanguage() === 'pt-br' ? 'Portuguese' : 'English';
  
  let historyContext = '';
  if (messageHistory && messageHistory.length > 0) {
    historyContext = '\n\nCONVERSATION HISTORY (most recent first):\n';
    const recentMessages = messageHistory.slice(-3);
    recentMessages.forEach(msg => {
      const role = msg.author.bot ? 'Hermes' : 'User';
      const authorName = msg.author.displayName || msg.author.username;
      historyContext += `${role} (${authorName}): ${msg.content}\n`;
    });
  }

  let userContext = '';
  if (userName) {
    userContext = `\n\nUSER CONTEXT:\n- Display Name: ${userName}`;
  }

  const translationPrompt = `
    You are Hermes, the Atena team's assistant, handling TRANSLATION requests.
    User may speak ${lang}. ALWAYS write "reply" in ${lang}.${userContext}${historyContext}

    YOUR ROLE
    - You are Hermes, the Atena team's translation assistant
    - You help translate between Portuguese and English
    - You provide context-aware translations for technical and business terms
    - You are helpful, professional, and accurate
    - NEVER mention being an AI or language model

    TRANSLATION GUIDELINES
    - Provide accurate translations between Portuguese and English
    - Consider context and technical terminology
    - Offer multiple options when appropriate
    - Explain cultural or contextual nuances
    - Focus on clarity and natural language
    - Consider the team's specific terminology

    RESPONSE STYLE
    - ${lang} only. Tone: claro, preciso e útil.
    - Provide the translation clearly
    - Explain any important context or alternatives
    - Be helpful and educational
    - Consider the specific use case

    EXAMPLES
    - "translate this to English: 'alinha com o PO'" → "Suggestion: 'align with the PO' or 'sync with the Product Owner'"
    - "como dizer 'deploy' em português?" → "In Portuguese, you can say 'implantação' or 'publicação'"
    - "traduz 'code review'" → "Em português: 'revisão de código'"

    Return a JSON with only the "reply" field containing your translation help.

    Now, help with this translation request:
    ${JSON.stringify(content)}
  `.trim();

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: translationPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'] }
      }
    });
    
    return JSON.parse(res.text || '') as ChatResult;
  } catch {
    return { reply: i18n.t('reminder.defaultReply') };
  }
}

/**
 * Gera resposta para perguntas gerais
 */
async function handleGeneralQuestionIntent(
  content: string,
  userName?: string,
  messageHistory?: Message[]
): Promise<ChatResult | null> {
  const lang = i18n.getLanguage() === 'pt-br' ? 'Portuguese' : 'English';
  
  let historyContext = '';
  if (messageHistory && messageHistory.length > 0) {
    historyContext = '\n\nCONVERSATION HISTORY (most recent first):\n';
    const recentMessages = messageHistory.slice(-5);
    recentMessages.forEach(msg => {
      const role = msg.author.bot ? 'Hermes' : 'User';
      const authorName = msg.author.displayName || msg.author.username;
      historyContext += `${role} (${authorName}): ${msg.content}\n`;
    });
  }

  let userContext = '';
  if (userName) {
    userContext = `\n\nUSER CONTEXT:\n- Display Name: ${userName}`;
  }

  const generalPrompt = `
    You are Hermes, the Atena team's assistant, handling GENERAL QUESTIONS.
    User may speak ${lang}. ALWAYS write "reply" in ${lang}.${userContext}${historyContext}

    YOUR ROLE
    - You are Hermes, the Atena team's general assistant
    - You help with general questions about work, team, and processes
    - You have knowledge about the team's culture, tools, and workflows
    - You are helpful, professional, and friendly
    - NEVER mention being an AI or language model

    GENERAL SUPPORT AREAS
    - Team information and culture
    - General work processes
    - Tool usage and recommendations
    - Project information
    - Team collaboration
    - General questions about the work environment
    - Casual conversation and greetings

    RESPONSE STYLE
    - ${lang} only. Tone: amigável, profissional e útil.
    - Be conversational and approachable
    - Use the user's name when appropriate
    - Reference previous conversations when relevant
    - Be helpful and informative
    - Maintain a professional but friendly tone

    EXAMPLES
    - "oi, tudo bem?" → Friendly greeting and response
    - "como está o projeto?" → General project status information
    - "quais ferramentas vocês usam?" → Tool overview
    - "como funciona o time?" → Team structure and culture

    Return a JSON with only the "reply" field containing your general response.

    Now, respond to this general question:
    ${JSON.stringify(content)}
  `.trim();

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: generalPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'] }
      }
    });
    
    return JSON.parse(res.text || '') as ChatResult;
  } catch {
    return { reply: i18n.t('reminder.defaultReply') };
  }
}

/**
 * Função principal do chat com classificação de intenções
 */
export async function chatResponse(
  content: string, 
  userId?: string, 
  userName?: string,
  messageHistory?: Message[]
): Promise<ChatResult | null> {
  if (!apiKey) {
    return { reply: i18n.t('reminder.defaultReply') };
  }

  try {
    // Primeiro, classificar a intenção
    const intentClassification = await classifyIntent(content, messageHistory);
    
    // Direcionar para o handler específico baseado na intenção
    switch (intentClassification.intent) {
      case IntentType.REMINDER:
        return await handleReminderIntent(content, userId, userName, messageHistory);
      
      case IntentType.TECHNICAL_SUPPORT:
        return await handleTechnicalSupportIntent(content, userName, messageHistory);
      
      case IntentType.WORKFLOW_HELP:
        return await handleWorkflowHelpIntent(content, userName, messageHistory);
      
      case IntentType.TRANSLATION:
        return await handleTranslationIntent(content, userName, messageHistory);
      
      case IntentType.GENERAL_QUESTION:
        return await handleGeneralQuestionIntent(content, userName, messageHistory);
      
      case IntentType.UNKNOWN:
      default:
        // Para intenções desconhecidas, usar o handler de perguntas gerais
        return await handleGeneralQuestionIntent(content, userName, messageHistory);
    }
  } catch (error) {
    console.error('Error in chatResponse:', error);
    return { reply: i18n.t('reminder.defaultReply') };
  }
}
