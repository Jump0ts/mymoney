import { fireEvent, render, screen } from '@testing-library/react-native';
import { ColorPicker } from './ColorPicker';

const colors = ['#111111', '#222222', '#333333'] as const;

describe('ColorPicker', () => {
  it('muestra un radio por color y marca el seleccionado', () => {
    render(<ColorPicker colors={colors} value="#222222" onChange={jest.fn()} />);

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByLabelText('Color 2 de 3').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('Color 1 de 3').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('nombra el grupo para el lector de pantalla', () => {
    const { rerender } = render(<ColorPicker colors={colors} value="#111111" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Color').props.accessibilityRole).toBe('radiogroup');

    rerender(<ColorPicker colors={colors} value="#111111" onChange={jest.fn()} accessibilityLabel="Color del grupo" />);
    expect(screen.getByLabelText('Color del grupo')).toBeTruthy();
  });

  it('llama a onChange con el color pulsado', () => {
    const onChange = jest.fn();
    render(<ColorPicker colors={colors} value="#111111" onChange={onChange} />);

    fireEvent.press(screen.getByLabelText('Color 3 de 3'));

    expect(onChange).toHaveBeenCalledWith('#333333');
  });
});
