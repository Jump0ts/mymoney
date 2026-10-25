import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { TransactionForm } from './TransactionForm';
import type { AddTransactionFormValues } from './transactions.schema';

const mockCategories = [
  { id: 'cat-exp-1', name: 'Alimentación', icon: 'shopping-cart', color: '#E67E22', type: 'EXPENSE' },
  { id: 'cat-exp-2', name: 'Transporte', icon: 'car', color: '#3498DB', type: 'EXPENSE' },
  { id: 'cat-inc-1', name: 'Nómina', icon: 'briefcase', color: '#1FA971', type: 'INCOME' },
];

jest.mock('@/features/categories/useCategories', () => ({
  useCategories: () => ({ data: mockCategories }),
}));

const noop = () => {};

describe('TransactionForm', () => {
  it('solo muestra las categorías del tipo seleccionado', () => {
    render(
      <TransactionForm submitLabel="Guardar" isSubmitting={false} submitError={null} onSubmit={noop} />,
    );

    expect(screen.getByText('Alimentación')).toBeTruthy();
    expect(screen.getByText('Transporte')).toBeTruthy();
    expect(screen.queryByText('Nómina')).toBeNull();

    fireEvent.press(screen.getByTestId('transaction-type-INCOME'));

    expect(screen.getByText('Nómina')).toBeTruthy();
    expect(screen.queryByText('Alimentación')).toBeNull();
  });

  it('expone el tipo y la fecha con semantica accesible', () => {
    render(<TransactionForm submitLabel="Guardar" isSubmitting={false} submitError={null} onSubmit={noop} />);

    const gasto = screen.getByTestId('transaction-type-EXPENSE');
    expect(gasto.props.accessibilityRole).toBe('radio');
    expect(gasto.props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('transaction-type-INCOME').props.accessibilityState).toMatchObject({
      selected: false,
    });

    const dateToggle = screen.getByTestId('transaction-date-toggle');
    expect(dateToggle.props.accessibilityRole).toBe('button');
    expect(dateToggle.props.accessibilityLabel).toMatch(/^Fecha: /);
  });

  it('muestra errores de validacion si se envia sin importe ni categoria', async () => {
    render(
      <TransactionForm submitLabel="Guardar" isSubmitting={false} submitError={null} onSubmit={noop} />,
    );

    fireEvent.press(screen.getByTestId('transaction-submit'));

    await waitFor(() => {
      expect(screen.getByText('El importe es obligatorio')).toBeTruthy();
      expect(screen.getByText('Elige una categoría')).toBeTruthy();
    });
  });

  it('envia los valores correctos al completar el formulario', async () => {
    const onSubmit = jest.fn();
    render(
      <TransactionForm submitLabel="Guardar" isSubmitting={false} submitError={null} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(screen.getByTestId('transaction-amount-input'), '42,50');
    fireEvent.press(screen.getByTestId('category-chip-cat-exp-1'));
    fireEvent.changeText(screen.getByPlaceholderText('Descripción (opcional)'), 'Supermercado');
    fireEvent.press(screen.getByTestId('transaction-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const submitted = onSubmit.mock.calls[0][0] as AddTransactionFormValues;
    expect(submitted.amount).toBe(42.5);
    expect(submitted.categoryId).toBe('cat-exp-1');
    expect(submitted.type).toBe('EXPENSE');
    expect(submitted.description).toBe('Supermercado');
    expect(submitted.occurredAt).toBeInstanceOf(Date);
  });

  it('precarga los valores por defecto en modo edicion', () => {
    const defaultValues: AddTransactionFormValues = {
      type: 'INCOME',
      categoryId: 'cat-inc-1',
      amount: 1800,
      description: 'Nómina de mayo',
      occurredAt: new Date('2026-05-05'),
    };

    render(
      <TransactionForm
        defaultValues={defaultValues}
        submitLabel="Guardar cambios"
        isSubmitting={false}
        submitError={null}
        onSubmit={noop}
      />,
    );

    expect(screen.getByDisplayValue('1800')).toBeTruthy();
    expect(screen.getByDisplayValue('Nómina de mayo')).toBeTruthy();
    expect(screen.getByText('Guardar cambios')).toBeTruthy();
  });

  it('muestra el error de envio recibido por props', () => {
    render(
      <TransactionForm
        submitLabel="Guardar"
        isSubmitting={false}
        submitError="No se pudo guardar el movimiento"
        onSubmit={noop}
      />,
    );

    expect(screen.getByText('No se pudo guardar el movimiento')).toBeTruthy();
  });

  describe('selector de fecha', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('permite elegir una fecha distinta desde el calendario', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
      const onSubmit = jest.fn();
      render(
        <TransactionForm submitLabel="Guardar" isSubmitting={false} submitError={null} onSubmit={onSubmit} />,
      );

      fireEvent.changeText(screen.getByTestId('transaction-amount-input'), '10');
      fireEvent.press(screen.getByTestId('category-chip-cat-exp-1'));

      fireEvent.press(screen.getByTestId('transaction-date-toggle'));
      fireEvent.press(screen.getByTestId('calendar-day-2026-06-03'));
      fireEvent.press(screen.getByTestId('transaction-submit'));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

      const submitted = onSubmit.mock.calls[0][0] as AddTransactionFormValues;
      expect(submitted.occurredAt.getFullYear()).toBe(2026);
      expect(submitted.occurredAt.getMonth()).toBe(5);
      expect(submitted.occurredAt.getDate()).toBe(3);
    });

    it('ignora el intento de elegir un dia posterior a hoy', () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
      render(<TransactionForm submitLabel="Guardar" isSubmitting={false} submitError={null} onSubmit={noop} />);

      fireEvent.press(screen.getByTestId('transaction-date-toggle'));
      fireEvent.press(screen.getByTestId('calendar-day-2026-06-20'));

      // Si la fecha se hubiese aceptado, el panel del calendario se habria cerrado.
      expect(screen.getByTestId('calendar-day-2026-06-20')).toBeTruthy();
    });
  });
});
