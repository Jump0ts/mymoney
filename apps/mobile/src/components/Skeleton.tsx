import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, type DimensionValue, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = ({ width = '100%', height = 16, borderRadius = Radius.small, style }: SkeletonProps) => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Animated (RN core, no Reanimated) no respeta Reducir movimiento por si
    // solo: se comprueba a mano y, si esta activado, se deja el skeleton
    // estatico en vez de pulsando en bucle.
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled || reduceMotion) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });

    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      testID="skeleton"
      style={[
        { width, height, borderRadius, backgroundColor: theme.backgroundSelected, opacity },
        style,
      ]}
    />
  );
};
