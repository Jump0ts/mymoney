import { fireEvent, render, screen } from '@testing-library/react-native';
import { NewCategoryForm } from './NewCategoryForm';

jest.mock('./useCategories', () => ({
  useCreateCategory: () => ({ mutate: jest.fn(), isPending: false }),
}));

describe('NewCategoryForm', () => {
  it('expone el toggle Gasto/Ingreso como grupo de radios accesible', () => {
    render(<NewCategoryForm onDone={jest.fn()} />);

    const gasto = screen.getByLabelText('Gasto');
    const ingreso = screen.getByLabelText('Ingreso');
    expect(gasto.props.accessibilityRole).toBe('radio');
    expect(gasto.props.accessibilityState).toMatchObject({ selected: true });
    expect(ingreso.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('marca como seleccionado el color de la paleta elegido', () => {
    render(<NewCategoryForm onDone={jest.fn()} />);

    expect(screen.getByLabelText('Color 1 de 10').props.accessibilityState).toMatchObject({ selected: true });

    fireEvent.press(screen.getByLabelText('Color 2 de 10'));

    expect(screen.getByLabelText('Color 2 de 10').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('Color 1 de 10').props.accessibilityState).toMatchObject({ selected: false });
  });
});
