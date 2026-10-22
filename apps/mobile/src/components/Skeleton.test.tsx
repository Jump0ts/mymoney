import { render, screen } from '@testing-library/react-native';
import { Skeleton } from './Skeleton';

// La animacion de pulso usa timers reales si no se mockean, ralentizando el test.
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Skeleton', () => {
  it('se renderiza con el ancho y alto indicados', () => {
    const { unmount } = render(<Skeleton width={120} height={20} />);

    const node = screen.getByTestId('skeleton');
    const flatStyle = Object.assign({}, ...[node.props.style].flat());
    expect(flatStyle.width).toBe(120);
    expect(flatStyle.height).toBe(20);

    unmount();
  });

  it('usa 100% de ancho y 16 de alto por defecto', () => {
    const { unmount } = render(<Skeleton />);

    const node = screen.getByTestId('skeleton');
    const flatStyle = Object.assign({}, ...[node.props.style].flat());
    expect(flatStyle.width).toBe('100%');
    expect(flatStyle.height).toBe(16);

    unmount();
  });
});
