import type { AddTransactionFormValues } from './transactions.schema';
import { toCreateInput, toUpdateInput } from './transactions.utils';

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
});
