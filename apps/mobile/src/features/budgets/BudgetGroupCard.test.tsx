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
  paid,
  position: 0,
});

const group = (entries: BudgetEntry[]): BudgetGroup => ({
  id: 'g1',
  name: 'Hogar',
  color: '#4F5DFF',
  limit: null,
  isRemainder: false,
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

  it('el grupo del sobrante muestra lo disponible y lo que queda tras sus lineas', () => {
    render(
      <BudgetGroupCard
        group={{ ...group([entry('a', '35.00', true)]), isRemainder: true }}
        onTogglePaid={jest.fn()}
        remainderAvailable={300}
      />,
    );

    expect(screen.getByText(/Disponible.*300,00/)).toBeTruthy();
    expect(screen.getByText(/Quedan.*265,00/)).toBeTruthy();
  });

  it('sin limite no muestra la barra de limite', () => {
    render(<BudgetGroupCard group={group([entry('a', '100.00', false)])} onTogglePaid={jest.fn()} />);

    expect(screen.queryByTestId('budget-limit-g1')).toBeNull();
  });

  it('con limite muestra cuanto se lleva consumido con lo previsto', () => {
    render(
      <BudgetGroupCard
        group={{ ...group([entry('a', '350.00', false), entry('b', '100.00', true)]), limit: '600.00' }}
        onTogglePaid={jest.fn()}
      />,
    );

    expect(screen.getByTestId('budget-limit-g1')).toBeTruthy();
    expect(screen.getByText(/Quedan.*150,00/)).toBeTruthy();
  });
});
