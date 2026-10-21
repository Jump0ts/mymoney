import { render, screen } from '@testing-library/react-native';
import type { BudgetEntry, BudgetGroup } from './budgets.types';
import { BudgetLimitBar } from './BudgetLimitBar';

const entry = (id: string, amount: string): BudgetEntry => ({
  id,
  groupId: 'g1',
  itemId: null,
  name: id,
  amount,
  paid: false,
  position: 0,
});

const group = (limit: string | null, amounts: string[]): BudgetGroup => ({
  id: 'g1',
  name: 'Gastos fijos',
  color: '#4F5DFF',
  limit,
  isRemainder: false,
  position: 0,
  entries: amounts.map((amount, index) => entry(`e${index}`, amount)),
});

describe('BudgetLimitBar (grupo que recibe lo que sobra)', () => {
  const remainder = (amounts: string[]): BudgetGroup => ({ ...group(null, amounts), isRemainder: true });

  it('muestra el disponible aunque no tenga limite y lo que queda', () => {
    render(<BudgetLimitBar group={remainder(['30.00', '20.00'])} remainderAvailable={200} />);

    expect(screen.getByText(/Disponible.*200,00/)).toBeTruthy();
    expect(screen.getByText(/Quedan.*150,00/)).toBeTruthy();
    expect(screen.queryByText(/Límite/)).toBeNull();
  });

  it('avisa cuando lo gastado supera el disponible', () => {
    render(<BudgetLimitBar group={remainder(['120.00'])} remainderAvailable={100} />);

    expect(screen.getByText(/Te pasas.*20,00/)).toBeTruthy();
  });

  it('se anuncia como disponible y el valor no baja de 0 con disponible negativo', () => {
    render(<BudgetLimitBar group={remainder(['10.00'])} remainderAvailable={-50} />);
    const bar = screen.getByTestId('budget-limit-g1');

    expect(bar.props.accessibilityLabel).toMatch(/^Disponible de Gastos fijos/);
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 0, now: 0 });
  });
});

describe('BudgetLimitBar', () => {
  it('no pinta nada si el grupo no tiene limite', () => {
    render(<BudgetLimitBar group={group(null, ['100.00'])} />);

    expect(screen.queryByTestId('budget-limit-g1')).toBeNull();
  });

  it('muestra el limite y lo que queda segun lo previsto en las lineas', () => {
    render(<BudgetLimitBar group={group('600.00', ['350.00', '100.00'])} />);

    expect(screen.getByText(/Límite.*600,00/)).toBeTruthy();
    expect(screen.getByText(/Quedan.*150,00/)).toBeTruthy();
  });

  it('avisa cuando te pasas del limite', () => {
    render(<BudgetLimitBar group={group('600.00', ['500.00', '120.00'])} />);

    expect(screen.getByText(/Te pasas.*20,00/)).toBeTruthy();
    expect(screen.queryByText(/Quedan/)).toBeNull();
  });

  it('se expone como barra de progreso con su valor', () => {
    render(<BudgetLimitBar group={group('600.00', ['150.00'])} />);
    const bar = screen.getByTestId('budget-limit-g1');

    expect(bar.props.accessibilityRole).toBe('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 600, now: 150 });
  });

  it('el valor de la barra no supera el limite aunque te pases', () => {
    render(<BudgetLimitBar group={group('100.00', ['250.00'])} />);

    expect(screen.getByTestId('budget-limit-g1').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100 });
  });

  it('anuncia tambien lo que queda o lo que te pasas, no solo el uso', () => {
    const { rerender } = render(<BudgetLimitBar group={group('600.00', ['150.00'])} />);
    expect(screen.getByTestId('budget-limit-g1').props.accessibilityLabel).toMatch(
      /Gastos fijos.*150,00.*600,00.*Quedan.*450,00/,
    );

    rerender(<BudgetLimitBar group={group('600.00', ['650.00'])} />);
    expect(screen.getByTestId('budget-limit-g1').props.accessibilityLabel).toMatch(/Te pasas.*50,00/);
  });
});
