import type { BudgetEntry, BudgetGroup, BudgetMonthResponse } from './budgets.types';
import {
  getEntryActual,
  getGroupTotals,
  getLimitStatus,
  getMonthTotals,
  parseAmountInput,
  setEntryPaid,
} from './budgets.utils';

const fixed = (id: string, amount: string, paid: boolean): BudgetEntry => ({
  id,
  groupId: 'g1',
  itemId: null,
  name: id,
  amount,
  kind: 'FIXED',
  categoryId: null,
  paid,
  position: 0,
  spent: null,
});

const limit = (id: string, amount: string, spent: number): BudgetEntry => ({
  ...fixed(id, amount, false),
  kind: 'CATEGORY_LIMIT',
  categoryId: 'cat-1',
  spent,
});

const group = (id: string, entries: BudgetEntry[]): BudgetGroup => ({
  id,
  name: id,
  color: '#4F5DFF',
  position: 0,
  entries,
});

describe('getEntryActual', () => {
  it('una linea fija solo cuenta si esta pagada', () => {
    expect(getEntryActual(fixed('a', '100.00', true))).toBe(100);
    expect(getEntryActual(fixed('a', '100.00', false))).toBe(0);
  });

  it('una linea con limite cuenta lo gastado, no el check', () => {
    expect(getEntryActual(limit('a', '180.00', 52.5))).toBe(52.5);
  });

  it('un importe negativo pagado resta (reembolso)', () => {
    expect(getEntryActual(fixed('a', '-50.00', true))).toBe(-50);
  });
});

describe('getGroupTotals', () => {
  it('suma lo previsto de todas las lineas y lo pagado solo de las marcadas', () => {
    const totals = getGroupTotals([fixed('a', '379.65', true), fixed('b', '90.00', true), fixed('c', '2.99', false)]);

    expect(totals).toEqual({ planned: 472.64, paid: 469.65 });
  });

  it('mezcla fijas, reembolsos negativos y limites', () => {
    const totals = getGroupTotals([
      fixed('a', '100.00', true),
      fixed('b', '-40.15', true),
      limit('c', '180.00', 50),
    ]);

    expect(totals).toEqual({ planned: 239.85, paid: 109.85 });
  });

  it('no arrastra errores de coma flotante', () => {
    expect(getGroupTotals([fixed('a', '0.10', true), fixed('b', '0.20', true)])).toEqual({ planned: 0.3, paid: 0.3 });
  });

  it('un grupo vacio suma cero', () => {
    expect(getGroupTotals([])).toEqual({ planned: 0, paid: 0 });
  });
});

describe('getMonthTotals', () => {
  const groups = [
    group('hogar', [fixed('a', '803.83', false), fixed('b', '100.00', true)]),
    group('ahorros', [fixed('c', '600.00', true)]),
  ];

  it('calcula total a gastar y el resto previsto y real a partir del sueldo', () => {
    expect(getMonthTotals(groups, 1594.9)).toEqual({
      income: 1594.9,
      planned: 1503.83,
      paid: 700,
      remainingPlanned: 91.07,
      remainingReal: 894.9,
    });
  });

  it('el resto es negativo si lo previsto supera el sueldo', () => {
    expect(getMonthTotals(groups, 1000).remainingPlanned).toBe(-503.83);
  });

  it('sin grupos el resto es el sueldo entero', () => {
    expect(getMonthTotals([], 1000)).toEqual({
      income: 1000,
      planned: 0,
      paid: 0,
      remainingPlanned: 1000,
      remainingReal: 1000,
    });
  });
});

describe('getLimitStatus', () => {
  it('calcula lo que queda y la proporcion usada', () => {
    expect(getLimitStatus(limit('a', '180.00', 45))).toEqual({
      limit: 180,
      spent: 45,
      remaining: 135,
      ratio: 0.25,
      isOver: false,
    });
  });

  it('marca que te has pasado y limita la proporcion a 1', () => {
    const status = getLimitStatus(limit('a', '100.00', 130));

    expect(status.isOver).toBe(true);
    expect(status.remaining).toBe(-30);
    expect(status.ratio).toBe(1);
  });

  it('gastar exactamente el limite no cuenta como pasarse', () => {
    expect(getLimitStatus(limit('a', '100.00', 100)).isOver).toBe(false);
  });
});

describe('parseAmountInput', () => {
  it.each([
    ['1700', 1700],
    ['1700,5', 1700.5],
    ['1700.5', 1700.5],
    ['12.34', 12.34],
    ['0', 0],
    ['  42,10  ', 42.1],
  ])('lee "%s" como %s', (text, expected) => {
    expect(parseAmountInput(text)).toBe(expected);
  });

  it.each([
    ['1.500', 1500],
    ['12.345', 12345],
    ['1.500,75', 1500.75],
    ['1.234.567', 1234567],
  ])('trata el punto como separador de miles en "%s" -> %s', (text, expected) => {
    expect(parseAmountInput(text)).toBe(expected);
  });

  it.each([[''], ['   '], ['abc'], ['-5'], ['1,5,5'], ['1.5.5'], ['12 €']])('rechaza "%s"', (text) => {
    expect(parseAmountInput(text)).toBeNull();
  });
});

describe('setEntryPaid', () => {
  const month: BudgetMonthResponse = {
    month: { year: 2026, month: 9, income: '1000' },
    groups: [group('g', [fixed('a', '10.00', false), fixed('b', '20.00', false)])],
  };

  it('cambia solo la linea indicada y no muta el original', () => {
    const updated = setEntryPaid(month, 'b', true);

    expect(updated.groups[0].entries.map((e) => e.paid)).toEqual([false, true]);
    expect(month.groups[0].entries[1].paid).toBe(false);
  });
});
