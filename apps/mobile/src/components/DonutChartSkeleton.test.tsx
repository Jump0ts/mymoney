import { render, screen } from '@testing-library/react-native';
import { DonutChartLegendSkeleton, DonutChartSkeleton } from './DonutChartSkeleton';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('DonutChartSkeleton', () => {
  it('ocupa el mismo tamaño que el DonutChart real por defecto', () => {
    const { unmount } = render(<DonutChartSkeleton />);

    const skeletons = screen.getAllByTestId('skeleton');
    const flatStyle = Object.assign({}, ...[skeletons[0].props.style].flat());
    expect(flatStyle.width).toBe(176);
    expect(flatStyle.height).toBe(176);

    unmount();
  });
});

describe('DonutChartLegendSkeleton', () => {
  it('muestra varias lineas de leyenda', () => {
    const { unmount } = render(<DonutChartLegendSkeleton />);

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(1);

    unmount();
  });
});
