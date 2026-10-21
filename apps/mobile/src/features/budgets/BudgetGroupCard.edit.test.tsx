import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { BudgetEntry, BudgetGroup } from './budgets.types';
import { BudgetGroupCard } from './BudgetGroupCard';

const mockUpdateEntry = jest.fn().mockResolvedValue(undefined);
const mockDeleteEntry = jest.fn().mockResolvedValue(undefined);
const mockCreateEntry = jest.fn().mockResolvedValue(undefined);
const mockUpdateGroup = jest.fn().mockResolvedValue(undefined);
const mockDeleteGroup = jest.fn().mockResolvedValue(undefined);

jest.mock('./useBudgets', () => ({
  useUpdateEntry: () => ({ mutateAsync: mockUpdateEntry }),
  useDeleteEntry: () => ({ mutateAsync: mockDeleteEntry }),
  useCreateEntry: () => ({ mutateAsync: mockCreateEntry }),
  useUpdateGroup: () => ({ mutateAsync: mockUpdateGroup }),
  useDeleteGroup: () => ({ mutateAsync: mockDeleteGroup }),
}));
jest.mock('@/utils/alert', () => ({ confirmAsync: jest.fn().mockResolvedValue(true), notify: jest.fn() }));

const target = { year: 2026, month: 10 };

const entry = (overrides: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: 'e1',
  groupId: 'g1',
  itemId: 'i1',
  name: 'Netflix',
  amount: '21.99',
  paid: false,
  position: 0,
  ...overrides,
});

const group = (entries: BudgetEntry[] = [entry()]): BudgetGroup => ({
  id: 'g1',
  name: 'Hogar',
  color: '#4F5DFF',
  limit: null,
  position: 0,
  entries,
});

const renderCard = (editMode: boolean, entries?: BudgetEntry[], limit: string | null = null) =>
  render(
    <BudgetGroupCard
      group={{ ...group(entries), limit }}
      onTogglePaid={jest.fn()}
      editMode={editMode}
      target={target}
    />,
  );

