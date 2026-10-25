import { render, screen } from '@testing-library/react-native';
import { CategoryGroupSkeleton } from './CategoryGroupSkeleton';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CategoryGroupSkeleton', () => {
  it('muestra un titulo y varias filas de skeleton', () => {
    const { unmount } = render(<CategoryGroupSkeleton />);

    // 1 titulo + 3 filas x (dot + nombre) = 7 bloques de skeleton
    expect(screen.getAllByTestId('skeleton').length).toBe(7);

    unmount();
  });
});
