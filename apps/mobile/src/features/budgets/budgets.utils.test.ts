import type { BudgetEntry, BudgetGroup, BudgetMonthResponse } from './budgets.types';
import {
  canAddExpenseIn,
  expenseDateFor,
  formatAmountForInput,
  getEntryActual,
  getEnvelopeStatus,
  isEntryLinked,
  isRefundEntry,
  getGroupTotals,
  getLimitStatus,
  getLineType,
  getMonthTotals,
  getGroupReserved,
  getRemainderAvailable,
  moveId,
  setEntryOrder,
  setGroupOrder,
  parseAmountInput,
  payEntryParams,
  setEntryPaid,
  shouldAddToEnvelope,
  shouldRegisterPayment,
  toGroupPayload,
  toLinePayload,
  toPaymentInput,
} from './budgets.utils';

const fixed = (id: string, amount: string, paid: boolean): BudgetEntry => ({
  id,
  groupId: 'g1',
  envelope: false,
  transactions: [],
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
  isRemainder: false,
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

  describe('reembolso cubierto por un ingreso', () => {
    const income = (amount: string) => ({ id: 'in1', amount, occurredAt: '2026-11-02T10:00:00.000Z' });

    it('cuenta con el signo de la linea (negativo) aunque el ingreso sea positivo', () => {
      expect(getEntryActual({ ...fixed('r', '-20.00', true), transactions: [income('20.00')] })).toBe(-20);
    });

    it('usa lo que se cobro de verdad, no lo previsto', () => {
      expect(getEntryActual({ ...fixed('r', '-20.00', true), transactions: [income('18.50')] })).toBe(-18.5);
    });

    it('en un grupo resta lo cobrado del total pagado: el gasto de 40 y el reembolso de 20 dejan 20', () => {
      const bill = { ...fixed('internet', '40.00', true), transactions: [income('40.00')] };
      const refund = { ...fixed('mitad', '-20.00', true), transactions: [income('20.00')] };

      expect(getGroupTotals([bill, refund])).toEqual({ planned: 20, paid: 20 });
    });

    it('un gasto enlazado sigue contando en positivo', () => {
      expect(getEntryActual({ ...fixed('g', '40.00', true), transactions: [income('38.00')] })).toBe(38);
    });
  });
});

