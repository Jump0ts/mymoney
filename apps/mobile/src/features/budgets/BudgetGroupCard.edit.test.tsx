import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { Category } from '@/features/categories/categories.types';
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
const categories: Category[] = [
  { id: 'c1', name: 'Alimentación', icon: 'shopping-cart', color: '#E67E22', type: 'EXPENSE' },
];

const entry = (overrides: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: 'e1',
  groupId: 'g1',
  itemId: 'i1',
  name: 'Netflix',
  amount: '21.99',
  kind: 'FIXED',
  categoryId: null,
  paid: false,
  position: 0,
  spent: null,
  ...overrides,
});

const group = (entries: BudgetEntry[] = [entry()]): BudgetGroup => ({
  id: 'g1',
  name: 'Hogar',
  color: '#4F5DFF',
  position: 0,
  entries,
});

const renderCard = (editMode: boolean, entries?: BudgetEntry[]) =>
  render(
    <BudgetGroupCard
      group={group(entries)}
      onTogglePaid={jest.fn()}
      editMode={editMode}
      categories={categories}
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
      line: { name: 'Netflix', kind: 'FIXED', amount: 25, categoryId: null },
      scope: 'month',
    });
    await waitFor(() => expect(screen.queryByTestId('budget-line-name')).toBeNull());
  });

  it('una linea puntual (sin item) no ofrece el alcance', () => {
    renderCard(true, [entry({ itemId: null })]);

    fireEvent.press(screen.getByTestId('budget-entry-e1'));

    expect(screen.queryByText('Se aplica a')).toBeNull();
  });

  it('una linea con limite no deja cambiar el tipo', () => {
    renderCard(true, [entry({ kind: 'CATEGORY_LIMIT', amount: '180.00', categoryId: 'c1' })]);

    fireEvent.press(screen.getByTestId('budget-entry-e1'));

    expect(screen.queryByLabelText('Reembolso')).toBeNull();
    expect(screen.getByTestId('budget-line-category-c1')).toBeTruthy();
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
      line: { name: 'Gimnasio', kind: 'FIXED', amount: 60, categoryId: null },
      scope: 'template',
    });
  });

  it('edita el grupo desde la cabecera', async () => {
    renderCard(true);

    fireEvent.press(screen.getByTestId('budget-group-edit-g1'));
    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Casa');
    fireEvent.press(screen.getByTestId('budget-group-submit'));

    await waitFor(() => expect(mockUpdateGroup).toHaveBeenCalledWith({ id: 'g1', name: 'Casa', color: '#4F5DFF' }));
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
        categories={categories}
        target={{ year: 2026, month: 9 }}
      />,
    );

    expect(screen.queryByTestId('budget-line-name')).toBeNull();
  });

  it('al salir del modo edicion se cierran los formularios abiertos', () => {
    const { rerender } = renderCard(true);
    fireEvent.press(screen.getByTestId('budget-entry-e1'));
    expect(screen.getByTestId('budget-line-name')).toBeTruthy();

    rerender(
      <BudgetGroupCard group={group()} onTogglePaid={jest.fn()} editMode={false} categories={categories} target={target} />,
    );

    expect(screen.queryByTestId('budget-line-name')).toBeNull();
    expect(screen.getByTestId('budget-entry-e1').props.accessibilityRole).toBe('checkbox');
  });
});
