import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { BudgetEntry, BudgetGroup } from './budgets.types';
import { BudgetGroupCard } from './BudgetGroupCard';

const entry = (id: string, amount: string, paid: boolean): BudgetEntry => ({
  id,
  groupId: 'g1',
  itemId: null,
  name: `Linea ${id}`,
  amount,
  kind: 'FIXED',
  categoryId: null,
  paid,
  position: 0,
  spent: null,
});

const group = (entries: BudgetEntry[]): BudgetGroup => ({
  id: 'g1',
  name: 'Hogar',
  color: '#4F5DFF',
  position: 0,
  entries,
});

describe('BudgetGroupCard', () => {
  it('muestra el nombre del grupo como encabezado y sus lineas', () => {
    render(<BudgetGroupCard group={group([entry('a', '100.00', false), entry('b', '50.00', true)])} onTogglePaid={jest.fn()} />);

    expect(screen.getByText('Hogar').props.accessibilityRole).toBe('header');
    expect(screen.getByText('Linea a')).toBeTruthy();
    expect(screen.getByText('Linea b')).toBeTruthy();
  });

  it('suma lo previsto y lo pagado del grupo', () => {
    render(<BudgetGroupCard group={group([entry('a', '100.00', false), entry('b', '50.00', true)])} onTogglePaid={jest.fn()} />);

    expect(screen.getByLabelText(/^Previsto: 150,00/)).toBeTruthy();
    expect(screen.getByLabelText(/^Pagado: 50,00/)).toBeTruthy();
  });

  it('usa un color de texto legible sobre el color del grupo', () => {
    const { rerender } = render(<BudgetGroupCard group={group([])} onTogglePaid={jest.fn()} />);
    const colorOf = () => StyleSheet.flatten(screen.getByText('Hogar').props.style).color;

    expect(colorOf()).toBe('#FFFFFF');

    rerender(<BudgetGroupCard group={{ ...group([]), color: '#F5A623' }} onTogglePaid={jest.fn()} />);
    expect(colorOf()).toBe('#000000');
  });

  it('indica que no hay lineas si el grupo esta vacio este mes', () => {
    render(<BudgetGroupCard group={group([])} onTogglePaid={jest.fn()} />);

    expect(screen.getByText('Sin líneas este mes.')).toBeTruthy();
  });
});
