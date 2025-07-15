import { DATE_FORMAT } from '@/config';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isDateFormatValid(format: string): boolean {
  if (!format.includes('YYYY') || !format.includes('MM') || !format.includes('DD')) {
    return false;
  }
  const pattern =
    '^' +
    escapeRegex(format)
      .replace('YYYY', '(?<year>\\d{4})')
      .replace('MM', '(?<month>\\d{2})')
      .replace('DD', '(?<day>\\d{2})') +
    '$';
  const sample = format
    .replace('YYYY', '2024')
    .replace('MM', '12')
    .replace('DD', '31');
  const match = new RegExp(pattern).exec(sample);
  if (!match || !match.groups) return false;
  const { year, month, day } = match.groups as Record<string, string>;
  const iso = `${year}-${month}-${day}`;
  return !isNaN(Date.parse(iso));
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

export function formatDateString(iso: string): string {
  const [year, month, day] = iso.split('-');
  return DATE_FORMAT.replace('YYYY', year).replace('MM', month).replace('DD', day);
}
