import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { LEGEND_MIN_WIDTH } from './DonutChart.constants';
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

describe('DonutChartLegendSkeleton - mismo reparto que la leyenda real', () => {
  it('pide el mismo ancho minimo para no saltar al cargar', () => {
    const { toJSON } = render(<DonutChartLegendSkeleton />);
    const root = toJSON() as unknown as { props: { style: object } };
    const style = StyleSheet.flatten(root.props.style) as { flexBasis?: number; flexGrow?: number };

    expect(style.flexBasis).toBe(LEGEND_MIN_WIDTH);
    expect(style.flexGrow).toBe(1);
  });
});
