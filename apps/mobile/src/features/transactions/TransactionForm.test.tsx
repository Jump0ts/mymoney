import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useBudgetMonth } from '@/features/budgets/useBudgets';
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

// Presupuesto del mes: una linea libre, una ya enlazada a otro gasto, un reembolso y la linea de este mismo gasto.
const mockBudgetGroups = [
  {
    id: 'g1',
    name: 'Hogar',
    color: '#6C5CE7',
    limit: null,
    isRemainder: false,
    position: 0,
    entries: [
      { id: 'e-luz', groupId: 'g1', itemId: null, name: 'Luz', amount: '60.00', paid: false, position: 0, transaction: null },
      {
        id: 'e-agua',
        groupId: 'g1',
        itemId: null,
        name: 'Agua',
        amount: '25.00',
        paid: true,
        position: 1,
        transaction: { id: 'tx-other', amount: '25.00', occurredAt: '2026-05-02T10:00:00.000Z' },
      },
      { id: 'e-ivan', groupId: 'g1', itemId: null, name: 'Luz Ivan', amount: '-30.00', paid: false, position: 2, transaction: null },
      {
        id: 'e-hipoteca',
        groupId: 'g1',
        itemId: null,
        name: 'Hipoteca',
        amount: '700.00',
        paid: true,
        position: 3,
        transaction: { id: 'tx-own', amount: '700.00', occurredAt: '2026-05-01T10:00:00.000Z' },
      },
    ],
  },
];

const mockBudgetState = {
  data: { month: { year: 2026, month: 5, income: '2000.00' }, groups: mockBudgetGroups } as unknown,
  isLoading: false,
  isError: false,
  isFetching: false,
};

