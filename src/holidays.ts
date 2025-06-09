interface Holiday {
  date: string; // format: DD/MM
  name: string;
}

export const BRAZILIAN_FIXED_HOLIDAYS: Holiday[] = [
  { date: '01/01', name: 'Confraternização Universal' },
  { date: '21/04', name: 'Tiradentes' },
  { date: '01/05', name: 'Dia do Trabalho' },
  { date: '07/09', name: 'Independência do Brasil' },
  { date: '12/10', name: 'Nossa Senhora Aparecida' },
  { date: '02/11', name: 'Finados' },
  { date: '15/11', name: 'Proclamação da República' },
  { date: '25/12', name: 'Natal' }
];

const US_FIXED_HOLIDAYS: Holiday[] = [
  { date: '01/01', name: "New Year's Day" },
  { date: '04/07', name: 'Independence Day' },
  { date: '11/11', name: 'Veterans Day' },
  { date: '25/12', name: 'Christmas Day' }
];

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const date = new Date(year, month, 1);
  let count = 0;
  while (date.getMonth() === month) {
    if (date.getDay() === weekday) {
      count++;
      if (count === n) break;
    }
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const date = new Date(year, month + 1, 0); // last day of month
  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() - 1);
  }
  return date;
}

function calculateEasterDate(year: number): Date {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

function getBrazilianMovableHolidays(year: number): Holiday[] {
  const easter = calculateEasterDate(year);
  const holidays: Holiday[] = [];

  // Carnaval (47 dias antes da Páscoa)
  const carnival = new Date(easter);
  carnival.setDate(easter.getDate() - 47);
  holidays.push({ date: formatDate(carnival), name: 'Carnaval' });

  // Sexta-feira Santa (2 dias antes da Páscoa)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({ date: formatDate(goodFriday), name: 'Paixão de Cristo' });

  // Corpus Christi (60 dias após a Páscoa)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays.push({ date: formatDate(corpusChristi), name: 'Corpus Christi' });

  return holidays;
}

function getUSMovableHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [];

  const mlk = nthWeekdayOfMonth(year, 0, 1, 3); // third Monday January
  holidays.push({ date: formatDate(mlk), name: 'Martin Luther King Jr. Day' });

  const memorial = lastWeekdayOfMonth(year, 4, 1); // last Monday May
  holidays.push({ date: formatDate(memorial), name: 'Memorial Day' });

  const labor = nthWeekdayOfMonth(year, 8, 1, 1); // first Monday September
  holidays.push({ date: formatDate(labor), name: 'Labor Day' });

  const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4); // fourth Thursday November
  holidays.push({ date: formatDate(thanksgiving), name: 'Thanksgiving' });

  return holidays;
}

export function getBrazilianHolidays(year: number = new Date().getFullYear()): Holiday[] {
  return [...BRAZILIAN_FIXED_HOLIDAYS, ...getBrazilianMovableHolidays(year)];
}

export function getUSHolidays(year: number = new Date().getFullYear()): Holiday[] {
  return [...US_FIXED_HOLIDAYS, ...getUSMovableHolidays(year)];
}

export function getHolidays(countries: string[] = ['BR'], year: number = new Date().getFullYear()): Holiday[] {
  const list: Holiday[] = [];
  for (const c of countries.map(c => c.toUpperCase())) {
    if (c === 'BR') list.push(...getBrazilianHolidays(year));
    else if (c === 'US') list.push(...getUSHolidays(year));
  }
  const seen = new Set<string>();
  return list.filter(h => {
    if (seen.has(h.date)) return false;
    seen.add(h.date);
    return true;
  });
}

export function isHoliday(date: Date, countries: string[] = ['BR']): boolean {
  const holidays = getHolidays(countries, date.getFullYear());
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const dateStr = `${day}/${month}`;

  return holidays.some(holiday => holiday.date === dateStr);
}
