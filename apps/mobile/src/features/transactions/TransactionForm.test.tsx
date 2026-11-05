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
      { id: 'e-luz', groupId: 'g1', itemId: null, name: 'Luz', amount: '60.00', paid: false, position: 0, envelope: false, transactions: [] },
      {
        id: 'e-agua',
        groupId: 'g1',
        itemId: null,
        name: 'Agua',
        amount: '25.00',
        paid: true,
        position: 1,
        envelope: false,
        transactions: [{ id: 'tx-other', amount: '25.00', occurredAt: '2026-05-02T10:00:00.000Z' }],
      },
      { id: 'e-ivan', groupId: 'g1', itemId: null, name: 'Luz Ivan', amount: '-30.00', paid: false, position: 2, envelope: false, transactions: [] },
      {
        id: 'e-hipoteca',
        groupId: 'g1',
        itemId: null,
        name: 'Hipoteca',
        amount: '700.00',
        paid: true,
        position: 3,
        envelope: false,
        transactions: [{ id: 'tx-own', amount: '700.00', occurredAt: '2026-05-01T10:00:00.000Z' }],
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
    // El nombre del grupo sale como cabecera de sus lineas y, aparte, como opcion de gasto nuevo.
    expect(screen.getAllByText('Hogar')).toHaveLength(2);
  });

  it('en un mes futuro sin guardar no ofrece lineas y explica que hay que prepararlo en Presupuesto', () => {
    const original = mockBudgetState.data;
    mockBudgetState.data = { ...(original as object), preview: true };
    try {
      renderForm();

      fireEvent.press(screen.getByTestId('budget-link-toggle'));

      expect(screen.queryByTestId('budget-link-option-e-luz')).toBeNull();
      expect(screen.getByText(/aún no está preparado en Presupuesto/)).toBeTruthy();
      expect(screen.getByTestId('budget-link-none')).toBeTruthy();
    } finally {
      mockBudgetState.data = original;
    }
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

  describe('importe al enlazar', () => {
    // Sin valores por defecto: formulario de alta, con el importe vacio.
    const emptyValues = undefined;

    it('con el importe vacio, enlazar lo rellena con el previsto de la linea', async () => {
      const { onSubmit } = renderForm({ defaultValues: emptyValues });
      expect(screen.getByTestId('transaction-amount-input').props.value).toBe('');

      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-option-e-luz'));
      fireEvent.press(screen.getByTestId('category-chip-cat-exp-1'));

      expect(screen.getByTestId('transaction-amount-input').props.value).toBe('60');
      fireEvent.press(screen.getByTestId('transaction-submit'));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(submittedValues(onSubmit)).toMatchObject({ amount: 60, budgetEntryId: 'e-luz' });
    });

    it('usa la coma decimal del campo con importes con decimales', () => {
      mockBudgetState.data = {
        month: { year: 2026, month: 5, income: '0' },
        groups: [
          {
            ...mockBudgetGroups[0],
            entries: [
              { id: 'e-cuota', groupId: 'g1', itemId: null, name: 'Cuota', amount: '21.99', paid: false, position: 0, envelope: false, transactions: [] },
            ],
          },
        ],
      };
      renderForm({ defaultValues: emptyValues });

      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-option-e-cuota'));

      expect(screen.getByTestId('transaction-amount-input').props.value).toBe('21,99');
    });

    it('un importe ya escrito no se toca', async () => {
      const { onSubmit } = renderForm({ defaultValues: emptyValues });
      fireEvent.changeText(screen.getByTestId('transaction-amount-input'), '62,30');

      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-option-e-luz'));
      fireEvent.press(screen.getByTestId('category-chip-cat-exp-1'));

      expect(screen.getByTestId('transaction-amount-input').props.value).toBe('62,30');
      fireEvent.press(screen.getByTestId('transaction-submit'));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(submittedValues(onSubmit).amount).toBe(62.3);
    });

    it('con la descripcion vacia, enlazar la rellena con el nombre de la linea y se envia', async () => {
      const { onSubmit } = renderForm({ defaultValues: emptyValues });
      expect(screen.getByPlaceholderText('Descripción (opcional)').props.value).toBe('');

      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-option-e-luz'));
      fireEvent.press(screen.getByTestId('category-chip-cat-exp-1'));

      expect(screen.getByPlaceholderText('Descripción (opcional)').props.value).toBe('Luz');
      fireEvent.press(screen.getByTestId('transaction-submit'));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(submittedValues(onSubmit)).toMatchObject({ description: 'Luz', amount: 60, budgetEntryId: 'e-luz' });
    });

    it('una descripcion ya escrita no se toca', () => {
      renderForm({ defaultValues: emptyValues });
      fireEvent.changeText(screen.getByPlaceholderText('Descripción (opcional)'), 'Recibo de octubre');

      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-option-e-luz'));

      expect(screen.getByPlaceholderText('Descripción (opcional)').props.value).toBe('Recibo de octubre');
    });

    it('una descripcion de solo espacios cuenta como vacia', () => {
      renderForm({ defaultValues: emptyValues });
      fireEvent.changeText(screen.getByPlaceholderText('Descripción (opcional)'), '   ');

      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-option-e-luz'));

      expect(screen.getByPlaceholderText('Descripción (opcional)').props.value).toBe('Luz');
    });

    it('importe y descripcion se rellenan de forma independiente: uno escrito no impide rellenar el otro', () => {
      renderForm({ defaultValues: emptyValues });
      fireEvent.changeText(screen.getByTestId('transaction-amount-input'), '62,30');

      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-option-e-luz'));

      expect(screen.getByTestId('transaction-amount-input').props.value).toBe('62,30');
      expect(screen.getByPlaceholderText('Descripción (opcional)').props.value).toBe('Luz');
    });

    it('al cambiar a otra linea no pisa la descripcion que ya se rellenó con la anterior', () => {
      mockBudgetState.data = {
        month: { year: 2026, month: 5, income: '0' },
        groups: [
          {
            ...mockBudgetGroups[0],
            entries: [
              { id: 'e-luz', groupId: 'g1', itemId: null, name: 'Luz', amount: '60.00', paid: false, position: 0, envelope: false, transactions: [] },
              { id: 'e-gas', groupId: 'g1', itemId: null, name: 'Gas', amount: '30.00', paid: false, position: 1, envelope: false, transactions: [] },
            ],
          },
        ],
      };
      renderForm({ defaultValues: emptyValues });

      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-option-e-luz'));
      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-option-e-gas'));

      expect(screen.getByPlaceholderText('Descripción (opcional)').props.value).toBe('Luz');
      expect(screen.getByTestId('transaction-amount-input').props.value).toBe('60');
    });

    it('quitar el enlace no borra el importe que se habia rellenado', () => {
      renderForm({ defaultValues: emptyValues });
      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-option-e-luz'));

      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-none'));

      expect(screen.getByTestId('transaction-amount-input').props.value).toBe('60');
      expect(screen.getByPlaceholderText('Descripción (opcional)').props.value).toBe('Luz');
    });
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
    expect(screen.getAllByText('Hogar').map((node) => node.props.accessibilityRole)).toContain('header');
    // Opciones apiladas de 44 pt: sin hitSlop para que no se solapen con las vecinas.
    expect(screen.getByTestId('budget-link-option-e-luz').props.hitSlop).toBe(0);
    expect(screen.getByTestId('budget-link-option-e-luz').props.accessibilityLabel).toMatch(/^Luz, previsto /);
  });

  describe('sobres (lineas variables)', () => {
    const expense = (id: string, amount: string) => ({ id, amount, occurredAt: '2026-05-03T10:00:00.000Z' });
    const supermercado = {
      id: 'e-super',
      groupId: 'g1',
      itemId: 'i-super',
      name: 'Supermercado',
      amount: '300.00',
      paid: false,
      position: 0,
      envelope: true,
      transactions: [expense('tx-a', '45.00'), expense('tx-b', '32.50')],
    };

    beforeEach(() => {
      mockBudgetState.data = {
        month: { year: 2026, month: 5, income: '2000.00' },
        groups: [{ ...mockBudgetGroups[0], entries: [...mockBudgetGroups[0].entries, supermercado] }],
      };
    });

    it('un sobre se ofrece aunque ya tenga gastos, con lo gastado de lo previsto', () => {
      renderForm();
      fireEvent.press(screen.getByTestId('budget-link-toggle'));

      const option = screen.getByTestId('budget-link-option-e-super');
      expect(option).toBeTruthy();
      expect(screen.getByText('77,50 € de 300,00 €')).toBeTruthy();
      expect(String(option.props.accessibilityLabel).replace(/ /g, ' ')).toBe(
        'Supermercado, variable, gastado 77,50 € de 300,00 €',
      );
      // Una linea normal con su gasto sigue sin ofrecerse.
      expect(screen.queryByTestId('budget-link-option-e-agua')).toBeNull();
    });

    it('enlazar con un sobre no rellena el importe ni la descripcion con los del sobre', async () => {
      const { onSubmit } = renderForm({ defaultValues: undefined });

      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-option-e-super'));
      fireEvent.changeText(screen.getByTestId('transaction-amount-input'), '32,50');
      fireEvent.press(screen.getByTestId('category-chip-cat-exp-1'));

      expect(screen.getByTestId('transaction-amount-input').props.value).toBe('32,50');
      expect(screen.getByPlaceholderText('Descripción (opcional)').props.value).toBe('');
      fireEvent.press(screen.getByTestId('transaction-submit'));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(submittedValues(onSubmit)).toMatchObject({ amount: 32.5, budgetEntryId: 'e-super', description: '' });
    });

    it('con el importe vacio no se rellena con los 300 del sobre', () => {
      renderForm({ defaultValues: undefined });
      expect(screen.getByTestId('transaction-amount-input').props.value).toBe('');

      fireEvent.press(screen.getByTestId('budget-link-toggle'));
      fireEvent.press(screen.getByTestId('budget-link-option-e-super'));

      expect(screen.getByTestId('transaction-amount-input').props.value).toBe('');
    });

    it('al editar un gasto del sobre, ese sobre sigue elegido', () => {
      renderForm({ defaultValues: { ...baseValues, budgetEntryId: 'e-super' }, ownTransactionId: 'tx-a' });

      expect(screen.getByTestId('budget-link-toggle').props.accessibilityLabel).toBe(
        'Línea del presupuesto: Supermercado · Hogar',
      );
    });
  });
});

