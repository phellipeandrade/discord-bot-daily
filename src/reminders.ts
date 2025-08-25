import { Client, Message } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import { i18n } from '@/i18n';

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

async function chatResponse(content: string): Promise<ChatResult | null> {
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
  const prompt =
    `The user may speak ${lang}. The "reply" value should be in ${lang}. Message: ` +
    JSON.stringify(content);
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
    try {
      return JSON.parse(res.text || '') as ChatResult;
    } catch {
      return null;
    }
  } catch {
    return { reply: i18n.t('reminder.defaultReply') };
  }
}

export async function handleReminderMessage(message: Message): Promise<void> {
  const result = await chatResponse(message.content);
  if (!result) {
    try {
      await message.reply(i18n.t('reminder.parseError'));
    } catch {
      /* ignore */
    }
    return;
  }

  const dateStr = result.intent?.setReminder?.date;
  if (!dateStr) {
    try {
      await message.reply(result.reply || i18n.t('reminder.defaultReply'));
    } catch {
      /* ignore */
    }
    return;
  }

  const date = new Date(dateStr);
  const delay = date.getTime() - Date.now();
  if (isNaN(date.getTime()) || delay <= 0) {
    try {
      await message.reply(i18n.t('reminder.invalidTime'));
    } catch {
      /* ignore */
    }
    return;
  }
  setTimeout(() => {
    Promise.resolve(
      message.author.send(
        i18n.t('reminder.notify', { text: message.content })
      )
    ).catch(() => {
      /* ignore */
    });
  }, delay);
  try {
    await message.reply(result.reply || i18n.t('reminder.set', { date: date.toISOString() }));
  } catch {
    /* ignore */
  }
}

export function setupReminderListener(client: Client): void {
  client.on('messageCreate', (msg) => {
    if (msg.guildId || msg.author.bot) return;
    void handleReminderMessage(msg);
  });
}
