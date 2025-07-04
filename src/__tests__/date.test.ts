import { jest } from '@jest/globals';

beforeEach(() => {
  jest.resetModules();
});

describe('date utilities', () => {
  test('parseDateString returns iso date when valid', async () => {
    jest.doMock('../config', () => ({ DATE_FORMAT: 'YYYY-MM-DD' }));
    const { parseDateString } = await import('../date');
    expect(parseDateString('2024-12-31')).toBe('2024-12-31');
  });

  test('parseDateString returns null for invalid format', async () => {
    jest.doMock('../config', () => ({ DATE_FORMAT: 'YYYY-MM-DD' }));
    const { parseDateString } = await import('../date');
    expect(parseDateString('31/12/2024')).toBeNull();
  });

  test('parseDateString keeps value for out-of-range date', async () => {
    jest.doMock('../config', () => ({ DATE_FORMAT: 'YYYY-MM-DD' }));
    const { parseDateString } = await import('../date');
    expect(parseDateString('2024-02-30')).toBe('2024-02-30');
  });

  test('todayISO returns current date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-20T12:34:56Z'));
    const { todayISO } = await import('../date');
    expect(todayISO()).toBe('2024-05-20');
    jest.useRealTimers();
  });

  test('formatDateString follows DATE_FORMAT', async () => {
    jest.doMock('../config', () => ({ DATE_FORMAT: 'DD-MM-YYYY' }));
    const { formatDateString } = await import('../date');
    expect(formatDateString('2024-07-08')).toBe('08-07-2024');
  });

  test('isDateFormatValid detects valid patterns', async () => {
    const { isDateFormatValid } = await import('../date');
    expect(isDateFormatValid('YYYY-MM-DD')).toBe(true);
    expect(isDateFormatValid('DD/MM/YYYY')).toBe(true);
  });

  test('isDateFormatValid detects invalid patterns', async () => {
    const { isDateFormatValid } = await import('../date');
    expect(isDateFormatValid('YYYY/DD')).toBe(false);
    expect(isDateFormatValid('ABC')).toBe(false);
  });
});
