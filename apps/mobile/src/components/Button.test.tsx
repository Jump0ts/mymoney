import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('muestra la etiqueta y llama a onPress al pulsar', () => {
    const onPress = jest.fn();
    render(<Button label="Guardar" onPress={onPress} />);

    expect(screen.getByText('Guardar')).toBeTruthy();

    fireEvent.press(screen.getByText('Guardar'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('muestra un indicador de carga en vez de la etiqueta cuando loading es true', () => {
    render(<Button label="Guardar" loading onPress={jest.fn()} />);

    expect(screen.queryByText('Guardar')).toBeNull();
  });

  it('mantiene el nombre accesible aunque este cargando (sin texto visible)', () => {
    render(<Button label="Guardar" loading onPress={jest.fn()} />);

    const button = screen.getByLabelText('Guardar');
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });

  it('no llama a onPress si esta deshabilitado', () => {
    const onPress = jest.fn();
    render(<Button label="Guardar" disabled onPress={onPress} />);

    fireEvent.press(screen.getByText('Guardar'));

    expect(onPress).not.toHaveBeenCalled();
  });
});
