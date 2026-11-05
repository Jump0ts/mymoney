import { fireEvent, render, screen } from '@testing-library/react-native';
import { MonthlyBarChart } from './MonthlyBarChart';
import type { MonthBreakdown } from '@/features/transactions/transactions.types';

const data: MonthBreakdown[] = [
  { month: '2026-06', type: 'INCOME', total: 1800 },
  { month: '2026-06', type: 'EXPENSE', total: 900 },
  { month: '2026-07', type: 'INCOME', total: 1800 },
  { month: '2026-07', type: 'EXPENSE', total: 300 },
];

const barHeight = (testID: string) => {
  const style = Object.assign({}, ...[screen.getByTestId(testID).props.style].flat().filter(Boolean));
  return style.height as string;
};

describe('MonthlyBarChart', () => {
  it('la barra de gastos de un mes es lo gastado neto de reembolsos', () => {
    render(<MonthlyBarChart data={data} />);

    // Jun: 900 de gasto sobre un maximo de 1800 de ingresos.
    expect(barHeight('monthly-bar-expense-2026-06')).toBe('50%');
  });

  it('un mes con mas reembolsos que gastos (total negativo) deja la barra en 0 en vez de salirse', () => {
    render(
      <MonthlyBarChart
        data={[
          { month: '2026-08', type: 'INCOME', total: 1800 },
          { month: '2026-08', type: 'EXPENSE', total: -40 },
        ]}
      />,
    );

    expect(barHeight('monthly-bar-expense-2026-08')).toBe('0%');
    expect(barHeight('monthly-bar-income-2026-08')).toBe('100%');
  });

  it('muestra un mensaje si no hay datos', () => {
    render(<MonthlyBarChart data={[]} />);
    expect(screen.getByText('Sin movimientos en este periodo.')).toBeTruthy();
  });

  it('muestra una columna por cada mes presente en los datos', () => {
    render(<MonthlyBarChart data={data} />);

    expect(screen.getByText('Jun')).toBeTruthy();
    expect(screen.getByText('Jul')).toBeTruthy();
  });

  it('no son pulsables si no se pasa onSelectMonth', () => {
    render(<MonthlyBarChart data={data} />);

    expect(screen.queryByTestId('month-bar-2026-06')).toBeNull();
  });

  it('llama a onSelectMonth con el mes correspondiente al pulsar una columna', () => {
    const onSelectMonth = jest.fn();
    render(<MonthlyBarChart data={data} selectedMonth="2026-07" onSelectMonth={onSelectMonth} />);

    fireEvent.press(screen.getByTestId('month-bar-2026-06'));

    expect(onSelectMonth).toHaveBeenCalledWith('2026-06');
  });

  it('etiqueta cada columna con el mes y marca cual esta seleccionada', () => {
    render(<MonthlyBarChart data={data} selectedMonth="2026-07" onSelectMonth={jest.fn()} />);

    const selected = screen.getByTestId('month-bar-2026-07');
    expect(selected.props.accessibilityLabel).toBe('Julio de 2026');
    expect(selected.props.accessibilityState).toMatchObject({ selected: true });

    const other = screen.getByTestId('month-bar-2026-06');
    expect(other.props.accessibilityState).toMatchObject({ selected: false });
  });
});
