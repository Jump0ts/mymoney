import { budgetGroupSchema, budgetLineSchema } from './budgets.schema';

const validLine = { name: 'Netflix', lineType: 'FIXED', amount: '21,99', scope: 'month' } as const;

const errorsOf = async (schema: typeof budgetLineSchema | typeof budgetGroupSchema, values: object) => {
  try {
    await schema.validate(values, { abortEarly: false });
    return [];
  } catch (error) {
    return (error as { errors: string[] }).errors;
  }
};

describe('budgetGroupSchema', () => {
  it('acepta un nombre y un color', async () => {
    expect(await errorsOf(budgetGroupSchema, { name: 'Hogar', color: '#4F5DFF' })).toEqual([]);
  });

  it('rechaza un nombre vacio o demasiado largo', async () => {
    expect(await errorsOf(budgetGroupSchema, { name: '  ', color: '#4F5DFF' })).toContain('El nombre es obligatorio');
    expect(await errorsOf(budgetGroupSchema, { name: 'x'.repeat(41), color: '#4F5DFF' })).toContain(
      'Máximo 40 caracteres',
    );
  });
});

describe('budgetLineSchema', () => {
  it('acepta una linea fija con importe con coma', async () => {
    expect(await errorsOf(budgetLineSchema, validLine)).toEqual([]);
  });

  it.each([[''], ['abc'], ['0'], ['-5'], ['1000001'], ['0,001'], ['12,345']])('rechaza el importe "%s"', async (amount) => {
    const errors = await errorsOf(budgetLineSchema, { ...validLine, amount });
    expect(errors.some((message) => message.includes('importe'))).toBe(true);
  });

  it('un limite exige categoria, una linea fija no', async () => {
    expect(await errorsOf(budgetLineSchema, { ...validLine, lineType: 'LIMIT' })).toContain('Elige una categoría');
    expect(await errorsOf(budgetLineSchema, { ...validLine, lineType: 'LIMIT', categoryId: 'cat-1' })).toEqual([]);
    expect(await errorsOf(budgetLineSchema, { ...validLine, lineType: 'REFUND' })).toEqual([]);
  });

  it('rechaza un nombre vacio y un alcance desconocido', async () => {
    expect(await errorsOf(budgetLineSchema, { ...validLine, name: '' })).toContain('El nombre es obligatorio');
    expect((await errorsOf(budgetLineSchema, { ...validLine, scope: 'siempre' })).length).toBeGreaterThan(0);
  });
});
