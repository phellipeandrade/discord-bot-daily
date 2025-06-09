import {
  isHoliday,
  getBrazilianHolidays,
  BRAZILIAN_FIXED_HOLIDAYS,
  getUSHolidays
} from '../holidays';

describe('Módulo de Feriados', () => {
  describe('Feriados Fixos', () => {
    test('deve reconhecer o Ano Novo', () => {
      const anoNovo = new Date(2024, 0, 1); // 1 de Janeiro de 2024
      expect(isHoliday(anoNovo)).toBe(true);
    });

    test('deve reconhecer o Natal', () => {
      const natal = new Date(2024, 11, 25); // 25 de Dezembro de 2024
      expect(isHoliday(natal)).toBe(true);
    });

    test('não deve reconhecer um dia normal como feriado', () => {
      const diaNormal = new Date(2024, 3, 15); // 15 de Abril de 2024
      expect(isHoliday(diaNormal)).toBe(false);
    });

    test('deve ter 8 feriados fixos', () => {
      expect(BRAZILIAN_FIXED_HOLIDAYS.length).toBe(8);
    });
  });

  describe('Feriados Móveis 2024', () => {
    const feriados2024 = getBrazilianHolidays(2024);

    test('deve incluir Carnaval em 13/02/2024', () => {
      const carnaval = feriados2024.find(h => h.name === 'Carnaval');
      expect(carnaval?.date).toBe('13/02');
    });

    test('deve incluir Sexta-feira Santa em 29/03/2024', () => {
      const sextaSanta = feriados2024.find(h => h.name === 'Paixão de Cristo');
      expect(sextaSanta?.date).toBe('29/03');
    });

    test('deve incluir Corpus Christi em 30/05/2024', () => {
      const corpusChristi = feriados2024.find(h => h.name === 'Corpus Christi');
      expect(corpusChristi?.date).toBe('30/05');
    });
  });

  describe('Feriados Móveis 2025', () => {
    const feriados2025 = getBrazilianHolidays(2025);

    test('deve incluir Carnaval em 04/03/2025', () => {
      const carnaval = feriados2025.find(h => h.name === 'Carnaval');
      expect(carnaval?.date).toBe('04/03');
    });

    test('deve incluir Sexta-feira Santa em 18/04/2025', () => {
      const sextaSanta = feriados2025.find(h => h.name === 'Paixão de Cristo');
      expect(sextaSanta?.date).toBe('18/04');
    });

    test('deve incluir Corpus Christi em 19/06/2025', () => {
      const corpusChristi = feriados2025.find(h => h.name === 'Corpus Christi');
      expect(corpusChristi?.date).toBe('19/06');
    });
  });

  describe('Total de Feriados', () => {
    test('deve ter 11 feriados no total (8 fixos + 3 móveis)', () => {
      const feriados2024 = getBrazilianHolidays(2024);
      expect(feriados2024.length).toBe(11);
    });

    test('não deve ter feriados duplicados', () => {
      const feriados2024 = getBrazilianHolidays(2024);
      const datas = feriados2024.map(h => h.date);
      const datasUnicas = new Set(datas);
      expect(datasUnicas.size).toBe(datas.length);
    });
  });

  describe('Feriados dos EUA', () => {
    const feriadosUS2024 = getUSHolidays(2024);

    test('deve incluir Thanksgiving em 28/11/2024', () => {
      const tg = feriadosUS2024.find(h => h.name === 'Thanksgiving');
      expect(tg?.date).toBe('28/11');
    });

    test('isHoliday deve reconhecer Independence Day', () => {
      const date = new Date(2024, 6, 4); // 4 de julho
      expect(isHoliday(date, ['US'])).toBe(true);
    });

    test('isHoliday deve considerar múltiplos países', () => {
      const date = new Date(2024, 0, 1); // 1 de janeiro
      expect(isHoliday(date, ['BR', 'US'])).toBe(true);
    });
  });
});
