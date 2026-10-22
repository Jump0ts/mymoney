import { render, screen } from '@testing-library/react-native';
import { TransactionRowSkeleton } from './TransactionRowSkeleton';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('TransactionRowSkeleton', () => {
  it('muestra varios bloques de skeleton simulando el contenido de una fila', () => {
    const { unmount } = render(<TransactionRowSkeleton />);

    expect(screen.getAllByTestId('skeleton').length).toBe(4);

    unmount();
  });
});
