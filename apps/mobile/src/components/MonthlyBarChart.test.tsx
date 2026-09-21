import { fireEvent, render, screen } from '@testing-library/react-native';
import { MonthlyBarChart } from './MonthlyBarChart';
import type { MonthBreakdown } from '@/features/transactions/transactions.types';

const data: MonthBreakdown[] = [
  { month: '2026-06', type: 'INCOME', total: 1800 },
  { month: '2026-06', type: 'EXPENSE', total: 900 },
  { month: '2026-07', type: 'INCOME', total: 1800 },
  { month: '2026-07', type: 'EXPENSE', total: 300 },
];

describe('MonthlyBarChart', () => {
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
});
