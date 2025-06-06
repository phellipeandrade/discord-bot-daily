interface Holiday {
  date: string; // formato: DD/MM
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

function getMovableHolidays(year: number): Holiday[] {
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

export function getBrazilianHolidays(year: number = new Date().getFullYear()): Holiday[] {
  return [...BRAZILIAN_FIXED_HOLIDAYS, ...getMovableHolidays(year)];
}

export function isHoliday(date: Date): boolean {
  const holidays = getBrazilianHolidays(date.getFullYear());
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const dateStr = `${day}/${month}`;

  return holidays.some(holiday => holiday.date === dateStr);
}
