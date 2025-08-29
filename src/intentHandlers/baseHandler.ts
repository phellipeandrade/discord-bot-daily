import { GoogleGenAI } from '@google/genai';
import { i18n } from '@/i18n';
import { Message } from 'discord.js';
import { ChatResult, HandlerContext, genericResponseSchema } from './types';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Função utilitária para construir contexto do histórico de mensagens
 */
export function buildHistoryContext(messageHistory?: Message[], maxMessages: number = 3): string {
  if (!messageHistory || messageHistory.length === 0) {
    return '';
  }

  let historyContext = '\n\nCONVERSATION HISTORY (most recent first):\n';
  const recentMessages = messageHistory.slice(-maxMessages);
  recentMessages.forEach(msg => {
    const role = msg.author.bot ? 'Hermes' : 'User';
    const authorName = msg.author.displayName || msg.author.username;
    historyContext += `${role} (${authorName}): ${msg.content}\n`;
  });

  return historyContext;
}

/**
 * Função utilitária para construir contexto do usuário
 */
export function buildUserContext(userName?: string, userId?: string): string {
  if (!userName) {
    return '';
  }

  let userContext = `\n\nUSER CONTEXT:\n- Display Name: ${userName}`;
  if (userId) {
    userContext += `\n- User ID: ${userId}`;
  }

  return userContext;
}

/**
 * Função utilitária para criar contexto completo do handler
 */
export function createHandlerContext(
  content: string,
  userId?: string,
  userName?: string,
  messageHistory?: Message[],
  maxHistoryMessages: number = 3
): HandlerContext {
  const lang = i18n.getLanguage() === 'pt-br' ? 'Portuguese' : 'English';
  const historyContext = buildHistoryContext(messageHistory, maxHistoryMessages);
  const userContext = buildUserContext(userName, userId);

  return {
    content,
    userId,
    userName,
    messageHistory,
    lang,
    historyContext,
    userContext
  };
}

/**
 * Função utilitária para gerar resposta usando Gemini AI
 */
export async function generateAIResponse(
  prompt: string,
  schema = genericResponseSchema
): Promise<ChatResult | null> {
  if (!apiKey) {
    return { reply: i18n.t('reminder.defaultReply') };
  }

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    });
    
    if (!res || !res.text) {
      return { reply: i18n.t('reminder.defaultReply') };
    }
    
    return JSON.parse(res.text) as ChatResult;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return { reply: i18n.t('reminder.defaultReply') };
  }
}

/**
 * Função utilitária para resposta de fallback
 */
export function createFallbackResponse(): ChatResult {
  return { reply: i18n.t('reminder.defaultReply') };
}
