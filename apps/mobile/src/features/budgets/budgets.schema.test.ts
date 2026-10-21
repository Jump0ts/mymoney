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

const validGroup = { name: 'Hogar', color: '#4F5DFF', limit: '', isRemainder: false };

describe('budgetGroupSchema', () => {
  it('acepta un nombre y un color, con el limite vacio (sin limite)', async () => {
    expect(await errorsOf(budgetGroupSchema, validGroup)).toEqual([]);
  });

  it.each([['600'], ['600,50'], ['1.500'], ['  250  ']])('acepta el limite "%s"', async (limit) => {
    expect(await errorsOf(budgetGroupSchema, { ...validGroup, limit })).toEqual([]);
  });

  it('el grupo del sobrante no valida el limite, que no se usa', async () => {
    expect(await errorsOf(budgetGroupSchema, { ...validGroup, isRemainder: true, limit: 'abc' })).toEqual([]);
  });

  it.each([['abc'], ['0'], ['-5'], ['1000001'], ['10,555']])('rechaza el limite "%s"', async (limit) => {
    expect(await errorsOf(budgetGroupSchema, { ...validGroup, limit })).toContain(
      'Introduce un límite válido mayor que 0',
    );
  });

  it('rechaza un nombre vacio o demasiado largo', async () => {
    expect(await errorsOf(budgetGroupSchema, { ...validGroup, name: '  ' })).toContain('El nombre es obligatorio');
    expect(await errorsOf(budgetGroupSchema, { ...validGroup, name: 'x'.repeat(41) })).toContain(
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

  it('acepta un reembolso y rechaza el antiguo tipo limite', async () => {
    expect(await errorsOf(budgetLineSchema, { ...validLine, lineType: 'REFUND' })).toEqual([]);
    expect((await errorsOf(budgetLineSchema, { ...validLine, lineType: 'LIMIT' })).length).toBeGreaterThan(0);
  });

  it('rechaza un nombre vacio y un alcance desconocido', async () => {
    expect(await errorsOf(budgetLineSchema, { ...validLine, name: '' })).toContain('El nombre es obligatorio');
    expect((await errorsOf(budgetLineSchema, { ...validLine, scope: 'siempre' })).length).toBeGreaterThan(0);
  });
});
