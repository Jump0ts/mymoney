import type { AddTransactionFormValues } from './transactions.schema';
import { toCreateInput, toExpenseSlices, toNewExpenseDefaults, toUpdateInput } from './transactions.utils';
import type { CategoryBreakdown } from './transactions.types';

const expense: AddTransactionFormValues = {
  type: 'EXPENSE',
  categoryId: 'cat-1',
  amount: 62.3,
  description: 'Luz de octubre',
  occurredAt: new Date('2026-10-12T10:00:00.000Z'),
  budgetEntryId: 'entry-1',
};

describe('toCreateInput', () => {
  it('convierte el formulario en el cuerpo de la peticion, con la fecha en ISO', () => {
    expect(toCreateInput(expense)).toEqual({
      categoryId: 'cat-1',
      type: 'EXPENSE',
      amount: 62.3,
      description: 'Luz de octubre',
      occurredAt: '2026-10-12T10:00:00.000Z',
      budgetEntryId: 'entry-1',
    });
  });

  it('sin linea del presupuesto omite el campo (no manda null al crear)', () => {
    expect(toCreateInput({ ...expense, budgetEntryId: null })).not.toHaveProperty('budgetEntryId');
    expect(toCreateInput({ ...expense, budgetEntryId: undefined })).not.toHaveProperty('budgetEntryId');
  });

  it('un ingreso nunca manda linea del presupuesto', () => {
    expect(toCreateInput({ ...expense, type: 'INCOME' })).not.toHaveProperty('budgetEntryId');
  });

  it('un reembolso es un gasto de importe negativo: el formulario lo pide en positivo y se envia en negativo', () => {
    const input = toCreateInput({ ...expense, refund: true, budgetEntryId: 'refund-1' });

    expect(input).toMatchObject({ type: 'EXPENSE', amount: -62.3, budgetEntryId: 'refund-1' });
  });

  it('un gasto (refund false o sin marca) conserva su importe positivo', () => {
    expect(toCreateInput({ ...expense, refund: false }).amount).toBe(62.3);
    expect(toCreateInput(expense).amount).toBe(62.3);
  });

  it('un ingreso ignora la marca de reembolso: nunca es negativo', () => {
    expect(toCreateInput({ ...expense, type: 'INCOME', refund: true }).amount).toBe(62.3);
  });

  it('una descripcion vacia se omite', () => {
    expect(toCreateInput({ ...expense, description: '' }).description).toBeUndefined();
  });
});

describe('toUpdateInput', () => {
  it('manda la linea elegida', () => {
    expect(toUpdateInput(expense).budgetEntryId).toBe('entry-1');
  });

  it('manda null explicito para quitar el enlace (omitirlo lo conservaria)', () => {
    expect(toUpdateInput({ ...expense, budgetEntryId: null })).toHaveProperty('budgetEntryId', null);
    expect(toUpdateInput({ ...expense, budgetEntryId: undefined })).toHaveProperty('budgetEntryId', null);
  });

  it('si el gasto pasa a ingreso manda null aunque hubiera una linea', () => {
    expect(toUpdateInput({ ...expense, type: 'INCOME' }).budgetEntryId).toBeNull();
  });

  it('un reembolso enlazado conserva su linea al guardar y se envia en negativo', () => {
    const input = toUpdateInput({ ...expense, refund: true, budgetEntryId: 'refund-1' });

    expect(input.budgetEntryId).toBe('refund-1');
    expect(input.amount).toBe(-62.3);
  });
});

