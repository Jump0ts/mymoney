import { render, screen } from '@testing-library/react-native';
import { CategoryPill } from './CategoryPill';
import type { Category } from '@/features/categories/categories.types';

const category: Category = {
  id: '1',
  name: 'Alimentación',
  icon: 'shopping-cart',
  color: '#E67E22',
  type: 'EXPENSE',
};

describe('CategoryPill', () => {
  it('muestra el nombre de la categoría', () => {
    render(<CategoryPill category={category} />);
    expect(screen.getByText('Alimentación')).toBeTruthy();
  });
});
