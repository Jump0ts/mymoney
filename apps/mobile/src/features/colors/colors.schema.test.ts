import { customColorSchema } from './colors.schema';

const errorsOf = async (hex: unknown) => {
  try {
    await customColorSchema.validate({ hex }, { abortEarly: false });
    return [];
  } catch (error) {
    return (error as { errors: string[] }).errors;
  }
};

describe('customColorSchema', () => {
  it.each(['#1A2B3C', '#1a2b3c', '1A2B3C', '#abc', 'abc', '  #1A2B3C '])('acepta %j', async (hex) => {
    expect(await errorsOf(hex)).toEqual([]);
  });

  it('pide un color si esta vacio', async () => {
    expect(await errorsOf('')).toEqual(['Escribe un color']);
  });

  it.each(['#12', '#1234', '#12345', '#1234567', '#GGGGGG', 'rojo', '##123456'])('rechaza %j con un mensaje claro', async (hex) => {
    expect(await errorsOf(hex)).toEqual(['Escribe un color como #1A2B3C']);
  });
});
