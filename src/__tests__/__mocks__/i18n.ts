import { i18n as realI18n } from '../../i18n';

export const i18n = {
  ...realI18n,
  t: jest.fn((key: string, params: Record<string, any> = {}) => {
    // Mock das traduções mais comuns usadas nos testes
    const translations: Record<string, string> = {
      'list.empty': '(none)',
      'music.noValidMusic': '✅ No valid music found.',
      'music.marked': '✅ Song marked as played!\n\n🎵 To play the song in the bot, copy and send the command below:\n```\n/play {{link}}\n```',
      'music.reactionsCleared': '✅ Removed {{count}} 🐰 reactions made by the bot.'
    };

    let text = translations[key] || key;
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);
  }),
  getCommandName: jest.fn((command: string) => command),
  getCommandDescription: jest.fn((command: string) => `Description for ${command}`),
  getOptionName: jest.fn((command: string, option: string) => option),
  getOptionDescription: jest.fn((command: string, option: string) => `Description for ${option}`),
  setLanguage: jest.fn((lang: 'en' | 'pt-br') => {})
}; 