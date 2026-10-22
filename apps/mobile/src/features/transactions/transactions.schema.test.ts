import { addTransactionSchema } from './transactions.schema';

const validValues = {
  categoryId: 'cat-1',
  type: 'EXPENSE' as const,
  amount: 42.5,
  description: 'Supermercado',
  occurredAt: new Date('2026-05-10'),
};

describe('addTransactionSchema', () => {
  it('acepta un movimiento valido', async () => {
    await expect(addTransactionSchema.validate(validValues)).resolves.toBeTruthy();
  });

  it('acepta un movimiento sin descripcion (opcional)', async () => {
    const { description, ...rest } = validValues;
    await expect(addTransactionSchema.validate(rest)).resolves.toBeTruthy();
  });

  it('exige una categoria', async () => {
    await expect(addTransactionSchema.validate({ ...validValues, categoryId: '' })).rejects.toThrow(
      'Elige una categoría',
    );
  });

  it('exige un importe', async () => {
    await expect(
      addTransactionSchema.validate({ ...validValues, amount: undefined }),
    ).rejects.toThrow('El importe es obligatorio');
  });

  it('rechaza un importe negativo o cero', async () => {
    await expect(addTransactionSchema.validate({ ...validValues, amount: 0 })).rejects.toThrow(
      'El importe debe ser mayor que 0',
    );
    await expect(addTransactionSchema.validate({ ...validValues, amount: -5 })).rejects.toThrow(
      'El importe debe ser mayor que 0',
    );
  });

  it('rechaza un tipo que no sea INCOME o EXPENSE', async () => {
    await expect(addTransactionSchema.validate({ ...validValues, type: 'OTRO' })).rejects.toThrow();
  });

  it('rechaza una descripcion de mas de 200 caracteres', async () => {
    await expect(
      addTransactionSchema.validate({ ...validValues, description: 'a'.repeat(201) }),
    ).rejects.toThrow();
  });
});
