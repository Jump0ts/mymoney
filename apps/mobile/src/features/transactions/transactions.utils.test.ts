import type { AddTransactionFormValues } from './transactions.schema';
import { toCreateInput, toNewExpenseDefaults, toUpdateInput } from './transactions.utils';

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

  it('un ingreso manda su linea de reembolso: es lo que lo enlaza con el presupuesto', () => {
    expect(toCreateInput({ ...expense, type: 'INCOME', budgetEntryId: 'refund-1' })).toMatchObject({
      type: 'INCOME',
      budgetEntryId: 'refund-1',
    });
  });

  it('un ingreso sin linea omite el campo', () => {
    expect(toCreateInput({ ...expense, type: 'INCOME', budgetEntryId: null })).not.toHaveProperty('budgetEntryId');
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

  it('un ingreso enlazado a un reembolso conserva su linea al guardar (null la quitaria)', () => {
    expect(toUpdateInput({ ...expense, type: 'INCOME', budgetEntryId: 'refund-1' }).budgetEntryId).toBe('refund-1');
  });

  it('un ingreso sin linea manda null explicito', () => {
    expect(toUpdateInput({ ...expense, type: 'INCOME', budgetEntryId: null }).budgetEntryId).toBeNull();
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