describe('gasto que sale de un grupo del presupuesto', () => {
  const fromGroup: AddTransactionFormValues = { ...expense, budgetEntryId: null, budgetGroupId: 'g-deseos' };

  it('al crear manda el grupo y ninguna linea', () => {
    const input = toCreateInput(fromGroup);

    expect(input.budgetGroupId).toBe('g-deseos');
    expect(input).not.toHaveProperty('budgetEntryId');
  });

  it('el grupo manda sobre una linea que se hubiera quedado en el formulario', () => {
    const input = toCreateInput({ ...fromGroup, budgetEntryId: 'entry-1' });

    expect(input.budgetGroupId).toBe('g-deseos');
    expect(input).not.toHaveProperty('budgetEntryId');
  });

  it('al editar manda el grupo y no el campo de la linea (los dos juntos son un error)', () => {
    const input = toUpdateInput(fromGroup);

    expect(input.budgetGroupId).toBe('g-deseos');
    expect(input).not.toHaveProperty('budgetEntryId');
  });

  it('sin grupo no manda el campo', () => {
    expect(toCreateInput({ ...expense, budgetGroupId: null })).not.toHaveProperty('budgetGroupId');
    expect(toUpdateInput({ ...expense, budgetGroupId: undefined })).not.toHaveProperty('budgetGroupId');
  });

  it('un ingreso nunca manda grupo', () => {
    expect(toCreateInput({ ...fromGroup, type: 'INCOME' })).not.toHaveProperty('budgetGroupId');
    expect(toUpdateInput({ ...fromGroup, type: 'INCOME' })).toHaveProperty('budgetEntryId', null);
    expect(toUpdateInput({ ...fromGroup, type: 'INCOME' })).not.toHaveProperty('budgetGroupId');
  });
});

describe('toNewExpenseDefaults', () => {
  it('sin grupo no hay valores propios: el formulario usa los suyos', () => {
    expect(toNewExpenseDefaults(undefined, '2026-09-30')).toBeUndefined();
  });

  it('con grupo prepara un gasto vacio de hoy con el grupo elegido', () => {
    const values = toNewExpenseDefaults('g-deseos')!;

    expect(values).toMatchObject({
      type: 'EXPENSE',
      categoryId: '',
      description: '',
      budgetEntryId: null,
      budgetGroupId: 'g-deseos',
    });
    expect(values.amount).toBeUndefined();
    expect(Math.abs(values.occurredAt.getTime() - Date.now())).toBeLessThan(5000);
  });

  it('con un dia de otro mes usa ese dia a mediodia', () => {
    const values = toNewExpenseDefaults('g-deseos', '2026-09-30')!;

    expect(values.occurredAt).toEqual(new Date(2026, 8, 30, 12, 0, 0));
  });

  it('una fecha invalida se ignora y se usa hoy', () => {
    const values = toNewExpenseDefaults('g-deseos', 'ayer')!;

    expect(Math.abs(values.occurredAt.getTime() - Date.now())).toBeLessThan(5000);
  });
});

describe('reembolso que sale de un grupo del presupuesto', () => {
  it('crea su propia linea de reembolso: manda el grupo y el importe negativo', () => {
    const input = toCreateInput({ ...expense, refund: true, budgetEntryId: null, budgetGroupId: 'g-deseos' });

    expect(input).toMatchObject({ type: 'EXPENSE', amount: -62.3, budgetGroupId: 'g-deseos' });
    expect(input).not.toHaveProperty('budgetEntryId');
  });
});

describe('toExpenseSlices', () => {
  const row = (categoryId: string, type: 'EXPENSE' | 'INCOME', total: number): CategoryBreakdown => ({
    categoryId,
    categoryName: categoryId,
    color: '#112233',
    type,
    total,
  });

  it('solo dibuja gastos y pasa el color por la funcion que le den', () => {
    const slices = toExpenseSlices([row('ocio', 'EXPENSE', 25), row('nomina', 'INCOME', 1800)], (c) => c.toLowerCase() + '!');

    expect(slices).toEqual([{ label: 'ocio', value: 25, color: '#112233!' }]);
  });

  it('el total de una categoria ya viene neto de reembolsos: la cena de 50 con 25 de vuelta pesa 25', () => {
    expect(toExpenseSlices([row('ocio', 'EXPENSE', 25)], (c) => c)[0].value).toBe(25);
  });

  it('una categoria con mas reembolsos que gastos (cero o negativa) no tiene porcion', () => {
    const slices = toExpenseSlices([row('ocio', 'EXPENSE', -20), row('casa', 'EXPENSE', 0), row('ropa', 'EXPENSE', 10)], (c) => c);

    expect(slices.map((s) => s.label)).toEqual(['ropa']);
  });
});
