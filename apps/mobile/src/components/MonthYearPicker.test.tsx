import { fireEvent, render, screen } from '@testing-library/react-native';
import { MonthYearPicker } from './MonthYearPicker';
import { getCurrentYearMonth } from '@/utils/date';

describe('MonthYearPicker', () => {
  it('muestra el mes y el año formateados', () => {
    render(<MonthYearPicker year={2026} month={6} onChange={jest.fn()} />);

    expect(screen.getByText('Junio de 2026')).toBeTruthy();
  });

  it('llama a onChange con el mes anterior al pulsar la flecha izquierda', () => {
    const onChange = jest.fn();
    render(<MonthYearPicker year={2026} month={6} onChange={onChange} />);

    fireEvent.press(screen.getByTestId('month-picker-prev'));

    expect(onChange).toHaveBeenCalledWith(2026, 5);
  });

  it('retrocede de año al pulsar atras estando en enero', () => {
    const onChange = jest.fn();
    render(<MonthYearPicker year={2026} month={1} onChange={onChange} />);

    fireEvent.press(screen.getByTestId('month-picker-prev'));

    expect(onChange).toHaveBeenCalledWith(2025, 12);
  });

  it('avanza de año al pulsar siguiente estando en diciembre', () => {
    const past = getCurrentYearMonth();
    const onChange = jest.fn();
    // Nos situamos en diciembre de un año ya pasado para que "siguiente" no este deshabilitado.
    render(<MonthYearPicker year={past.year - 1} month={12} onChange={onChange} />);

    fireEvent.press(screen.getByTestId('month-picker-next'));

    expect(onChange).toHaveBeenCalledWith(past.year, 1);
  });

  it('deshabilita la flecha de siguiente mes al llegar al mes actual', () => {
    const current = getCurrentYearMonth();
    const onChange = jest.fn();
    render(<MonthYearPicker year={current.year} month={current.month} onChange={onChange} />);

    fireEvent.press(screen.getByTestId('month-picker-next'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
