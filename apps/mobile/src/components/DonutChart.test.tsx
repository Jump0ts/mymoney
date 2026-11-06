import { render, screen } from '@testing-library/react-native';
import { arcDash, DonutChart, type DonutSlice } from './DonutChart';

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

describe('arcDash', () => {
  it('pinta lo dibujado y deja el resto de la circunferencia como hueco', () => {
    expect(arcDash(25, 100)).toBe('25 75');
    expect(arcDash(0, 100)).toBe('0 100');
  });

  it('nunca devuelve un hueco negativo (coma flotante al llenar la circunferencia)', () => {
    expect(arcDash(100.0000001, 100)).toBe('100.0000001 0');
  });
});

describe('DonutChart - arcos', () => {
  it('dibuja un arco por categoria, con su identificador', () => {
    const { unmount } = render(<DonutChart data={data} />);

    expect(screen.getByTestId('donut-arc-Alimentación')).toBeTruthy();
    expect(screen.getByTestId('donut-arc-Compras')).toBeTruthy();

    unmount();
  });

  it('al cambiar de datos conserva los arcos que siguen, anade los nuevos y quita los que ya no estan', () => {
    const { rerender, unmount } = render(<DonutChart data={data} />);

    rerender(
      <DonutChart
        data={[
          { label: 'Alimentación', value: 80, color: '#E67E22' },
          { label: 'Ocio', value: 20, color: '#3498DB' },
        ]}
      />,
    );

    expect(screen.getByTestId('donut-arc-Alimentación')).toBeTruthy();
    expect(screen.getByTestId('donut-arc-Ocio')).toBeTruthy();
    expect(screen.queryByTestId('donut-arc-Compras')).toBeNull();

    unmount();
  });

  it('sin gastos no dibuja ningun arco', () => {
    const { unmount } = render(<DonutChart data={[]} />);

    expect(screen.queryByTestId(/donut-arc-/)).toBeNull();

    unmount();
  });
});
