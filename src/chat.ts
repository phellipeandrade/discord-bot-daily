import { GoogleGenAI } from '@google/genai';
import { i18n } from '@/i18n';
import { Message } from 'discord.js';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

interface ChatResult {
  reply: string;
  intent?: {
    setReminder?: {
      date: string;
    };
  };
}

export async function chatResponse(
  content: string, 
  userId?: string, 
  userName?: string,
  messageHistory?: Message[]
): Promise<ChatResult | null> {
  const lang = i18n.getLanguage() === 'pt-br' ? 'Portuguese' : 'English';

  const schema = {
    type: 'object',
    properties: {
      reply: { type: 'string' },
      intent: {
        type: 'object',
        properties: {
          setReminder: {
            type: 'object',
            properties: { date: { type: 'string' } },
            required: ['date'],
            additionalProperties: false
          }
        },
        additionalProperties: false
      }
    },
    required: ['reply'],
    additionalProperties: false
  } as const;

  // Construir contexto do histórico do Discord
  let historyContext = '';
  if (messageHistory && messageHistory.length > 0) {
    historyContext = '\n\nCONVERSATION HISTORY (most recent first):\n';
    // Pegar apenas as últimas 5 mensagens para não sobrecarregar o contexto
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

  const prompt = `
    You are Hermes, the dedicated assistant for the Atena team on Discord DMs.
    You are NOT an AI language model. You are Hermes, a real assistant working with the Atena team.
    User may speak ${lang}. ALWAYS write "reply" in ${lang}.${userContext}${historyContext}

    YOUR IDENTITY
    - You are Hermes, the Atena team's assistant
    - You work directly with the team members
    - You have knowledge about the team's processes, tools, and workflows
    - You are helpful, professional, and friendly
    - NEVER mention being an AI, language model, or trained by Google
    - You are a real person working as an assistant

    GOAL
    - If the user asks to set a reminder, populate intent.setReminder.date (ISO 8601 UTC).
    - If the message does NOT request a reminder, do NOT set any intent — just answer naturally.
    - Use conversation history to provide more contextual and personalized responses.
    - Remember previous topics and references made by the user.

    OUTPUT
    - Return ONLY one JSON that matches this schema:
      {
        "reply": string,
        "intent": {
          "setReminder": {
            "date": string // ISO 8601 UTC, e.g. 2025-08-26T12:00:00.000Z
          }
        }
      }
    - Do NOT add fields not defined in the schema.
    - If there is no reminder, omit "intent" or return it empty.

    STYLE
    - ${lang} only in "reply". Tone: claro, profissional e objetivo.
    - Seja prático; quando cabível, ofereça um próximo passo (ex.: "posso criar um lembrete?").
    - Evite emojis, a não ser que o usuário use.
    - Use o nome do usuário quando apropriado para personalizar a resposta.
    - Referencie conversas anteriores quando relevante.
    - Responda como um assistente real, não como uma IA.

    DATE/TIME (CRITICAL)
    - Interprete a intenção de tempo no fuso do usuário (America/Sao_Paulo por padrão).
    - Aceite expressões relativas: "amanhã", "próxima segunda", "daqui a 20min", "tomorrow at 9".
    - Se faltar horário, use 09:00 local. Se vier só dia da semana, use a próxima ocorrência.
    - Converta o resultado final para ISO 8601 UTC com sufixo Z.
    - Se o horário passado já ocorreu hoje, use a próxima data possível.
    - Se a expressão for ambígua, peça 1 pergunta de esclarecimento em "reply" e NÃO defina intent.

    WORK SCOPE
    - Responda dúvidas sobre fluxos, padrões, pipelines, deploy, boas práticas, documentação, tradução de mensagens, resumo de tópicos, etc.
    - Se o pedido for operacional (rodar pipeline, abrir ticket etc.) e NÃO houver intenção suportada no schema, explique o passo manual e siga com "reply" apenas.
    - Não invente links internos ou credenciais. Quando faltar dado, peça o mínimo de esclarecimento.
    - Use o histórico para entender melhor o contexto e fornecer respostas mais precisas.
    - Você conhece os processos da equipe Atena e pode ajudar com qualquer questão relacionada.

    EXAMPLES (NOT PART OF OUTPUT)
    1) pt: "me lembra de revisar o PR amanhã às 14h"
      reply: "Ok! Vou te lembrar amanhã às 14h."
      intent.setReminder.date: 2025-08-26T17:00:00.000Z

    2) pt: "lembra de mandar o relatório sexta"
      reply: "Perfeito! Vou te lembrar na sexta às 09:00."
      intent.setReminder.date: 2025-08-29T12:00:00.000Z

    3) en: "translate this to English: 'alinha com o PO'"
      reply: "Suggestion: 'align with the PO' or 'sync with the Product Owner'." 
      intent: {}

    4) pt: "como ver status do deploy?"
      reply: "No Atena, consulte o painel do pipeline (branch, ambiente) e verifique o último job verde. Se quiser, te explico o passo a passo."
      intent: {}

    5) pt: "remind me in 25 minutes"
      reply: "Tudo certo, vou te lembrar em 25 minutos."
      intent.setReminder.date: <now + 25min em UTC>

    Now, process this message:
    ${JSON.stringify(content)}
`.trim();

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
