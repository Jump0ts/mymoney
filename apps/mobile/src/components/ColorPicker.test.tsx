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

  it('sin colores guardados ni boton "+" es solo la paleta', () => {
    render(<ColorPicker colors={colors} value="#111111" onChange={jest.fn()} />);

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.queryByTestId('color-custom-toggle')).toBeNull();
  });

  describe('colores guardados', () => {
    it('salen detras de la paleta, con su codigo en la etiqueta', () => {
      render(<ColorPicker colors={colors} value="#111111" onChange={jest.fn()} savedColors={['#E91E63', '#101010']} />);

      expect(screen.getAllByRole('radio')).toHaveLength(5);
      expect(screen.getByLabelText('Color guardado #E91E63')).toBeTruthy();
      expect(screen.getByLabelText('Color guardado #101010')).toBeTruthy();
      // La paleta sigue contando solo sus colores.
      expect(screen.getByLabelText('Color 3 de 3')).toBeTruthy();
    });

    it('pulsar uno lo elige', () => {
      const onChange = jest.fn();
      render(<ColorPicker colors={colors} value="#111111" onChange={onChange} savedColors={['#E91E63']} />);

      fireEvent.press(screen.getByLabelText('Color guardado #E91E63'));

      expect(onChange).toHaveBeenCalledWith('#E91E63');
    });

    it('el elegido se marca, aunque el valor venga en minusculas', () => {
      render(<ColorPicker colors={colors} value="#e91e63" onChange={jest.fn()} savedColors={['#E91E63']} />);

      expect(screen.getByLabelText('Color guardado #E91E63').props.accessibilityState).toMatchObject({ selected: true });
      expect(screen.getByLabelText('Color 1 de 3').props.accessibilityState).toMatchObject({ selected: false });
      expect(screen.queryByTestId('color-loose')).toBeNull();
    });

    it('un color de la paleta repetido entre los guardados no se duplica como suelto', () => {
      render(<ColorPicker colors={colors} value="#222222" onChange={jest.fn()} savedColors={[]} />);

      expect(screen.queryByTestId('color-loose')).toBeNull();
    });
  });

  describe('color elegido que no esta en ninguna lista', () => {
    it('sigue viendose como elegido, con su propia muestra', () => {
      render(<ColorPicker colors={colors} value="#ABCDEF" onChange={jest.fn()} />);

      const loose = screen.getByLabelText('Color personalizado #ABCDEF');
      expect(loose.props.accessibilityState).toMatchObject({ selected: true });
      expect(screen.getAllByRole('radio')).toHaveLength(4);
    });

    it('pulsarla la vuelve a elegir', () => {
      const onChange = jest.fn();
      render(<ColorPicker colors={colors} value="#ABCDEF" onChange={onChange} />);

      fireEvent.press(screen.getByLabelText('Color personalizado #ABCDEF'));

      expect(onChange).toHaveBeenCalledWith('#ABCDEF');
    });
  });

  describe('boton "+"', () => {
    it('aparece solo si se da onCustom y es un boton, no un radio', () => {
      render(<ColorPicker colors={colors} value="#111111" onChange={jest.fn()} onCustom={jest.fn()} />);

      const add = screen.getByLabelText('Elegir otro color');
      expect(add.props.accessibilityRole).toBe('button');
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('al pulsarlo llama a onCustom y no cambia el color', () => {
      const onChange = jest.fn();
      const onCustom = jest.fn();
      render(<ColorPicker colors={colors} value="#111111" onChange={onChange} onCustom={onCustom} />);

      fireEvent.press(screen.getByLabelText('Elegir otro color'));

      expect(onCustom).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('anuncia si el selector esta abierto', () => {
      const { rerender } = render(<ColorPicker colors={colors} value="#111111" onChange={jest.fn()} onCustom={jest.fn()} />);
      expect(screen.getByLabelText('Elegir otro color').props.accessibilityState).toMatchObject({ expanded: false });

      rerender(<ColorPicker colors={colors} value="#111111" onChange={jest.fn()} onCustom={jest.fn()} customOpen />);
      expect(screen.getByLabelText('Elegir otro color').props.accessibilityState).toMatchObject({ expanded: true });
    });
  });
});