describe('isRefundEntry', () => {
  it('es un reembolso si el importe es negativo', () => {
    expect(isRefundEntry(fixed('r', '-20.00', false))).toBe(true);
    expect(isRefundEntry(fixed('g', '20.00', false))).toBe(false);
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

describe('grupo que recibe lo que sobra', () => {
  const remainder = (entries: BudgetEntry[]): BudgetGroup => ({ ...group('r', entries), isRemainder: true });

  it('el disponible es el sueldo menos lo previsto en los otros grupos', () => {
    const groups = [
      group('a', [fixed('a1', '600.00', false), fixed('a2', '150.50', true)]),
      group('b', [fixed('b1', '-50.00', false)]),
      remainder([fixed('r1', '80.00', true)]),
    ];

    expect(getRemainderAvailable(groups, 1500)).toBe(799.5);
  });

  describe('con grupos que tienen limite', () => {
    const limited = (id: string, limit: string, entries: BudgetEntry[]): BudgetGroup => ({ ...group(id, entries), limit });

    it('el limite de un grupo se descuenta aunque aun no tenga lineas', () => {
      expect(getRemainderAvailable([limited('a', '120.00', []), remainder([])], 300)).toBe(180);
    });

    it('descuenta el limite entero aunque las lineas sumen menos', () => {
      expect(getRemainderAvailable([limited('a', '120.00', [fixed('a1', '50.00', false)])], 300)).toBe(180);
    });

    it('si las lineas superan el limite se descuenta lo que suman, que es lo comprometido de verdad', () => {
      expect(getRemainderAvailable([limited('a', '100.00', [fixed('a1', '150.00', false)])], 300)).toBe(150);
    });

    it('un limite de 0 no reserva nada propio y cuenta lo que sumen sus lineas', () => {
      expect(getRemainderAvailable([limited('a', '0.00', [fixed('a1', '40.00', false)])], 300)).toBe(260);
    });

    it('combina grupos con limite y grupos sin limite', () => {
      const groups = [
        limited('a', '120.00', [fixed('a1', '30.00', true)]),
        group('b', [fixed('b1', '70.00', false)]),
        remainder([fixed('r1', '10.00', false)]),
      ];

      expect(getRemainderAvailable(groups, 300)).toBe(110);
    });

    it('el limite del propio grupo del sobrante no se descuenta (no tiene limite propio, su tope es el disponible)', () => {
      const groups = [{ ...remainder([]), limit: '999.00' }];

      expect(getRemainderAvailable(groups, 300)).toBe(300);
    });

    it('un reembolso dentro de un grupo con limite no hace que reserve menos que su limite', () => {
      const groups = [limited('a', '100.00', [fixed('a1', '120.00', false), fixed('a2', '-40.00', false)])];

      expect(getRemainderAvailable(groups, 300)).toBe(200);
    });
  });

  describe('getGroupReserved', () => {
    it('sin limite reserva lo que suman sus lineas', () => {
      expect(getGroupReserved(group('a', [fixed('a1', '30.00', false), fixed('a2', '12.50', true)]))).toBe(42.5);
    });

    it('con limite reserva el mayor entre el limite y lo previsto', () => {
      const base = group('a', [fixed('a1', '30.00', false)]);

      expect(getGroupReserved({ ...base, limit: '100.00' })).toBe(100);
      expect(getGroupReserved({ ...base, limit: '20.00' })).toBe(30);
    });
  });

  it('las lineas del propio grupo del sobrante no reducen su disponible', () => {
    expect(getRemainderAvailable([remainder([fixed('r1', '500.00', true)])], 1000)).toBe(1000);
  });

  it('si el reparto supera el sueldo el disponible sale negativo', () => {
    expect(getRemainderAvailable([group('a', [fixed('a1', '1200.00', false)])], 1000)).toBe(-200);
  });

  it('su tope es el disponible y lo gastado son sus lineas', () => {
    const status = getLimitStatus(remainder([fixed('r1', '30.00', true), fixed('r2', '20.00', false)]), 200);

    expect(status).toEqual({ limit: 200, used: 50, remaining: 150, ratio: 0.25, isOver: false });
  });

  it('siempre tiene estado, aunque no tenga limite propio, y avisa al pasarse', () => {
    const status = getLimitStatus(remainder([fixed('r1', '120.00', false)]), 100);

    expect(status?.isOver).toBe(true);
    expect(status?.remaining).toBe(-20);
    expect(status?.ratio).toBe(1);
  });

  it('sin disponible, cualquier gasto lo desborda', () => {
    const status = getLimitStatus(remainder([fixed('r1', '10.00', false)]), -50);

    expect(status?.isOver).toBe(true);
    expect(status?.ratio).toBe(1);
  });

  it('el disponible manda sobre un limite que pudiera quedar guardado', () => {
    const status = getLimitStatus({ ...remainder([]), limit: '999.00' }, 300);

    expect(status?.limit).toBe(300);
  });

  it('su payload no lleva limite aunque el campo tenga texto', () => {
    expect(toGroupPayload({ name: 'Caprichos', color: '#112233', limit: '50', isRemainder: true })).toEqual({
      name: 'Caprichos',
      color: '#112233',
      limit: null,
      isRemainder: true,
    });
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
    expect(getLineType(fixed('a', '10.00', false))).toBe('EXPENSE');
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
    expect(toLinePayload({ name: '  Netflix ', lineType: 'EXPENSE', amount: '21,99' })).toEqual({
      name: 'Netflix',
      amount: 21.99,
      envelope: false,
    });
  });

  it('un reembolso lleva el importe negativo', () => {
    expect(toLinePayload({ name: 'Luz Ivan', lineType: 'REFUND', amount: '50' })).toEqual({
      name: 'Luz Ivan',
      amount: -50,
      envelope: false,
    });
  });

  it('entiende el punto de miles', () => {
    expect(toLinePayload({ name: 'Hipoteca', lineType: 'EXPENSE', amount: '1.500' }).amount).toBe(1500);
  });
});

describe('toGroupPayload', () => {
  it('un limite escrito se convierte en numero', () => {
    expect(toGroupPayload({ name: '  Gastos fijos ', color: '#112233', limit: '600,50', isRemainder: false })).toEqual({
      name: 'Gastos fijos',
      color: '#112233',
      limit: 600.5,
      isRemainder: false,
    });
  });

  it('un limite vacio o en blanco significa sin limite', () => {
    expect(toGroupPayload({ name: 'Hogar', color: '#112233', limit: '', isRemainder: false }).limit).toBeNull();
    expect(toGroupPayload({ name: 'Hogar', color: '#112233', limit: '   ', isRemainder: false }).limit).toBeNull();
  });
});

describe('moveId', () => {
  it('sube y baja una posicion', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
  });

  it('en los extremos o con un id desconocido deja la lista igual', () => {
    const ids = ['a', 'b', 'c'];

    expect(moveId(ids, 'a', -1)).toBe(ids);
    expect(moveId(ids, 'c', 1)).toBe(ids);
    expect(moveId(ids, 'z', 1)).toBe(ids);
  });

  it('no muta la lista original', () => {
    const ids = ['a', 'b'];
    moveId(ids, 'a', 1);

    expect(ids).toEqual(['a', 'b']);
  });
});

describe('setGroupOrder / setEntryOrder', () => {
  const month: BudgetMonthResponse = {
    month: { year: 2026, month: 9, income: '1000' },
    groups: [
      group('g1', [fixed('a', '10.00', false), fixed('b', '20.00', false)]),
      group('g2', [fixed('c', '30.00', false)]),
    ],
  };

  it('reordena los grupos', () => {
    expect(setGroupOrder(month, ['g2', 'g1']).groups.map((g) => g.id)).toEqual(['g2', 'g1']);
  });

  it('reordena solo las lineas del grupo indicado', () => {
    const updated = setEntryOrder(month, 'g1', ['b', 'a']);

    expect(updated.groups[0].entries.map((e) => e.id)).toEqual(['b', 'a']);
    expect(updated.groups[1]).toBe(month.groups[1]);
    expect(month.groups[0].entries.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('ignora ids que ya no existen', () => {
    expect(setGroupOrder(month, ['zz', 'g2', 'g1']).groups.map((g) => g.id)).toEqual(['g2', 'g1']);
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

describe('lineas enlazadas a un gasto de Movimientos', () => {
  const linked = (amount: string, real: string): BudgetEntry => ({
    ...fixed('l', amount, true),
    transactions: [{ id: 'tx', amount: real, occurredAt: '2026-10-12T10:00:00.000Z' }],
  });

  it('lo real de una linea enlazada es el importe del gasto, no el previsto', () => {
    expect(getEntryActual(linked('60.00', '62.30'))).toBe(62.3);
  });

  it('una linea sin enlazar sigue contando su importe previsto solo si esta marcada', () => {
    expect(getEntryActual(fixed('a', '10.00', true))).toBe(10);
    expect(getEntryActual(fixed('a', '10.00', false))).toBe(0);
  });

  it('isEntryLinked distingue las enlazadas', () => {
    expect(isEntryLinked(linked('60.00', '62.30'))).toBe(true);
    expect(isEntryLinked(fixed('a', '10.00', true))).toBe(false);
    expect(isEntryLinked({ ...fixed('a', '10.00', false), transactions: [] })).toBe(false);
  });

  it('los totales del grupo usan lo real en las enlazadas y lo previsto en el resto', () => {
    const totals = getGroupTotals([linked('60.00', '62.30'), fixed('b', '20.00', true), fixed('c', '5.00', false)]);

    expect(totals).toEqual({ planned: 85, paid: 82.3 });
  });
});

describe('canAddExpenseIn', () => {
  const now = { year: 2026, month: 11 };

  it('se puede apuntar un gasto en el mes actual y en meses pasados', () => {
    expect(canAddExpenseIn({ year: 2026, month: 11 }, now)).toBe(true);
    expect(canAddExpenseIn({ year: 2026, month: 10 }, now)).toBe(true);
    expect(canAddExpenseIn({ year: 2025, month: 12 }, now)).toBe(true);
  });

  it('en un mes futuro no: ahi se planifica con lineas', () => {
    expect(canAddExpenseIn({ year: 2026, month: 12 }, now)).toBe(false);
    expect(canAddExpenseIn({ year: 2027, month: 1 }, now)).toBe(false);
  });
});

describe('expenseDateFor', () => {
  const now = { year: 2026, month: 11 };

  it('en el mes actual no propone dia (el formulario usa hoy)', () => {
    expect(expenseDateFor({ year: 2026, month: 11 }, now)).toBeUndefined();
  });

  it('en un mes pasado propone su ultimo dia', () => {
    expect(expenseDateFor({ year: 2026, month: 10 }, now)).toBe('2026-10-31');
    expect(expenseDateFor({ year: 2026, month: 9 }, now)).toBe('2026-09-30');
    expect(expenseDateFor({ year: 2026, month: 2 }, now)).toBe('2026-02-28');
  });

  it('respeta los bisiestos y el cambio de año', () => {
    expect(expenseDateFor({ year: 2024, month: 2 }, now)).toBe('2024-02-29');
    expect(expenseDateFor({ year: 2025, month: 12 }, now)).toBe('2025-12-31');
  });
});

describe('shouldRegisterPayment', () => {
  const now = { year: 2026, month: 11 };
  const unpaid = fixed('seguro', '120.00', false);

  it('una linea sin pagar del mes actual abre la hoja de pago', () => {
    expect(shouldRegisterPayment(unpaid, { year: 2026, month: 11 }, now)).toBe(true);
  });

  it('tambien en un mes pasado', () => {
    expect(shouldRegisterPayment(unpaid, { year: 2026, month: 9 }, now)).toBe(true);
  });

  it('en un mes futuro se sigue marcando a mano: aun no se ha pagado nada', () => {
    expect(shouldRegisterPayment(unpaid, { year: 2026, month: 12 }, now)).toBe(false);
  });

  it('una linea ya pagada no: tocarla solo la desmarca', () => {
    expect(shouldRegisterPayment(fixed('seguro', '120.00', true), { year: 2026, month: 11 }, now)).toBe(false);
  });

  it('un reembolso (importe negativo) tambien registra el cobro: crea el ingreso', () => {
    expect(shouldRegisterPayment(fixed('devolucion', '-30.00', false), { year: 2026, month: 11 }, now)).toBe(true);
    expect(shouldRegisterPayment(fixed('devolucion', '-30.00', false), { year: 2026, month: 10 }, now)).toBe(true);
  });

  it('un reembolso de un mes futuro, ya cobrado o ya enlazado a un ingreso, no', () => {
    expect(shouldRegisterPayment(fixed('devolucion', '-30.00', false), { year: 2026, month: 12 }, now)).toBe(false);
    expect(shouldRegisterPayment(fixed('devolucion', '-30.00', true), { year: 2026, month: 11 }, now)).toBe(false);
    const linked = {
      ...fixed('devolucion', '-30.00', true),
      transactions: [{ id: 'in1', amount: '30.00', occurredAt: '2026-11-02T10:00:00.000Z' }],
    };
    expect(shouldRegisterPayment(linked, { year: 2026, month: 11 }, now)).toBe(false);
  });

  it('una linea ya enlazada a un gasto no', () => {
    const linked = { ...unpaid, paid: false, transactions: [{ id: 't1', amount: '120.00', occurredAt: '2026-11-02T10:00:00.000Z' }] };
    expect(shouldRegisterPayment(linked, { year: 2026, month: 11 }, now)).toBe(false);
  });
});

describe('payEntryParams', () => {
  const now = { year: 2026, month: 11 };
  const entry = { ...fixed('e1', '21.99', false), name: 'Netflix' };

  it('lleva la linea, su nombre y su importe previsto', () => {
    expect(payEntryParams(entry, { year: 2026, month: 11 }, now)).toEqual({
      entryId: 'e1',
      name: 'Netflix',
      amount: '21.99',
    });
  });

  it('anade la categoria sugerida cuando la hay', () => {
    expect(payEntryParams({ ...entry, suggestedCategoryId: 'cat-ocio' }, { year: 2026, month: 11 }, now)).toMatchObject({
      categoryId: 'cat-ocio',
    });
  });

  it('sin sugerencia (null) no manda categoria', () => {
    expect(payEntryParams({ ...entry, suggestedCategoryId: null }, { year: 2026, month: 11 }, now)).not.toHaveProperty(
      'categoryId',
    );
  });

  it('en un mes pasado manda el ultimo dia de ese mes; en el actual no manda fecha', () => {
    expect(payEntryParams(entry, { year: 2026, month: 10 }, now)).toMatchObject({ date: '2026-10-31' });
    expect(payEntryParams(entry, { year: 2026, month: 11 }, now)).not.toHaveProperty('date');
  });

  it('un gasto no manda la marca de reembolso', () => {
    expect(payEntryParams(entry, { year: 2026, month: 11 }, now)).not.toHaveProperty('refund');
  });

  it('un reembolso manda la marca y el importe sin signo (lo que te devuelven)', () => {
    const refund = { ...fixed('r1', '-20.00', false), name: 'Internet (mitad)' };

    expect(payEntryParams(refund, { year: 2026, month: 11 }, now)).toEqual({
      entryId: 'r1',
      name: 'Internet (mitad)',
      amount: '20.00',
      refund: '1',
    });
  });

  it('un reembolso de un mes pasado tambien lleva el ultimo dia y la categoria sugerida', () => {
    const refund = { ...fixed('r1', '-20.00', false), suggestedCategoryId: 'cat-bizum' };

    expect(payEntryParams(refund, { year: 2026, month: 10 }, now)).toMatchObject({
      categoryId: 'cat-bizum',
      date: '2026-10-31',
      refund: '1',
    });
  });
});

describe('toPaymentInput', () => {
  const values = { categoryId: 'cat-ocio', amount: '21,99' };

  it('crea un gasto enlazado a la linea, con su nombre como descripcion', () => {
    const input = toPaymentInput({ entryId: 'e1', name: 'Netflix' }, values);

    expect(input).toMatchObject({
      type: 'EXPENSE',
      categoryId: 'cat-ocio',
      amount: 21.99,
      description: 'Netflix',
      budgetEntryId: 'e1',
    });
    expect(input).not.toHaveProperty('budgetGroupId');
  });

  it('en un reembolso crea un ingreso enlazado a la linea', () => {
    const input = toPaymentInput({ entryId: 'r1', name: 'Internet (mitad)', refund: '1' }, { categoryId: 'cat-bizum', amount: '20' });

    expect(input).toMatchObject({
      type: 'INCOME',
      categoryId: 'cat-bizum',
      amount: 20,
      description: 'Internet (mitad)',
      budgetEntryId: 'r1',
    });
  });

  it('sin fecha usa ahora', () => {
    const before = Date.now();
    const { occurredAt } = toPaymentInput({ entryId: 'e1', name: 'Netflix' }, values);

    expect(new Date(occurredAt).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('con fecha usa ese dia (a mediodia, como el resto de la app)', () => {
    const { occurredAt } = toPaymentInput({ entryId: 'e1', name: 'Netflix', date: '2026-10-31' }, values);
    const date = new Date(occurredAt);

    expect([date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours()]).toEqual([2026, 10, 31, 12]);
  });

  it('entiende los importes con separador de miles', () => {
    expect(toPaymentInput({ entryId: 'e1', name: 'Hipoteca' }, { ...values, amount: '1.250,50' }).amount).toBe(1250.5);
  });
});

describe('sobres (lineas variables)', () => {
  const expense = (id: string, amount: string) => ({ id, amount, occurredAt: '2026-11-02T10:00:00.000Z' });
  const envelope = (amount: string, spent: string[] = [], overrides: Partial<BudgetEntry> = {}): BudgetEntry => ({
    ...fixed('super', amount, false),
    name: 'Supermercado',
    envelope: true,
    transactions: spent.map((value, index) => expense(`t${index}`, value)),
    ...overrides,
  });

  describe('getEntryActual', () => {
    it('lo real de un sobre es la suma de sus gastos', () => {
      expect(getEntryActual(envelope('300.00', ['45.00', '32.50', '60.00']))).toBe(137.5);
    });

    it('evita errores de coma flotante al sumar', () => {
      expect(getEntryActual(envelope('300.00', ['0.10', '0.20']))).toBe(0.3);
    });

    it('un sobre sin gastos no ha gastado nada', () => {
      expect(getEntryActual(envelope('300.00'))).toBe(0);
    });

    it('un sobre nunca cuenta su importe previsto por estar marcado como pagado', () => {
      expect(getEntryActual(envelope('300.00', [], { paid: true }))).toBe(0);
    });

    it('una linea normal con su gasto sigue contando el importe real de ese gasto', () => {
      const linked = { ...fixed('luz', '60.00', true), transactions: [expense('t1', '62.30')] };
      expect(getEntryActual(linked)).toBe(62.3);
    });
  });

  describe('getEnvelopeStatus', () => {
    it('cuanto lleva gastado, cuanto queda y la proporcion para la barra', () => {
      expect(getEnvelopeStatus(envelope('300.00', ['45.00', '32.50', '60.00']))).toEqual({
        planned: 300,
        spent: 137.5,
        remaining: 162.5,
        ratio: 137.5 / 300,
        isOver: false,
      });
    });

    it('sin gastos: todo por gastar y barra vacia', () => {
      expect(getEnvelopeStatus(envelope('300.00'))).toMatchObject({ spent: 0, remaining: 300, ratio: 0, isOver: false });
    });

    it('gastar justo lo previsto no es pasarse', () => {
      expect(getEnvelopeStatus(envelope('100.00', ['60.00', '40.00']))).toMatchObject({
        remaining: 0,
        ratio: 1,
        isOver: false,
      });
    });

    it('pasarse deja un restante negativo, la barra llena (tope en 1) y isOver', () => {
      expect(getEnvelopeStatus(envelope('120.00', ['40.00', '35.00', '42.00', '10.00']))).toEqual({
        planned: 120,
        spent: 127,
        remaining: -7,
        ratio: 1,
        isOver: true,
      });
    });
  });

  it('los totales del grupo suman lo gastado en el sobre como pagado y su importe como previsto', () => {
    const totals = getGroupTotals([envelope('300.00', ['45.00', '32.50']), fixed('b', '20.00', true)]);

    expect(totals).toEqual({ planned: 320, paid: 97.5 });
  });

  it('un sobre cuenta como enlazado en cuanto tiene un gasto', () => {
    expect(isEntryLinked(envelope('300.00'))).toBe(false);
    expect(isEntryLinked(envelope('300.00', ['10.00']))).toBe(true);
  });

  describe('getLineType y toLinePayload', () => {
    it('una linea con envelope es de tipo ENVELOPE; un importe negativo sigue siendo un reembolso', () => {
      expect(getLineType(envelope('300.00'))).toBe('ENVELOPE');
      expect(getLineType(fixed('a', '10.00', false))).toBe('EXPENSE');
      expect(getLineType({ ...fixed('a', '-10.00', false), envelope: false })).toBe('REFUND');
    });

    it('el tipo Variable se envia como sobre con importe positivo', () => {
      expect(toLinePayload({ name: ' Supermercado ', lineType: 'ENVELOPE', amount: '300' })).toEqual({
        name: 'Supermercado',
        amount: 300,
        envelope: true,
      });
    });

    it('Gasto y Reembolso no son sobres', () => {
      expect(toLinePayload({ name: 'Luz', lineType: 'EXPENSE', amount: '60' }).envelope).toBe(false);
      expect(toLinePayload({ name: 'Luz Ivan', lineType: 'REFUND', amount: '30' }).envelope).toBe(false);
    });
  });

  describe('apuntar un gasto en el sobre', () => {
    const now = { year: 2026, month: 11 };

    it('en el mes actual y en uno pasado se apunta un gasto, aunque ya tenga otros', () => {
      expect(shouldAddToEnvelope(envelope('300.00'), { year: 2026, month: 11 }, now)).toBe(true);
      expect(shouldAddToEnvelope(envelope('300.00', ['45.00']), { year: 2026, month: 11 }, now)).toBe(true);
      expect(shouldAddToEnvelope(envelope('300.00'), { year: 2026, month: 9 }, now)).toBe(true);
    });

    it('en un mes futuro no: aun no se ha gastado nada', () => {
      expect(shouldAddToEnvelope(envelope('300.00'), { year: 2026, month: 12 }, now)).toBe(false);
    });

    it('una linea normal no es un sobre', () => {
      expect(shouldAddToEnvelope(fixed('luz', '60.00', false), { year: 2026, month: 11 }, now)).toBe(false);
    });

    it('un sobre nunca "registra un pago" como una linea normal', () => {
      expect(shouldRegisterPayment(envelope('300.00'), { year: 2026, month: 11 }, now)).toBe(false);
    });

    it('los parametros de la hoja marcan el sobre y llevan lo gastado hasta ahora', () => {
      expect(payEntryParams(envelope('300.00', ['45.00', '32.50']), { year: 2026, month: 11 }, now)).toEqual({
        entryId: 'super',
        name: 'Supermercado',
        amount: '300.00',
        envelope: '1',
        spent: '77.5',
      });
    });

    it('una linea normal no manda parametros de sobre', () => {
      const params = payEntryParams(fixed('luz', '60.00', false), { year: 2026, month: 11 }, now);

      expect(params).not.toHaveProperty('envelope');
      expect(params).not.toHaveProperty('spent');
    });
  });
});
