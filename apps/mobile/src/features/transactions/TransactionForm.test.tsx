import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { View as mockDateTimePickerView } from 'react-native';
import { TransactionForm } from './TransactionForm';
import type { AddTransactionFormValues } from './transactions.schema';

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: mockDateTimePickerView,
}));

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
});
