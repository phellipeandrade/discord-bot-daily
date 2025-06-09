import * as fs from 'fs';
import * as path from 'path';

type Language = 'en' | 'pt-br';

interface I18nConfig {
  defaultLanguage: Language;
  currentLanguage: Language;
  translations: Record<Language, any>;
}

class I18n {
  private static instance: I18n;
  private readonly config: I18nConfig;

  private constructor() {
    this.config = {
      defaultLanguage: 'en',
      currentLanguage: 'en',
      translations: {
        'en': process.env.NODE_ENV === 'test' ? {} : JSON.parse(fs.readFileSync(path.join(__dirname, '../i18n/en.json'), 'utf-8')),
        'pt-br': process.env.NODE_ENV === 'test' ? {} : JSON.parse(fs.readFileSync(path.join(__dirname, '../i18n/pt-br.json'), 'utf-8'))
      }
    };
  }

  public static getInstance(): I18n {
    if (!I18n.instance) {
      I18n.instance = new I18n();
    }
    return I18n.instance;
  }

  public setLanguage(lang: Language): void {
    this.config.currentLanguage = lang;
  }

  public t(key: string, params: Record<string, any> = {}): string {
    const keys = key.split('.');
    let value = this.config.translations[this.config.currentLanguage];

    for (const k of keys) {
      if (!value[k]) {
        console.warn(`Translation key not found: ${key}`);
        value = this.config.translations[this.config.defaultLanguage];
        break;
      }
      value = value[k];
    }

    return this.interpolate(value, params);
  }

  private interpolate(text: string, params: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);
  }

  public getCommandName(command: string): string {
    return this.config.translations[this.config.currentLanguage]?.commands?.[command]?.name ?? command;
  }

  public getCommandDescription(command: string): string {
    return this.config.translations[this.config.currentLanguage]?.commands?.[command]?.description ?? '';
  }

  public getOptionName(command: string, option: string): string {
    return this.config.translations[this.config.currentLanguage]?.commands?.[command]?.options?.[option]?.name ?? option;
  }

  public getOptionDescription(command: string, option: string): string {
    return this.config.translations[this.config.currentLanguage]?.commands?.[command]?.options?.[option]?.description ?? '';
  }
}

export const i18n = I18n.getInstance(); 