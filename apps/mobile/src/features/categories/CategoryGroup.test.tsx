import { fireEvent, render, screen } from '@testing-library/react-native';
import { CategoryGroup } from './CategoryGroup';
import type { Category } from './categories.types';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => mockScheme }));

// El formulario real tiene sus propios tests: aqui solo importa que ocupe el lugar de la fila editada.
jest.mock('./CategoryForm', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    CategoryForm: ({ category, onDone }: { category: { name: string }; onDone: () => void }) => (
      <Text testID="category-form-stub" onPress={onDone}>{`editor de ${category.name}`}</Text>
    ),
  };
});

const dotColor = (id: string) =>
  Object.assign({}, ...[screen.getByTestId(`category-dot-${id}`).props.style].flat(Infinity).filter(Boolean)).backgroundColor;

const categories: Category[] = [
  { id: 'cat-1', name: 'Alimentación', icon: 'shopping-cart', color: '#E67E22', type: 'EXPENSE' },
  { id: 'cat-2', name: 'Transporte', icon: 'car', color: '#3498DB', type: 'EXPENSE' },
];

const renderGroup = (props: Partial<React.ComponentProps<typeof CategoryGroup>> = {}) => {
  const handlers = { onDelete: jest.fn(), onEdit: jest.fn(), onDoneEditing: jest.fn() };
  render(<CategoryGroup title="Gastos" categories={categories} {...handlers} {...props} />);
  return handlers;
};

describe('CategoryGroup', () => {
  it('no renderiza nada si no hay categorias', () => {
    const { toJSON } = render(
      <CategoryGroup title="Gastos" categories={[]} onDelete={jest.fn()} onEdit={jest.fn()} onDoneEditing={jest.fn()} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('muestra el titulo y el nombre de cada categoria', () => {
    renderGroup();

    expect(screen.getByText('GASTOS')).toBeTruthy();
    expect(screen.getByText('Alimentación')).toBeTruthy();
    expect(screen.getByText('Transporte')).toBeTruthy();
  });

  it('llama a onDelete con la categoria correcta al pulsar su icono de borrar', () => {
    const { onDelete } = renderGroup();

    fireEvent.press(screen.getByTestId('category-group-delete-cat-2'));

    expect(onDelete).toHaveBeenCalledWith(categories[1]);
  });

  it('tiene accessibilityLabel con el nombre de la categoria en el boton de borrar', () => {
    renderGroup();

    expect(screen.getByLabelText('Borrar Transporte')).toBeTruthy();
  });

  describe('editar', () => {
    it('cada fila tiene un boton de editar con el nombre de su categoria', () => {
      renderGroup();

      expect(screen.getByLabelText('Editar Alimentación').props.accessibilityRole).toBe('button');
      expect(screen.getByLabelText('Editar Transporte')).toBeTruthy();
    });

    it('pulsarlo llama a onEdit con la categoria correcta y no a onDelete', () => {
      const { onEdit, onDelete } = renderGroup();

      fireEvent.press(screen.getByTestId('category-group-edit-cat-2'));

      expect(onEdit).toHaveBeenCalledWith(categories[1]);
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('la fila que se edita pasa a ser el formulario, y las demas siguen como filas', () => {
      renderGroup({ editingId: 'cat-1' });

      expect(screen.getByText('editor de Alimentación')).toBeTruthy();
      // La fila editada ya no tiene sus botones, ni su nombre suelto.
      expect(screen.queryByTestId('category-group-edit-cat-1')).toBeNull();
      expect(screen.queryByTestId('category-group-delete-cat-1')).toBeNull();
      expect(screen.queryByText('Alimentación')).toBeNull();
      // La otra sigue igual.
      expect(screen.getByText('Transporte')).toBeTruthy();
      expect(screen.getByTestId('category-group-edit-cat-2')).toBeTruthy();
    });

    it('sin categoria en edicion no hay formularios', () => {
      renderGroup({ editingId: null });

      expect(screen.queryByTestId('category-form-stub')).toBeNull();
    });

    it('un id de otro grupo no abre nada aqui', () => {
      renderGroup({ editingId: 'cat-de-otro-grupo' });

      expect(screen.queryByTestId('category-form-stub')).toBeNull();
      expect(screen.getByText('Alimentación')).toBeTruthy();
    });

    it('terminar de editar avisa con onDoneEditing', () => {
      const { onDoneEditing } = renderGroup({ editingId: 'cat-1' });

      fireEvent.press(screen.getByTestId('category-form-stub'));

      expect(onDoneEditing).toHaveBeenCalledTimes(1);
    });
  });

  describe('color de cada categoria', () => {
    afterEach(() => {
      mockScheme = 'light';
    });

    it('el punto lleva el color de la categoria', () => {
      renderGroup();

      expect(dotColor('cat-1')).toBe('#E67E22');
      expect(dotColor('cat-2')).toBe('#3498DB');
    });

    it('un color propio casi negro se aclara en modo oscuro, y un casi blanco se oscurece en modo claro', () => {
      const custom: Category[] = [
        { id: 'dark', name: 'Oscura', icon: 'tag', color: '#101010', type: 'EXPENSE' },
        { id: 'pale', name: 'Palida', icon: 'tag', color: '#FFFFF0', type: 'EXPENSE' },
      ];
      const group = (
        <CategoryGroup title="Gastos" categories={custom} onDelete={jest.fn()} onEdit={jest.fn()} onDoneEditing={jest.fn()} />
      );
      const { unmount } = render(group);
      expect(dotColor('dark')).toBe('#101010');
      expect(dotColor('pale')).not.toBe('#FFFFF0');
      unmount();

      mockScheme = 'dark';
      render(group);
      expect(dotColor('dark')).not.toBe('#101010');
      expect(dotColor('pale')).toBe('#FFFFF0');
    });
  });
});
