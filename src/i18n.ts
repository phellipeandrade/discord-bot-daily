import i18next from 'i18next';
import * as fs from 'fs';
import * as path from 'path';

export type Language = 'en' | 'pt-br';

interface CommandOption {
  name: string;
  description: string;
}

interface Command {
  name: string;
  description: string;
  options?: Record<string, CommandOption>;
}

interface TranslationResource {
  commands: Record<string, Command>;
  [key: string]: unknown;
}

const loadTranslations = (lang: Language): TranslationResource => {
  try {
    return process.env.NODE_ENV === 'test'
      ? { commands: {} }
      : JSON.parse(fs.readFileSync(path.join(__dirname, `i18n/${lang}.json`), 'utf-8'));
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    return { commands: {} };
  }
};

i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: loadTranslations('en')
    },
    'pt-br': {
      translation: loadTranslations('pt-br')
    }
  },
  interpolation: {
    escapeValue: false
  }
});

export const i18n = {
  t: (key: string, params: Record<string, string | number> = {}): string => {
    return i18next.t(key, params);
  },

  setLanguage: (lang: Language): void => {
    i18next.changeLanguage(lang);
  },

  getCommandName: (command: string): string => {
    return i18next.t(`commands.${command}.name`, { defaultValue: command });
  },

  getCommandDescription: (command: string): string => {
    return i18next.t(`commands.${command}.description`, { defaultValue: '' });
  },

  getOptionName: (command: string, option: string): string => {
    return i18next.t(`commands.${command}.options.${option}.name`, { defaultValue: option });
  },

  getOptionDescription: (command: string, option: string): string => {
    return i18next.t(`commands.${command}.options.${option}.description`, { defaultValue: '' });
  }
}; 