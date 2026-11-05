import { render, screen } from '@testing-library/react-native';
import { CategoryPill } from './CategoryPill';
import type { Category } from '@/features/categories/categories.types';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => mockScheme }));

const category: Category = {
  id: '1',
  name: 'Alimentación',
  icon: 'shopping-cart',
  color: '#E67E22',
  type: 'EXPENSE',
};

const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

afterEach(() => {
  mockScheme = 'light';
});

describe('CategoryPill', () => {
  it('muestra el nombre de la categoría', () => {
    render(<CategoryPill category={category} />);
    expect(screen.getByText('Alimentación')).toBeTruthy();
  });

  it('pinta el texto con el color de la categoria', () => {
    render(<CategoryPill category={category} />);

    expect(flat(screen.getByText('Alimentación').props.style).color).toBe('#E67E22');
  });

  it('un color casi negro se aclara en modo oscuro para que el nombre no desaparezca', () => {
    mockScheme = 'dark';
    render(<CategoryPill category={{ ...category, color: '#101010' }} />);

    expect(flat(screen.getByText('Alimentación').props.style).color).not.toBe('#101010');
  });

  it('el mismo color casi negro se deja como es en modo claro', () => {
    render(<CategoryPill category={{ ...category, color: '#101010' }} />);

    expect(flat(screen.getByText('Alimentación').props.style).color).toBe('#101010');
  });

  it('un casi blanco se oscurece en modo claro', () => {
    render(<CategoryPill category={{ ...category, color: '#FFFFF0' }} />);

    expect(flat(screen.getByText('Alimentación').props.style).color).not.toBe('#FFFFF0');
  });
});
