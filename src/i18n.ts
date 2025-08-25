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
    const json = fs.readFileSync(path.join(__dirname, `i18n/${lang}.json`), 'utf-8');
    const result = JSON.parse(json);
    const commands = Object.values(result.commands as Record<string, Command>)
      .map(c => c.name)
      .join(', ');
    console.log(`\u{1F50D} [${lang}] translations loaded: ${commands}`);
    return result;
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    return { commands: {} };
  }
};

i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  // normalize language codes to lowercase so resources like "pt-br" match
  // environment variables regardless of casing
  lowerCaseLng: true,
  // load resources synchronously to ensure translations are available
  initImmediate: false,
  saveMissing: true,
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

i18next.on('missingKey', (lngs, ns, key) => {
  console.log(`\u{1F50D} Debug - Fallback used for key "${key}"`);
});

export const i18n = {
  t: (key: string, params: Record<string, string | number> = {}): string => {
    return i18next.t(key, params);
  },

  setLanguage: (lang: Language): void => {
    i18next.changeLanguage(lang);
  },

  getLanguage: (): Language => {
    return i18next.language as Language;
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
