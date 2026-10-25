import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BudgetEntry } from './budgets.types';
import { BudgetEntryRow } from './BudgetEntryRow';

const fixed = (overrides: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: 'e1',
  groupId: 'g1',
  itemId: null,
  name: 'Netflix',
  amount: '21.99',
  paid: false,
  position: 0,
  ...overrides,
});

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

describe('BudgetEntryRow (modo edicion)', () => {
  it('es un boton de editar y no un checkbox', () => {
    const onEdit = jest.fn();
    const onTogglePaid = jest.fn();
    const entry = fixed();
    render(<BudgetEntryRow entry={entry} onTogglePaid={onTogglePaid} editMode onEdit={onEdit} />);

    const row = screen.getByTestId('budget-entry-e1');
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toBe('Editar Netflix');

    fireEvent.press(row);
    expect(onEdit).toHaveBeenCalledWith(entry);
    expect(onTogglePaid).not.toHaveBeenCalled();
  });

  it('con onMove muestra las flechas de subir y bajar junto al boton de editar', () => {
    const onMove = jest.fn();
    const entry = fixed();
    render(
      <BudgetEntryRow entry={entry} onTogglePaid={jest.fn()} editMode onMove={onMove} canMoveUp canMoveDown={false} />,
    );

    fireEvent.press(screen.getByLabelText('Subir Netflix'));
    fireEvent.press(screen.getByLabelText('Bajar Netflix'));

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(entry, -1);
    expect(screen.getByLabelText('Editar Netflix')).toBeTruthy();
  });

  it('sin onMove no hay flechas, y fuera del modo edicion tampoco', () => {
    const { rerender } = render(<BudgetEntryRow entry={fixed()} onTogglePaid={jest.fn()} editMode />);
    expect(screen.queryByLabelText('Subir Netflix')).toBeNull();

    rerender(<BudgetEntryRow entry={fixed()} onTogglePaid={jest.fn()} onMove={jest.fn()} />);
    expect(screen.queryByLabelText('Subir Netflix')).toBeNull();
  });
});
