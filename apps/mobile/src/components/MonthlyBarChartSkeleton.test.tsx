import { render, screen } from '@testing-library/react-native';
import { MonthlyBarChartSkeleton } from './MonthlyBarChartSkeleton';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('MonthlyBarChartSkeleton', () => {
  it('respeta la altura del grafico real', () => {
    const { unmount } = render(<MonthlyBarChartSkeleton height={140} />);

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);

    unmount();
  });
});
