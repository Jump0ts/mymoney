import { formatDate, formatMoney, formatMonthLabel } from './format';

describe('formatMoney', () => {
  it('formatea un número como euros', () => {
    expect(formatMoney(1234.5)).toContain('1234,50');
  });

  it('acepta un string numérico', () => {
    expect(formatMoney('45.5')).toContain('45,50');
  });
});

describe('formatDate', () => {
  it('formatea una fecha ISO en formato corto español', () => {
    const result = formatDate('2026-05-10T10:00:00.000Z');
    expect(result).toMatch(/may/i);
    expect(result).toContain('2026');
  });
});

describe('formatMonthLabel', () => {
  it('capitaliza el mes abreviado', () => {
    const label = formatMonthLabel('2026-01');
    expect(label[0]).toBe(label[0].toUpperCase());
  });
});