describe('BudgetGroupCard en modo edicion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fuera del modo edicion no hay controles de edicion', () => {
    renderCard(false);

    expect(screen.queryByTestId('budget-group-edit-g1')).toBeNull();
    expect(screen.queryByTestId('budget-add-line-g1')).toBeNull();
    expect(screen.getByTestId('budget-entry-e1').props.accessibilityRole).toBe('checkbox');
  });

  it('en modo edicion las filas pasan a ser botones de editar y aparecen los controles', () => {
    renderCard(true);

    expect(screen.getByTestId('budget-group-edit-g1')).toBeTruthy();
    expect(screen.getByTestId('budget-add-line-g1')).toBeTruthy();
    expect(screen.getByTestId('budget-entry-e1').props.accessibilityRole).toBe('button');
    expect(screen.getByLabelText('Editar Netflix')).toBeTruthy();
  });

  it('un grupo sin lineas muestra el boton de anadir en vez del aviso', () => {
    renderCard(true, []);

    expect(screen.queryByText('Sin líneas este mes.')).toBeNull();
    expect(screen.getByTestId('budget-add-line-g1')).toBeTruthy();
  });

  it('editar una linea precarga el formulario y guarda solo en este mes por defecto', async () => {
    renderCard(true);

    fireEvent.press(screen.getByTestId('budget-entry-e1'));
    expect(screen.getByDisplayValue('Netflix')).toBeTruthy();
    expect(screen.getByDisplayValue('21,99')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('budget-line-amount'), '25');
    fireEvent.press(screen.getByTestId('budget-line-submit'));

    await waitFor(() => expect(mockUpdateEntry).toHaveBeenCalledTimes(1));
    expect(mockUpdateEntry).toHaveBeenCalledWith({
      entry: expect.objectContaining({ id: 'e1' }),
      line: { name: 'Netflix', amount: 25 },
      scope: 'month',
    });
    await waitFor(() => expect(screen.queryByTestId('budget-line-name')).toBeNull());
  });

  it('una linea puntual (sin item) no ofrece el alcance', () => {
    renderCard(true, [entry({ itemId: null })]);

    fireEvent.press(screen.getByTestId('budget-entry-e1'));

    expect(screen.queryByText('Se aplica a')).toBeNull();
  });

  it('borra la linea desde el formulario', async () => {
    renderCard(true);

    fireEvent.press(screen.getByTestId('budget-entry-e1'));
    fireEvent.press(screen.getByTestId('budget-line-delete'));

    await waitFor(() => expect(mockDeleteEntry).toHaveBeenCalledWith({ entry: expect.objectContaining({ id: 'e1' }), scope: 'month' }));
  });

  it('anade una linea recurrente al grupo', async () => {
    renderCard(true);

    fireEvent.press(screen.getByTestId('budget-add-line-g1'));
    fireEvent.changeText(screen.getByTestId('budget-line-name'), 'Gimnasio');
    fireEvent.changeText(screen.getByTestId('budget-line-amount'), '60');
    fireEvent.press(screen.getByTestId('budget-line-submit'));

    await waitFor(() => expect(mockCreateEntry).toHaveBeenCalledTimes(1));
    expect(mockCreateEntry).toHaveBeenCalledWith({
      groupId: 'g1',
      line: { name: 'Gimnasio', amount: 60 },
      scope: 'template',
    });
  });

  it('edita el grupo desde la cabecera', async () => {
    renderCard(true);

    fireEvent.press(screen.getByTestId('budget-group-edit-g1'));
    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Casa');
    fireEvent.press(screen.getByTestId('budget-group-submit'));

    await waitFor(() =>
      expect(mockUpdateGroup).toHaveBeenCalledWith({ id: 'g1', name: 'Casa', color: '#4F5DFF', limit: null }),
    );
  });

  it('el formulario del grupo precarga su limite y permite cambiarlo', async () => {
    renderCard(true, undefined, '600.00');

    fireEvent.press(screen.getByTestId('budget-group-edit-g1'));
    expect(screen.getByDisplayValue('600')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('budget-group-limit'), '750,5');
    fireEvent.press(screen.getByTestId('budget-group-submit'));

    await waitFor(() =>
      expect(mockUpdateGroup).toHaveBeenCalledWith({ id: 'g1', name: 'Hogar', color: '#4F5DFF', limit: 750.5 }),
    );
  });

  it('vaciar el campo del limite lo quita', async () => {
    renderCard(true, undefined, '600.00');

    fireEvent.press(screen.getByTestId('budget-group-edit-g1'));
    fireEvent.changeText(screen.getByTestId('budget-group-limit'), '');
    fireEvent.press(screen.getByTestId('budget-group-submit'));

    await waitFor(() =>
      expect(mockUpdateGroup).toHaveBeenCalledWith({ id: 'g1', name: 'Hogar', color: '#4F5DFF', limit: null }),
    );
  });

  it('en modo edicion la barra de limite sigue visible, y se oculta mientras se edita el grupo', () => {
    renderCard(true, undefined, '600.00');
    expect(screen.getByTestId('budget-limit-g1')).toBeTruthy();

    fireEvent.press(screen.getByTestId('budget-group-edit-g1'));

    expect(screen.queryByTestId('budget-limit-g1')).toBeNull();
  });

  it('solo hay un formulario abierto a la vez', () => {
    renderCard(true);

    fireEvent.press(screen.getByTestId('budget-entry-e1'));
    fireEvent.press(screen.getByTestId('budget-group-edit-g1'));

    expect(screen.queryByTestId('budget-line-name')).toBeNull();
    expect(screen.getByTestId('budget-group-name')).toBeTruthy();
  });

  it('al cambiar de mes se cierran los formularios abiertos (no guardarian en el mes nuevo)', () => {
    const { rerender } = renderCard(true);
    fireEvent.press(screen.getByTestId('budget-entry-e1'));
    expect(screen.getByTestId('budget-line-name')).toBeTruthy();

    rerender(
      <BudgetGroupCard
        group={group()}
        onTogglePaid={jest.fn()}
        editMode
        target={{ year: 2026, month: 9 }}
      />,
    );

    expect(screen.queryByTestId('budget-line-name')).toBeNull();
  });

  it('al salir del modo edicion se cierran los formularios abiertos', () => {
    const { rerender } = renderCard(true);
    fireEvent.press(screen.getByTestId('budget-entry-e1'));
    expect(screen.getByTestId('budget-line-name')).toBeTruthy();

    rerender(<BudgetGroupCard group={group()} onTogglePaid={jest.fn()} editMode={false} target={target} />);

    expect(screen.queryByTestId('budget-line-name')).toBeNull();
    expect(screen.getByTestId('budget-entry-e1').props.accessibilityRole).toBe('checkbox');
  });
});
