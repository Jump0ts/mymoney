import { fireEvent, render, screen } from '@testing-library/react-native';
import { notify } from '@/utils/alert';
import type { BudgetEntry } from './budgets.types';
import { BudgetEntryRow } from './BudgetEntryRow';

jest.mock('@/utils/alert', () => ({ notify: jest.fn(), confirmAsync: jest.fn() }));

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

describe('BudgetEntryRow (enlazada a un gasto de Movimientos)', () => {
  const linkedEntry = (amount = '60.00', real = '62.30') =>
    fixed({
      id: 'e9',
      name: 'Luz',
      amount,
      paid: true,
      transaction: { id: 'tx-1', amount: real, occurredAt: '2026-10-12T10:00:00.000Z' },
    });

  it('muestra el importe real del gasto y, si difiere, el previsto debajo', () => {
    render(<BudgetEntryRow entry={linkedEntry()} onTogglePaid={jest.fn()} />);

    expect(screen.getByText(/62,30/)).toBeTruthy();
    expect(screen.getByText(/Previsto .*60,00/)).toBeTruthy();
    expect(screen.getByTestId('budget-entry-link-e9')).toBeTruthy();
  });

  it('si el importe real coincide con el previsto no repite el previsto', () => {
    render(<BudgetEntryRow entry={linkedEntry('60.00', '60.00')} onTogglePaid={jest.fn()} />);

    expect(screen.queryByText(/Previsto/)).toBeNull();
    expect(screen.getByTestId('budget-entry-link-e9')).toBeTruthy();
  });

  it('no se puede marcar ni desmarcar a mano: al tocarla explica por que, en vez de no responder', () => {
    const onTogglePaid = jest.fn();
    jest.mocked(notify).mockClear();
    render(<BudgetEntryRow entry={linkedEntry()} onTogglePaid={onTogglePaid} />);
    const row = screen.getByTestId('budget-entry-e9');

    fireEvent.press(row);

    expect(onTogglePaid).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('Línea enlazada a un gasto', expect.stringContaining('quita el enlace'));
    expect(row.props.accessibilityState).toMatchObject({ checked: true });
    expect(row.props.accessibilityHint).toMatch(/quita el enlace/);
    // formatMoney separa el euro con un espacio duro (U+00A0): se normaliza para comparar el texto.
    expect(row.props.accessibilityLabel.replace(/ /g, ' ')).toBe('Luz, 62,30 €, previsto 60,00 €, enlazada a un movimiento');
  });

  it('una linea sin enlazar sigue siendo un checkbox normal, sin icono de enlace', () => {
    const onTogglePaid = jest.fn();
    render(<BudgetEntryRow entry={fixed()} onTogglePaid={onTogglePaid} />);

    fireEvent.press(screen.getByTestId('budget-entry-e1'));

    expect(onTogglePaid).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('budget-entry-link-e1')).toBeNull();
    expect(screen.getByTestId('budget-entry-e1').props.accessibilityHint).toBeUndefined();
  });
});
