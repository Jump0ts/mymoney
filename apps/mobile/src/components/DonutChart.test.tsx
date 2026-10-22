import { render, screen } from '@testing-library/react-native';
import { DonutChart, type DonutSlice } from './DonutChart';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const data: DonutSlice[] = [
  { label: 'Alimentación', value: 60, color: '#E67E22' },
  { label: 'Compras', value: 40, color: '#E91E8C' },
];

describe('DonutChart', () => {
  it('muestra el label y el sublabel centrales', () => {
    const { unmount } = render(<DonutChart data={data} centerLabel="100,00 €" centerSubLabel="total" />);

    expect(screen.getByText('100,00 €')).toBeTruthy();
    expect(screen.getByText('total')).toBeTruthy();

    unmount();
  });

  it('no revienta si no hay gastos (total 0)', () => {
    const { unmount } = render(<DonutChart data={[]} centerLabel="0,00 €" centerSubLabel="total" />);

    expect(screen.getByText('0,00 €')).toBeTruthy();

    unmount();
  });

  it('re-renderiza sin errores al cambiar de datos (cambio de mes)', () => {
    const { rerender, unmount } = render(<DonutChart data={data} centerLabel="100,00 €" />);

    const nextData: DonutSlice[] = [{ label: 'Transporte', value: 30, color: '#3498DB' }];
    rerender(<DonutChart data={nextData} centerLabel="30,00 €" />);

    expect(screen.getByText('30,00 €')).toBeTruthy();

    unmount();
  });
});
