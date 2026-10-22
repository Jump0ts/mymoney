import { render, screen } from '@testing-library/react-native';
import { FieldError } from './FieldError';

describe('FieldError', () => {
  it('no renderiza nada si no hay mensaje', () => {
    const { toJSON } = render(<FieldError message={undefined} />);
    expect(toJSON()).toBeNull();
  });

  it('no renderiza nada con un mensaje vacio o null', () => {
    const { toJSON, rerender } = render(<FieldError message="" />);
    expect(toJSON()).toBeNull();

    rerender(<FieldError message={null} />);
    expect(toJSON()).toBeNull();
  });

  it('muestra el mensaje como alerta para que el lector de pantalla lo anuncie', () => {
    render(<FieldError message="El importe es obligatorio" />);

    const error = screen.getByText('El importe es obligatorio');
    expect(error.props.accessibilityRole).toBe('alert');
    expect(error.props.accessibilityLiveRegion).toBe('polite');
  });
});