describe('TransactionForm - gasto nuevo en un grupo del presupuesto', () => {
  const groups = [
    ...mockBudgetGroups,
    { id: 'g2', name: 'Deseos', color: '#E67E22', limit: null, isRemainder: true, position: 1, entries: [] },
  ];

  const baseValues: AddTransactionFormValues = {
    type: 'EXPENSE',
    categoryId: 'cat-exp-1',
    amount: 3.5,
    description: 'Cerveza',
    occurredAt: new Date(2026, 4, 12, 12, 0, 0),
    budgetEntryId: null,
    budgetGroupId: null,
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
    mockBudgetState.data = { month: { year: 2026, month: 5, income: '2000.00' }, groups };
  });

  it('ofrece un gasto nuevo en cada grupo del presupuesto, tambien en los que no tienen lineas', () => {
    renderForm();

    fireEvent.press(screen.getByTestId('budget-link-toggle'));

    expect(screen.getByTestId('budget-group-option-g1')).toBeTruthy();
    expect(screen.getByTestId('budget-group-option-g2')).toBeTruthy();
    expect(screen.getByLabelText('Nuevo gasto en Deseos')).toBeTruthy();
  });

  it('separa las dos formas de cubrir el gasto con un titulo cada una', () => {
    renderForm();

    fireEvent.press(screen.getByTestId('budget-link-toggle'));

    expect(screen.getByText('Gasto nuevo en un grupo').props.accessibilityRole).toBe('header');
    expect(screen.getByText('Enlazar con una línea').props.accessibilityRole).toBe('header');
  });

  it('elegir un grupo lo envia con el formulario, sin linea, y lo resume cerrando la lista', async () => {
    const { onSubmit } = renderForm();

    fireEvent.press(screen.getByTestId('budget-link-toggle'));
    fireEvent.press(screen.getByTestId('budget-group-option-g2'));

    expect(screen.queryByTestId('budget-group-option-g2')).toBeNull();
    expect(screen.getByText('Nuevo gasto en Deseos')).toBeTruthy();
    fireEvent.press(screen.getByTestId('transaction-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submittedValues(onSubmit)).toMatchObject({ budgetGroupId: 'g2', budgetEntryId: null });
  });

  it('el grupo elegido se ve marcado al volver a abrir la lista y "Sin enlazar" deja de estarlo', () => {
    renderForm({ defaultValues: { ...baseValues, budgetGroupId: 'g2' } });

    fireEvent.press(screen.getByTestId('budget-link-toggle'));

    expect(screen.getByTestId('budget-group-option-g2').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('budget-group-option-g1').props.accessibilityState).toMatchObject({ selected: false });
    expect(screen.getByTestId('budget-link-none').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('elegir despues una linea que ya existe sustituye al grupo', async () => {
    const { onSubmit } = renderForm({ defaultValues: { ...baseValues, budgetGroupId: 'g2' } });

    fireEvent.press(screen.getByTestId('budget-link-toggle'));
    fireEvent.press(screen.getByTestId('budget-link-option-e-luz'));
    fireEvent.press(screen.getByTestId('transaction-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submittedValues(onSubmit)).toMatchObject({ budgetEntryId: 'e-luz', budgetGroupId: null });
  });

  it('"Sin enlazar" quita el grupo elegido', async () => {
    const { onSubmit } = renderForm({ defaultValues: { ...baseValues, budgetGroupId: 'g2' } });

    fireEvent.press(screen.getByTestId('budget-link-toggle'));
    fireEvent.press(screen.getByTestId('budget-link-none'));
    fireEvent.press(screen.getByTestId('transaction-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submittedValues(onSubmit).budgetGroupId).toBeNull();
    expect(screen.getByText('Sin enlazar')).toBeTruthy();
  });

  it('elegir un grupo quita la linea que hubiera elegida', async () => {
    const { onSubmit } = renderForm({ defaultValues: { ...baseValues, budgetEntryId: 'e-luz' } });

    fireEvent.press(screen.getByTestId('budget-link-toggle'));
    fireEvent.press(screen.getByTestId('budget-group-option-g1'));
    fireEvent.press(screen.getByTestId('transaction-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submittedValues(onSubmit)).toMatchObject({ budgetGroupId: 'g1', budgetEntryId: null });
  });

  it('pasar a ingreso descarta el grupo', async () => {
    const { onSubmit } = renderForm({ defaultValues: { ...baseValues, budgetGroupId: 'g2' } });

    fireEvent.press(screen.getByTestId('transaction-type-INCOME'));
    fireEvent.press(screen.getByTestId('category-chip-cat-inc-1'));
    fireEvent.press(screen.getByTestId('transaction-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submittedValues(onSubmit)).toMatchObject({ type: 'INCOME', budgetGroupId: null });
  });

  it('un grupo elegido se conserva al enviar: la comprobacion de mes solo afecta a las lineas', async () => {
    mockBudgetState.data = { month: { year: 2026, month: 5, income: '2000.00' }, groups };
    const { onSubmit } = renderForm({ defaultValues: { ...baseValues, budgetGroupId: 'g2' } });

    fireEvent.press(screen.getByTestId('transaction-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submittedValues(onSubmit).budgetGroupId).toBe('g2');
  });

  it('sin nombre conocido todavia (presupuesto cargando) resume "un grupo" en vez de quedarse vacio', () => {
    mockBudgetState.data = undefined as unknown as typeof mockBudgetState.data;
    renderForm({ defaultValues: { ...baseValues, budgetGroupId: 'g2' } });

    expect(screen.getByText('Nuevo gasto en un grupo')).toBeTruthy();
  });

  it('en un mes futuro sin guardar tambien ofrece los grupos: el servidor guarda el mes al crear el gasto', () => {
    mockBudgetState.data = { preview: true, month: { year: 2026, month: 5, income: '2000.00' }, groups };
    renderForm();

    fireEvent.press(screen.getByTestId('budget-link-toggle'));

    expect(screen.getByTestId('budget-group-option-g2')).toBeTruthy();
    expect(screen.queryByTestId('budget-link-option-e-luz')).toBeNull();
  });

  it('sin grupos en el presupuesto no aparece la seccion', () => {
    mockBudgetState.data = { month: { year: 2026, month: 5, income: '2000.00' }, groups: [] };
    renderForm();

    fireEvent.press(screen.getByTestId('budget-link-toggle'));

    expect(screen.queryByText('Gasto nuevo en un grupo')).toBeNull();
  });

  describe('al editar un gasto que creo su propia linea', () => {
    const own = { ...baseValues, budgetEntryId: 'e-propia' };

    it('la linea no se quita sola aunque ya no este en el presupuesto del mes: el servidor la rehace', async () => {
      const { onSubmit } = renderForm({
        defaultValues: own,
        ownBudgetLineId: 'e-propia',
        linkedBudgetLabel: 'Cerveza · Deseos',
      });

      fireEvent.press(screen.getByTestId('transaction-submit'));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(submittedValues(onSubmit).budgetEntryId).toBe('e-propia');
      expect(screen.getByText('Cerveza · Deseos')).toBeTruthy();
    });

    it('otra linea de otro mes que no es la propia si se sigue quitando', async () => {
      const { onSubmit } = renderForm({
        defaultValues: { ...baseValues, budgetEntryId: 'e-de-otro-mes' },
        ownBudgetLineId: 'e-propia',
      });

      fireEvent.press(screen.getByTestId('transaction-submit'));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(submittedValues(onSubmit).budgetEntryId).toBeNull();
    });
  });

  describe('gasto nuevo desde "+ gasto" de Presupuesto', () => {
    it('con importe vacio muestra el campo vacio (no "undefined") y el grupo ya elegido', () => {
      renderForm({ defaultValues: { ...baseValues, amount: undefined as unknown as number, description: '', budgetGroupId: 'g2' } });

      expect(screen.getByTestId('transaction-amount-input').props.value).toBe('');
      expect(screen.getByText('Nuevo gasto en Deseos')).toBeTruthy();
    });
  });
});
