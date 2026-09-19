import { compareYearMonth, getCurrentYearMonth, getMonthRange } from './date';

describe('getCurrentYearMonth', () => {
  it('devuelve el año y el mes (1-12) actuales', () => {
    const now = new Date();
    expect(getCurrentYearMonth()).toEqual({ year: now.getFullYear(), month: now.getMonth() + 1 });
  });
});

describe('compareYearMonth', () => {
  it('devuelve 0 si son el mismo año y mes', () => {
    expect(compareYearMonth({ year: 2026, month: 6 }, { year: 2026, month: 6 })).toBe(0);
  });

  it('devuelve negativo si a es anterior a b', () => {
    expect(compareYearMonth({ year: 2026, month: 5 }, { year: 2026, month: 6 })).toBeLessThan(0);
    expect(compareYearMonth({ year: 2025, month: 12 }, { year: 2026, month: 1 })).toBeLessThan(0);
  });

  it('devuelve positivo si a es posterior a b', () => {
    expect(compareYearMonth({ year: 2026, month: 7 }, { year: 2026, month: 6 })).toBeGreaterThan(0);
    expect(compareYearMonth({ year: 2027, month: 1 }, { year: 2026, month: 12 })).toBeGreaterThan(0);
  });
});

describe('getMonthRange', () => {
  it('cubre desde el primer instante hasta el ultimo instante del mes', () => {
    const { from, to } = getMonthRange(2026, 6);

    expect(from).toBe('2026-06-01T00:00:00.000Z');
    expect(to).toBe('2026-06-30T23:59:59.999Z');
  });

  it('calcula bien el ultimo dia de un mes de 31 dias y de febrero', () => {
    expect(getMonthRange(2026, 1).to).toBe('2026-01-31T23:59:59.999Z');
    expect(getMonthRange(2026, 2).to).toBe('2026-02-28T23:59:59.999Z');
    expect(getMonthRange(2028, 2).to).toBe('2028-02-29T23:59:59.999Z'); // 2028 es bisiesto
  });

  it('pasa correctamente de diciembre a enero del año siguiente', () => {
    const { from, to } = getMonthRange(2026, 12);
    expect(from).toBe('2026-12-01T00:00:00.000Z');
    expect(to).toBe('2026-12-31T23:59:59.999Z');
  });
});
