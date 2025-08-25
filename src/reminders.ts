import { Client, Message } from 'discord.js';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface ParsedReminder {
  datetime: string;
  text: string;
}

export async function parseReminder(
  content: string
): Promise<ParsedReminder | null> {
  const prompt =
    'Extract a future ISO 8601 datetime and the reminder text from the following message.' +
    ' Respond in JSON with properties "datetime" and "text". Message: ' +
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

export async function handleReminderMessage(message: Message): Promise<void> {
  const parsed = await parseReminder(message.content);
  if (!parsed) {
    await message.reply('Sorry, I could not understand the reminder.');
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
