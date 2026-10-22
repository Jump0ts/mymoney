import { fireEvent, render, screen } from '@testing-library/react-native';
import { CategoryGroup } from './CategoryGroup';
import type { Category } from './categories.types';

const categories: Category[] = [
  { id: 'cat-1', name: 'Alimentación', icon: 'shopping-cart', color: '#E67E22', type: 'EXPENSE' },
  { id: 'cat-2', name: 'Transporte', icon: 'car', color: '#3498DB', type: 'EXPENSE' },
];

describe('CategoryGroup', () => {
  it('no renderiza nada si no hay categorias', () => {
    const { toJSON } = render(<CategoryGroup title="Gastos" categories={[]} onDelete={jest.fn()} />);

    expect(toJSON()).toBeNull();
  });

  it('muestra el titulo y el nombre de cada categoria', () => {
    render(<CategoryGroup title="Gastos" categories={categories} onDelete={jest.fn()} />);

    expect(screen.getByText('GASTOS')).toBeTruthy();
    expect(screen.getByText('Alimentación')).toBeTruthy();
    expect(screen.getByText('Transporte')).toBeTruthy();
  });

  it('llama a onDelete con la categoria correcta al pulsar su icono de borrar', () => {
    const onDelete = jest.fn();
    render(<CategoryGroup title="Gastos" categories={categories} onDelete={onDelete} />);

    fireEvent.press(screen.getByTestId('category-group-delete-cat-2'));

    expect(onDelete).toHaveBeenCalledWith(categories[1]);
  });

  it('tiene accessibilityLabel con el nombre de la categoria en el boton de borrar', () => {
    render(<CategoryGroup title="Gastos" categories={categories} onDelete={jest.fn()} />);

    expect(screen.getByLabelText('Borrar Transporte')).toBeTruthy();
  });
});
