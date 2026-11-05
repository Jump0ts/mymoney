import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PayEntryForm } from './PayEntryForm';

const mockCategories = [
  { id: 'cat-ocio', name: 'Ocio', icon: 'film', color: '#E67E22', type: 'EXPENSE' },
  { id: 'cat-casa', name: 'Casa', icon: 'home', color: '#3498DB', type: 'EXPENSE' },
  { id: 'cat-nomina', name: 'Nómina', icon: 'briefcase', color: '#1FA971', type: 'INCOME' },
];

jest.mock('@/features/categories/useCategories', () => ({
  useCategories: () => ({ data: mockCategories }),
}));

const renderForm = (props: Partial<React.ComponentProps<typeof PayEntryForm>> = {}) => {
  const onSubmit = jest.fn();
  render(
    <PayEntryForm
      entryName="Netflix"
      plannedAmount="21.99"
      isSubmitting={false}
      submitError={null}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit };
};

const submit = () => fireEvent.press(screen.getByTestId('pay-entry-submit'));

describe('PayEntryForm', () => {
  it('muestra la linea, su importe previsto y propone ese importe', () => {
    renderForm();

    expect(screen.getByRole('header', { name: 'Netflix' })).toBeTruthy();
    expect(screen.getByText(/Previsto/)).toBeTruthy();
    expect(screen.getByTestId('pay-entry-amount').props.value).toBe('21,99');
  });

  it('un importe redondo se propone sin decimales de mas', () => {
    renderForm({ plannedAmount: '60.00' });

    expect(screen.getByTestId('pay-entry-amount').props.value).toBe('60');
  });

  it('solo ofrece categorias de gasto', () => {
    renderForm();

    expect(screen.getByTestId('pay-entry-category-cat-ocio')).toBeTruthy();
    expect(screen.getByTestId('pay-entry-category-cat-casa')).toBeTruthy();
    expect(screen.queryByTestId('pay-entry-category-cat-nomina')).toBeNull();
  });

  it('la primera vez no hay categoria elegida y no deja pagar sin elegir una', async () => {
    const { onSubmit } = renderForm();

    expect(screen.getByTestId('pay-entry-category-cat-ocio').props.accessibilityState.selected).toBe(false);
    submit();

    expect(await screen.findByText('Elige una categoría')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('elegir una categoria y confirmar manda categoria e importe', async () => {
    const { onSubmit } = renderForm();

    fireEvent.press(screen.getByTestId('pay-entry-category-cat-casa'));
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ categoryId: 'cat-casa', amount: '21,99' });
  });

  it('con una categoria sugerida llega ya elegida: basta confirmar', async () => {
    const { onSubmit } = renderForm({ defaultCategoryId: 'cat-ocio' });

    expect(screen.getByTestId('pay-entry-category-cat-ocio').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('pay-entry-category-cat-casa').props.accessibilityState.selected).toBe(false);
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ categoryId: 'cat-ocio', amount: '21,99' });
  });

  it('se puede cambiar la categoria sugerida', async () => {
    const { onSubmit } = renderForm({ defaultCategoryId: 'cat-ocio' });

    fireEvent.press(screen.getByTestId('pay-entry-category-cat-casa'));
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].categoryId).toBe('cat-casa');
  });

  it('se puede corregir el importe si el recibo real fue distinto', async () => {
    const { onSubmit } = renderForm({ defaultCategoryId: 'cat-ocio' });

    fireEvent.changeText(screen.getByTestId('pay-entry-amount'), '23,50');
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].amount).toBe('23,50');
  });

  it.each(['', '0', 'abc'])('un importe no valido ("%s") no se envia', async (amount) => {
    const { onSubmit } = renderForm({ defaultCategoryId: 'cat-ocio' });

    fireEvent.changeText(screen.getByTestId('pay-entry-amount'), amount);
    submit();

    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor', () => {
    renderForm({ submitError: 'La línea ya está pagada' });

    expect(screen.getByText('La línea ya está pagada')).toBeTruthy();
  });
});

describe('PayEntryForm (sobre)', () => {
  const envelopeProps = { entryName: 'Supermercado', plannedAmount: '300.00', spentAmount: '137.5' };

  it('apunta un gasto nuevo: importe vacio, lo gastado y lo previsto a la vista', () => {
    renderForm(envelopeProps);

    expect(screen.getByRole('header', { name: 'Supermercado' })).toBeTruthy();
    expect(screen.getByText('Gastado 137,50 € de 300,00 €')).toBeTruthy();
    expect(screen.queryByText(/Previsto/)).toBeNull();
    // No se propone el importe del sobre entero: cada compra es un gasto distinto.
    expect(screen.getByTestId('pay-entry-amount').props.value).toBe('');
    expect(screen.getByLabelText('Importe del gasto en euros')).toBeTruthy();
  });

  it('el boton dice "Añadir gasto" en vez de "Marcar como pagada"', () => {
    renderForm(envelopeProps);

    expect(screen.getByText('Añadir gasto')).toBeTruthy();
    expect(screen.queryByText('Marcar como pagada')).toBeNull();
  });

  it('sin importe no deja enviar', async () => {
    const { onSubmit } = renderForm({ ...envelopeProps, defaultCategoryId: 'cat-casa' });

    submit();

    expect(await screen.findByText('El importe es obligatorio')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envia el importe escrito y la categoria sugerida', async () => {
    const { onSubmit } = renderForm({ ...envelopeProps, defaultCategoryId: 'cat-casa' });

    fireEvent.changeText(screen.getByTestId('pay-entry-amount'), '32,50');
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ categoryId: 'cat-casa', amount: '32,50' });
  });

  it('una linea normal sigue proponiendo su importe y su boton de siempre', () => {
    renderForm();

    expect(screen.getByTestId('pay-entry-amount').props.value).toBe('21,99');
    expect(screen.getByText('Marcar como pagada')).toBeTruthy();
    expect(screen.queryByText(/Gastado/)).toBeNull();
  });
});
