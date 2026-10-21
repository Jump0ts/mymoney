import type { BudgetEntry, BudgetGroup, BudgetMonthResponse } from './budgets.types';
import {
  formatAmountForInput,
  getEntryActual,
  getGroupTotals,
  getLimitStatus,
  getLineType,
  getMonthTotals,
  parseAmountInput,
  setEntryPaid,
  toGroupPayload,
  toLinePayload,
} from './budgets.utils';

const fixed = (id: string, amount: string, paid: boolean): BudgetEntry => ({
  id,
  groupId: 'g1',
  itemId: null,
  name: id,
  amount,
  paid,
  position: 0,
});

const group = (id: string, entries: BudgetEntry[]): BudgetGroup => ({
  id,
  name: id,
  color: '#4F5DFF',
  limit: null,
  position: 0,
  entries,
});

describe('getEntryActual', () => {
  it('una linea fija solo cuenta si esta pagada', () => {
    expect(getEntryActual(fixed('a', '100.00', true))).toBe(100);
    expect(getEntryActual(fixed('a', '100.00', false))).toBe(0);
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

  it('mezcla fijas y reembolsos negativos', () => {
    const totals = getGroupTotals([fixed('a', '100.00', true), fixed('b', '-40.15', true), fixed('c', '180.00', false)]);

    expect(totals).toEqual({ planned: 239.85, paid: 59.85 });
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
  const limited = (limitValue: string | null, entries: BudgetEntry[]): BudgetGroup => ({
    ...group('g', entries),
    limit: limitValue,
  });

  it('un grupo sin limite no tiene estado', () => {
    expect(getLimitStatus(limited(null, [fixed('a', '100.00', true)]))).toBeNull();
  });

  it('cuenta lo previsto, este o no pagado, contra el limite', () => {
    const status = getLimitStatus(limited('600.00', [fixed('a', '300.00', false), fixed('b', '150.00', true)]));

    expect(status).toEqual({ limit: 600, used: 450, remaining: 150, ratio: 0.75, isOver: false });
  });

  it('un reembolso libera parte del limite', () => {
    const status = getLimitStatus(limited('100.00', [fixed('a', '120.00', false), fixed('b', '-40.00', false)]));

    expect(status?.used).toBe(80);
    expect(status?.isOver).toBe(false);
  });

  it('marca que te has pasado y limita la proporcion a 1', () => {
    const status = getLimitStatus(limited('100.00', [fixed('a', '130.00', false)]));

    expect(status?.isOver).toBe(true);
    expect(status?.remaining).toBe(-30);
    expect(status?.ratio).toBe(1);
  });

  it('llegar exactamente al limite no cuenta como pasarse', () => {
    expect(getLimitStatus(limited('100.00', [fixed('a', '100.00', false)]))?.isOver).toBe(false);
  });

  it('un grupo vacio con limite no ha consumido nada, y la proporcion nunca baja de 0', () => {
    expect(getLimitStatus(limited('100.00', []))).toEqual({ limit: 100, used: 0, remaining: 100, ratio: 0, isOver: false });
    expect(getLimitStatus(limited('100.00', [fixed('a', '-30.00', false)]))?.ratio).toBe(0);
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

describe('getLineType', () => {
  it('distingue fija y reembolso', () => {
    expect(getLineType(fixed('a', '10.00', false))).toBe('FIXED');
    expect(getLineType(fixed('a', '-50.00', false))).toBe('REFUND');
  });
});

describe('formatAmountForInput', () => {
  it('quita el signo y usa coma decimal', () => {
    expect(formatAmountForInput('21.99')).toBe('21,99');
    expect(formatAmountForInput('-50.00')).toBe('50');
    expect(formatAmountForInput('1500.50')).toBe('1500,5');
  });
});

describe('toLinePayload', () => {
  it('una linea fija lleva importe positivo y el nombre sin espacios', () => {
    expect(toLinePayload({ name: '  Netflix ', lineType: 'FIXED', amount: '21,99' })).toEqual({
      name: 'Netflix',
      amount: 21.99,
    });
  });

  it('un reembolso lleva el importe negativo', () => {
    expect(toLinePayload({ name: 'Luz Ivan', lineType: 'REFUND', amount: '50' })).toEqual({
      name: 'Luz Ivan',
      amount: -50,
    });
  });

  it('entiende el punto de miles', () => {
    expect(toLinePayload({ name: 'Hipoteca', lineType: 'FIXED', amount: '1.500' }).amount).toBe(1500);
  });
});

describe('toGroupPayload', () => {
  it('un limite escrito se convierte en numero', () => {
    expect(toGroupPayload({ name: '  Gastos fijos ', color: '#112233', limit: '600,50' })).toEqual({
      name: 'Gastos fijos',
      color: '#112233',
      limit: 600.5,
    });
  });

  it('un limite vacio o en blanco significa sin limite', () => {
    expect(toGroupPayload({ name: 'Hogar', color: '#112233', limit: '' }).limit).toBeNull();
    expect(toGroupPayload({ name: 'Hogar', color: '#112233', limit: '   ' }).limit).toBeNull();
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
