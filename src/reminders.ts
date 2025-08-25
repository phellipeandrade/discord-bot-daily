import { Client, Message } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import { i18n } from '@/i18n';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    });
    return JSON.parse(res.text || '') as ChatResult;
  } catch {
    return null;
  }
}

export async function handleReminderMessage(message: Message): Promise<void> {
  const result = await chatResponse(message.content);
  if (!result) {
    await message.reply(i18n.t('reminder.parseError'));
    return;
  }

  const dateStr = result.intent?.setReminder?.date;
  if (!dateStr) {
    await message.reply(result.reply || i18n.t('reminder.defaultReply'));
    return;
  }

  const date = new Date(dateStr);
  const delay = date.getTime() - Date.now();
  if (isNaN(date.getTime()) || delay <= 0) {
    await message.reply(i18n.t('reminder.invalidTime'));
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
  await message.reply(result.reply || i18n.t('reminder.set', { date: date.toISOString() }));
}

export function setupReminderListener(client: Client): void {
  client.on('messageCreate', (msg) => {
    if (msg.guildId || msg.author.bot) return;
    void handleReminderMessage(msg);
  });
}
