import { Client, Message } from 'discord.js';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface ParsedReminder {
  datetime: string;
  text: string;
}

async function detectReminderIntent(content: string): Promise<boolean> {
  const prompt =
    'Does the following message ask to set a reminder? Respond in JSON with property "isReminder" as true or false. Message: ' +
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
    'Extract a future ISO 8601 datetime and the reminder text from the following reminder request. ' +
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
  const prompt =
    'You are a friendly reminder bot. Reply conversationally to the following message: ' +
    JSON.stringify(content);
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt
    });
    return res.text || "I'm here to help with reminders!";
  } catch {
    return "I'm here to help with reminders!";
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
      'I could not understand your reminder. Try something like "Remind me to call Amir tomorrow at 3 PM".'
    );
    return;
  }
  const date = new Date(parsed.datetime);
  const delay = date.getTime() - Date.now();
  if (isNaN(date.getTime()) || delay <= 0) {
    await message.reply('The reminder time is invalid or in the past.');
    return;
  }
  setTimeout(() => {
    Promise.resolve(
      message.author.send(`\u23f0 Reminder: ${parsed.text}`)
    ).catch(() => {
      /* ignore */
    });
  }, delay);
  await message.reply(`Reminder set for ${date.toISOString()}.`);
}

export function setupReminderListener(client: Client): void {
  client.on('messageCreate', (msg) => {
    if (msg.guildId || msg.author.bot) return;
    void handleReminderMessage(msg);
  });
}
