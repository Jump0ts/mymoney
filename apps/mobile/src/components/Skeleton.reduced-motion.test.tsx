import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { act } from 'react-test-renderer';
import { Skeleton } from './Skeleton';

describe('Skeleton con Reducir movimiento activado', () => {
  it('no inicia el pulso y se queda en opacidad estatica', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    render(<Skeleton />);
    await act(async () => {});

    const flatStyle = Object.assign({}, ...[screen.getByTestId('skeleton').props.style].flat());
    expect(flatStyle.opacity).toBe(0.5);

    jest.restoreAllMocks();
  });
});
