import { Client, Message } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import { i18n } from '@/i18n';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface ParsedReminder {
  datetime: string;
  text: string;
}

async function detectReminderIntent(content: string): Promise<boolean> {
  const prompt =
    'Does the following message ask to set a reminder? The user may speak Portuguese. Respond in JSON with property "isReminder" as true or false. Message: ' +
    JSON.stringify(content);
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt
    });
    const data = JSON.parse(res.text || '');
    return Boolean(data?.isReminder);
  } catch {
    return false;
  }
}

export async function parseReminder(
  content: string
): Promise<ParsedReminder | null> {
  const prompt =
    'Extract a future ISO 8601 datetime and the reminder text from the following reminder request. The user may speak Portuguese. ' +
    'Respond in JSON with properties "datetime" and "text". Message: ' +
    JSON.stringify(content);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt
    });
    const text = response.text || '';
    const data = JSON.parse(text);
    if (data?.datetime) {
      return { datetime: data.datetime, text: data.text || content };
    }
  } catch {
    // ignore parsing errors
  }
  return null;
}

async function chatResponse(content: string): Promise<string> {
  const lang = i18n.getLanguage() === 'pt-br' ? 'Portuguese' : 'English';
  const prompt =
    `You are a friendly reminder bot. Reply conversationally in ${lang} to the following message: ` +
    JSON.stringify(content);
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt
    });
    return res.text || i18n.t('reminder.defaultReply');
  } catch {
    return i18n.t('reminder.defaultReply');
  }
}

export async function handleReminderMessage(message: Message): Promise<void> {
  const isReminder = await detectReminderIntent(message.content);
  if (!isReminder) {
    const replyText = await chatResponse(message.content);
    await message.reply(replyText);
    return;
  }

  const parsed = await parseReminder(message.content);
  if (!parsed) {
    await message.reply(
      i18n.t('reminder.parseError')
    );
    return;
  }
  const date = new Date(parsed.datetime);
  const delay = date.getTime() - Date.now();
  if (isNaN(date.getTime()) || delay <= 0) {
    await message.reply(i18n.t('reminder.invalidTime'));
    return;
  }
  setTimeout(() => {
    Promise.resolve(
      message.author.send(i18n.t('reminder.notify', { text: parsed.text }))
    ).catch(() => {
      /* ignore */
    });
  }, delay);
  await message.reply(i18n.t('reminder.set', { date: date.toISOString() }));
}

export function setupReminderListener(client: Client): void {
  client.on('messageCreate', (msg) => {
    if (msg.guildId || msg.author.bot) return;
    void handleReminderMessage(msg);
  });
}