jest.mock('@/features/budgets/useBudgets', () => ({
  useBudgetMonth: jest.fn(() => mockBudgetState),
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

describe('TransactionForm - enlace con el presupuesto', () => {
  const baseValues: AddTransactionFormValues = {
    type: 'EXPENSE',
    categoryId: 'cat-exp-1',
    amount: 62.3,
    description: '',
    occurredAt: new Date(2026, 4, 12, 12, 0, 0),
    budgetEntryId: null,
  };

  const renderForm = (props: Partial<React.ComponentProps<typeof TransactionForm>> = {}) => {
    const onSubmit = jest.fn();
    render(
      <TransactionForm
        defaultValues={baseValues}
        submitLabel="Guardar"
        isSubmitting={false}
        submitError={null}
        onSubmit={onSubmit}
        {...props}
      />,
    );
    return { onSubmit };
  };

  const submittedValues = (onSubmit: jest.Mock) => onSubmit.mock.calls[0][0] as AddTransactionFormValues;

  beforeEach(() => {
    mockBudgetState.isLoading = false;
    mockBudgetState.isError = false;
    mockBudgetState.isFetching = false;
    mockBudgetState.data = { month: { year: 2026, month: 5, income: '2000.00' }, groups: mockBudgetGroups };
    jest.mocked(useBudgetMonth).mockClear();
  });

  it('solo se ofrece para un gasto: un ingreso no cubre lineas del presupuesto', () => {
    renderForm();

    expect(screen.getByTestId('budget-link-toggle')).toBeTruthy();

    fireEvent.press(screen.getByTestId('transaction-type-INCOME'));

    expect(screen.queryByTestId('budget-link-toggle')).toBeNull();
  });

  it('consulta el presupuesto del mes del gasto', () => {
    renderForm();

    expect(useBudgetMonth).toHaveBeenCalledWith({ year: 2026, month: 5 });
  });

  it('lista solo las lineas de gasto libres: ni reembolsos ni lineas con otro gasto enlazado', () => {
    renderForm();

    fireEvent.press(screen.getByTestId('budget-link-toggle'));

    expect(screen.getByTestId('budget-link-option-e-luz')).toBeTruthy();
    expect(screen.queryByTestId('budget-link-option-e-agua')).toBeNull();
    expect(screen.queryByTestId('budget-link-option-e-ivan')).toBeNull();
    expect(screen.queryByTestId('budget-link-option-e-hipoteca')).toBeNull();
    expect(screen.getByText('Hogar')).toBeTruthy();
  });

  it('al editar, la propia linea del gasto sigue disponible y se ve elegida', () => {
    renderForm({ defaultValues: { ...baseValues, budgetEntryId: 'e-hipoteca' }, ownTransactionId: 'tx-own' });

    expect(screen.getByText('Hipoteca · Hogar')).toBeTruthy();
    fireEvent.press(screen.getByTestId('budget-link-toggle'));
    expect(screen.getByTestId('budget-link-option-e-hipoteca').props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('elegir una linea la envia con el formulario y cierra la lista', async () => {
    const { onSubmit } = renderForm();

    fireEvent.press(screen.getByTestId('budget-link-toggle'));
    fireEvent.press(screen.getByTestId('budget-link-option-e-luz'));

    expect(screen.queryByTestId('budget-link-option-e-luz')).toBeNull();
    expect(screen.getByText('Luz · Hogar')).toBeTruthy();
    fireEvent.press(screen.getByTestId('transaction-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submittedValues(onSubmit).budgetEntryId).toBe('e-luz');
  });

  it('"Sin enlazar" quita la linea elegida', async () => {
    const { onSubmit } = renderForm({ defaultValues: { ...baseValues, budgetEntryId: 'e-luz' } });

    fireEvent.press(screen.getByTestId('budget-link-toggle'));
    fireEvent.press(screen.getByTestId('budget-link-none'));
    fireEvent.press(screen.getByTestId('transaction-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submittedValues(onSubmit).budgetEntryId).toBeNull();
    expect(screen.getByText('Sin enlazar')).toBeTruthy();
  });

  it('pasar a ingreso descarta la linea elegida', async () => {
    const { onSubmit } = renderForm({ defaultValues: { ...baseValues, budgetEntryId: 'e-luz' } });

    fireEvent.press(screen.getByTestId('transaction-type-INCOME'));
    fireEvent.press(screen.getByTestId('category-chip-cat-inc-1'));
    fireEvent.press(screen.getByTestId('transaction-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submittedValues(onSubmit).type).toBe('INCOME');
    expect(submittedValues(onSubmit).budgetEntryId).toBeNull();
  });

  it('si la linea elegida no es del presupuesto del mes (se cambio la fecha de mes) se quita', async () => {
    const { onSubmit } = renderForm({ defaultValues: { ...baseValues, budgetEntryId: 'e-de-otro-mes' } });

    fireEvent.press(screen.getByTestId('transaction-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submittedValues(onSubmit).budgetEntryId).toBeNull();
  });

  it('no quita la linea mientras el presupuesto se esta actualizando (un dato antiguo podria no incluirla)', async () => {
    mockBudgetState.isFetching = true;
    const { onSubmit } = renderForm({ defaultValues: { ...baseValues, budgetEntryId: 'e-de-otro-mes' } });

    fireEvent.press(screen.getByTestId('transaction-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submittedValues(onSubmit).budgetEntryId).toBe('e-de-otro-mes');
  });

  it('con una linea ya enlazada que aun no ha cargado no dice "Sin enlazar": muestra su nombre y la conserva', async () => {
    mockBudgetState.isLoading = true;
    mockBudgetState.data = undefined;
    const { onSubmit } = renderForm({
      defaultValues: { ...baseValues, budgetEntryId: 'e-hipoteca' },
      ownTransactionId: 'tx-own',
      linkedBudgetLabel: 'Hipoteca · Hogar',
    });

    expect(screen.getByText('Hipoteca · Hogar')).toBeTruthy();
    expect(screen.queryByText('Sin enlazar')).toBeNull();
    fireEvent.press(screen.getByTestId('transaction-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submittedValues(onSubmit).budgetEntryId).toBe('e-hipoteca');
  });

  it('sin nombre conocido usa un texto generico en vez de "Sin enlazar"', () => {
    mockBudgetState.isLoading = true;
    mockBudgetState.data = undefined;
    renderForm({ defaultValues: { ...baseValues, budgetEntryId: 'e-hipoteca' } });

    expect(screen.getByText('Línea del presupuesto')).toBeTruthy();
  });

  it('avisa mientras carga, si falla y si no hay lineas libres', () => {
    mockBudgetState.isLoading = true;
    const { unmount } = render(
      <TransactionForm submitLabel="Guardar" isSubmitting={false} submitError={null} onSubmit={noop} />,
    );
    fireEvent.press(screen.getByTestId('budget-link-toggle'));
    expect(screen.getByText('Cargando el presupuesto…')).toBeTruthy();
    unmount();

    mockBudgetState.isLoading = false;
    mockBudgetState.isError = true;
    const second = render(
      <TransactionForm submitLabel="Guardar" isSubmitting={false} submitError={null} onSubmit={noop} />,
    );
    fireEvent.press(screen.getByTestId('budget-link-toggle'));
    expect(screen.getByText('No se pudo cargar el presupuesto.')).toBeTruthy();
    second.unmount();

    mockBudgetState.isError = false;
    mockBudgetState.data = { month: null, groups: [] };
    render(<TransactionForm submitLabel="Guardar" isSubmitting={false} submitError={null} onSubmit={noop} />);
    fireEvent.press(screen.getByTestId('budget-link-toggle'));
    expect(screen.getByText('No hay líneas de gasto libres en el presupuesto de este mes.')).toBeTruthy();
  });

  it('la lista se expone como grupo de opciones accesible', () => {
    renderForm();

    const toggle = screen.getByTestId('budget-link-toggle');
    expect(toggle.props.accessibilityRole).toBe('button');
    expect(toggle.props.accessibilityState).toMatchObject({ expanded: false });
    fireEvent.press(toggle);
    expect(screen.getByTestId('budget-link-toggle').props.accessibilityState).toMatchObject({ expanded: true });
    expect(screen.getByTestId('budget-link-option-e-luz').props.accessibilityRole).toBe('radio');
    expect(screen.getByLabelText('Línea del presupuesto').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByText('Hogar').props.accessibilityRole).toBe('header');
    // Opciones apiladas de 44 pt: sin hitSlop para que no se solapen con las vecinas.
    expect(screen.getByTestId('budget-link-option-e-luz').props.hitSlop).toBe(0);
    expect(screen.getByTestId('budget-link-option-e-luz').props.accessibilityLabel).toMatch(/^Luz, previsto /);
  });
});
