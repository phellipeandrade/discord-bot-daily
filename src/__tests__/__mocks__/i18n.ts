import { i18n as realI18n, Language } from '../../i18n';

export const i18n = {
  ...realI18n,
  t: jest.fn((key: string, params: Record<string, string | number> = {}) => {
    // Mock das traduções mais comuns usadas nos testes
    const translations: Record<string, string> = {
      'list.empty': '(none)',
      'music.noValidMusic': '✅ No valid music found.',
      'music.marked': '✅ Song marked as played!\n\n🎵 To play the song in the bot, copy and send the command below:\n```\n/play {{link}}\n```',
      'music.reactionsCleared': '✅ Removed {{count}} 🐰 reactions made by the bot.',
      'user.registered': '✅ User {{name}} has been registered!',
      'user.selfRegistered': '✅ You have been registered!',
      'user.removed': '✅ User {{name}} has been removed!',
      'selection.resetOriginal': '✅ Selection list has been reset to original state.',
      'selection.resetAll': '✅ {{count}} users have been readded to the selection list.',
      'selection.readded': '✅ {{name}} has been readded to the selection list.'
    };

    const text = translations[key] || key;
    if (typeof text !== 'string') return key;
    
    return text.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
      const value = params[paramKey];
      return value !== undefined ? String(value) : `{{${paramKey}}}`;
    });
  }),
  getCommandName: jest.fn((command: string) => command),
  getCommandDescription: jest.fn((command: string) => `Description for ${command}`),
  getOptionName: jest.fn((command: string, option: string) => option),
  getOptionDescription: jest.fn((command: string, option: string) => `Description for ${option}`),
  setLanguage: jest.fn((_lang: Language) => undefined)
}; 