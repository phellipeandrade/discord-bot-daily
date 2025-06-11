import { jest } from '@jest/globals';

beforeEach(() => {
  jest.resetModules();
  process.env.DATE_FORMAT = 'YYYY-MM-DD';
});

describe('date utilities', () => {
  test('parseDateString returns iso date when valid', () => {
    const { parseDateString } = require('../date');
    expect(parseDateString('2024-12-31')).toBe('2024-12-31');
  });

  test('parseDateString returns null for invalid format', () => {
    const { parseDateString } = require('../date');
    expect(parseDateString('31/12/2024')).toBeNull();
  });

  test('parseDateString keeps value for out-of-range date', () => {
    const { parseDateString } = require('../date');
    expect(parseDateString('2024-02-30')).toBe('2024-02-30');
  });

  test('todayISO returns current date', () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-20T12:34:56Z'));
    const { todayISO } = require('../date');
    expect(todayISO()).toBe('2024-05-20');
    jest.useRealTimers();
  });

  test('isDateFormatValid detects valid patterns', () => {
    const { isDateFormatValid } = require('../date');
    expect(isDateFormatValid('YYYY-MM-DD')).toBe(true);
    expect(isDateFormatValid('DD/MM/YYYY')).toBe(true);
  });

  test('isDateFormatValid detects invalid patterns', () => {
    const { isDateFormatValid } = require('../date');
    expect(isDateFormatValid('YYYY/DD')).toBe(false);
    expect(isDateFormatValid('ABC')).toBe(false);
  });
});
