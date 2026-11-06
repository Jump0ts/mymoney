import Animated, { useReducedMotion } from 'react-native-reanimated';
import { type DimensionValue, type ViewStyle } from 'react-native';

import { Duration } from '@/constants/motion';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

// Latido del skeleton: sube de 0,5 a 1 y vuelve. Es una animacion CSS de Reanimated (como las pulsaciones), asi que
// corre fuera del hilo de JS tambien en la web, donde el `Animated` de React Native no tiene driver nativo.
const pulseKeyframes = { from: { opacity: 0.5 }, to: { opacity: 1 } };

const pulseStyle = {
  animationName: pulseKeyframes,
  animationDuration: Duration.pulse,
  animationIterationCount: 'infinite' as const,
  animationDirection: 'alternate' as const,
  animationTimingFunction: 'ease-in-out' as const,
};

export const Skeleton = ({ width = '100%', height = 16, borderRadius = Radius.small, style }: SkeletonProps) => {
  const theme = useTheme();
  // Con Reducir movimiento activado se queda quieto en vez de latir en bucle.
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      testID="skeleton"
      style={[
        { width, height, borderRadius, backgroundColor: theme.backgroundSelected, opacity: 0.5 },
        style,
        !reduceMotion && pulseStyle,
      ]}
    />
  );
};
