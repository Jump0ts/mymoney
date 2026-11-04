import { fireEvent, render, screen } from '@testing-library/react-native';
import { CategoryGroup } from './CategoryGroup';
import type { Category } from './categories.types';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => mockScheme }));

const dotColor = (id: string) =>
  Object.assign({}, ...[screen.getByTestId(`category-dot-${id}`).props.style].flat(Infinity).filter(Boolean)).backgroundColor;

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

  describe('color de cada categoria', () => {
    afterEach(() => {
      mockScheme = 'light';
    });

    it('el punto lleva el color de la categoria', () => {
      render(<CategoryGroup title="Gastos" categories={categories} onDelete={jest.fn()} />);

      expect(dotColor('cat-1')).toBe('#E67E22');
      expect(dotColor('cat-2')).toBe('#3498DB');
    });

    it('un color propio casi negro se aclara en modo oscuro, y un casi blanco se oscurece en modo claro', () => {
      const custom: Category[] = [
        { id: 'dark', name: 'Oscura', icon: 'tag', color: '#101010', type: 'EXPENSE' },
        { id: 'pale', name: 'Palida', icon: 'tag', color: '#FFFFF0', type: 'EXPENSE' },
      ];
      const { unmount } = render(<CategoryGroup title="Gastos" categories={custom} onDelete={jest.fn()} />);
      expect(dotColor('dark')).toBe('#101010');
      expect(dotColor('pale')).not.toBe('#FFFFF0');
      unmount();

      mockScheme = 'dark';
      render(<CategoryGroup title="Gastos" categories={custom} onDelete={jest.fn()} />);
      expect(dotColor('dark')).not.toBe('#101010');
      expect(dotColor('pale')).toBe('#FFFFF0');
    });
  });
});
