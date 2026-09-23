import { fireEvent, render, screen } from '@testing-library/react-native';
import { CalendarGrid } from './CalendarGrid';

describe('CalendarGrid', () => {
  it('muestra un dia por cada dia del mes', () => {
    render(<CalendarGrid year={2026} month={6} onSelectDate={jest.fn()} />);

    expect(screen.getByTestId('calendar-day-2026-06-01')).toBeTruthy();
    expect(screen.getByTestId('calendar-day-2026-06-30')).toBeTruthy();
    expect(screen.queryByTestId('calendar-day-2026-06-31')).toBeNull();
  });

  it('calcula bien el numero de dias en febrero, incluyendo bisiestos', () => {
    render(<CalendarGrid year={2026} month={2} onSelectDate={jest.fn()} />);
    expect(screen.getByTestId('calendar-day-2026-02-28')).toBeTruthy();
    expect(screen.queryByTestId('calendar-day-2026-02-29')).toBeNull();
  });

  it('llama a onSelectDate con la clave del dia pulsado', () => {
    const onSelectDate = jest.fn();
    render(<CalendarGrid year={2026} month={6} onSelectDate={onSelectDate} />);

    fireEvent.press(screen.getByTestId('calendar-day-2026-06-15'));

    expect(onSelectDate).toHaveBeenCalledWith('2026-06-15');
  });

  it('no permite pulsar un dia posterior a maxDate', () => {
    const onSelectDate = jest.fn();
    render(
      <CalendarGrid year={2026} month={6} onSelectDate={onSelectDate} maxDate={new Date(2026, 5, 10, 12, 0, 0)} />,
    );

    fireEvent.press(screen.getByTestId('calendar-day-2026-06-15'));

    expect(onSelectDate).not.toHaveBeenCalled();
  });

  it('etiqueta cada dia con su fecha y marca el seleccionado como tal para lectores de pantalla', () => {
    render(<CalendarGrid year={2026} month={6} selectedDate="2026-06-15" onSelectDate={jest.fn()} />);

    const selectedDay = screen.getByTestId('calendar-day-2026-06-15');
    expect(selectedDay.props.accessibilityLabel).toBe('15 de junio');
    expect(selectedDay.props.accessibilityState).toMatchObject({ selected: true });

    const otherDay = screen.getByTestId('calendar-day-2026-06-10');
    expect(otherDay.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('permite pulsar el propio maxDate', () => {
    const onSelectDate = jest.fn();
    render(
      <CalendarGrid year={2026} month={6} onSelectDate={onSelectDate} maxDate={new Date(2026, 5, 10, 12, 0, 0)} />,
    );

    fireEvent.press(screen.getByTestId('calendar-day-2026-06-10'));

    expect(onSelectDate).toHaveBeenCalledWith('2026-06-10');
  });
});
