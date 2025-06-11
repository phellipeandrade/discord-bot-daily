import { DATE_FORMAT } from './config';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseDateString(input: string): string | null {
  const format = DATE_FORMAT;
  const pattern = '^' +
    escapeRegex(format)
      .replace('YYYY', '(?<year>\\d{4})')
      .replace('MM', '(?<month>\\d{2})')
      .replace('DD', '(?<day>\\d{2})') + '$';
  const match = new RegExp(pattern).exec(input);
  if (!match || !match.groups) return null;
  const { year, month, day } = match.groups as Record<string, string>;
  const iso = `${year}-${month}-${day}`;
  return isNaN(Date.parse(iso)) ? null : iso;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
