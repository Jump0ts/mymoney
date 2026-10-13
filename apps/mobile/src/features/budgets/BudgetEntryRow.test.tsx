import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BudgetEntry } from './budgets.types';
import { BudgetEntryRow } from './BudgetEntryRow';

const fixed = (overrides: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: 'e1',
  groupId: 'g1',
  itemId: null,
  name: 'Netflix',
  amount: '21.99',
  kind: 'FIXED',
  categoryId: null,
  paid: false,
  position: 0,
  spent: null,
  ...overrides,
});

const limit = (spent: number, amount = '180.00'): BudgetEntry =>
  fixed({ id: 'e2', name: 'Comida casa', amount, kind: 'CATEGORY_LIMIT', categoryId: 'cat-1', spent });

describe('BudgetEntryRow (linea fija)', () => {
  it('muestra el nombre y el importe', () => {
    render(<BudgetEntryRow entry={fixed()} onTogglePaid={jest.fn()} />);

    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.getByText(/21,99/)).toBeTruthy();
  });

  it('se expone como checkbox con su estado de pagado', () => {
    const { rerender } = render(<BudgetEntryRow entry={fixed()} onTogglePaid={jest.fn()} />);
    const row = screen.getByTestId('budget-entry-e1');

    expect(row.props.accessibilityRole).toBe('checkbox');
    expect(row.props.accessibilityState).toMatchObject({ checked: false });
    expect(row.props.accessibilityLabel).toMatch(/^Netflix, /);

    rerender(<BudgetEntryRow entry={fixed({ paid: true })} onTogglePaid={jest.fn()} />);
    expect(screen.getByTestId('budget-entry-e1').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('llama a onTogglePaid con la linea al pulsarla', () => {
    const onTogglePaid = jest.fn();
    const entry = fixed();
    render(<BudgetEntryRow entry={entry} onTogglePaid={onTogglePaid} />);

    fireEvent.press(screen.getByTestId('budget-entry-e1'));

    expect(onTogglePaid).toHaveBeenCalledWith(entry);
  });

  it('muestra un reembolso con su signo negativo', () => {
    render(<BudgetEntryRow entry={fixed({ name: 'Luz Ivan', amount: '-50.00' })} onTogglePaid={jest.fn()} />);

    expect(screen.getByText(/^-50,00/)).toBeTruthy();
  });
});

describe('BudgetEntryRow (limite por categoria)', () => {
  it('muestra lo gastado, el limite y lo que queda', () => {
    render(<BudgetEntryRow entry={limit(45)} onTogglePaid={jest.fn()} />);

    expect(screen.getByText(/45,00.*de.*180,00/)).toBeTruthy();
    expect(screen.getByText(/Quedan.*135,00/)).toBeTruthy();
  });

  it('avisa cuando te pasas del limite', () => {
    render(<BudgetEntryRow entry={limit(200)} onTogglePaid={jest.fn()} />);

    expect(screen.getByText(/Te pasas.*20,00/)).toBeTruthy();
    expect(screen.queryByText(/Quedan/)).toBeNull();
  });

  it('se expone como barra de progreso con su valor', () => {
    render(<BudgetEntryRow entry={limit(45)} onTogglePaid={jest.fn()} />);
    const bar = screen.getByTestId('budget-entry-e2');

    expect(bar.props.accessibilityRole).toBe('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 180, now: 45 });
  });

  it('no es pulsable: lo pagado lo decide el gasto real, no un check', () => {
    const onTogglePaid = jest.fn();
    render(<BudgetEntryRow entry={limit(45)} onTogglePaid={onTogglePaid} />);

    fireEvent.press(screen.getByTestId('budget-entry-e2'));

    expect(onTogglePaid).not.toHaveBeenCalled();
  });
});
