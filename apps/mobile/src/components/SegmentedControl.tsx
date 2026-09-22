import { useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AnimatedPressable } from './AnimatedPressable';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { styles } from './SegmentedControl.styles';

export interface SegmentOption<T extends string | undefined> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string | undefined> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

// Ease-in-out: la pastilla se mueve DENTRO de la pantalla, no entra ni sale de ella.
const PILL_EASING = Easing.bezier(0.77, 0, 0.175, 1);
const PILL_DURATION = 220;

export const SegmentedControl = <T extends string | undefined>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) => {
  const theme = useTheme();
  const [layouts, setLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const measured = useRef(false);

  const activeIndex = options.findIndex((option) => option.value === value);

  useEffect(() => {
    const layout = layouts[activeIndex];
    if (!layout) return;

    if (!measured.current) {
      // Primera medicion: la pastilla aparece ya en su sitio, sin deslizarse desde 0.
      x.set(layout.x);
      width.set(layout.width);
      measured.current = true;
      return;
    }

    x.set(withTiming(layout.x, { duration: PILL_DURATION, easing: PILL_EASING }));
    width.set(withTiming(layout.width, { duration: PILL_DURATION, easing: PILL_EASING }));
  }, [activeIndex, layouts, width, x]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
    width: width.get(),
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <Animated.View style={[styles.pill, { backgroundColor: theme.primary }, pillStyle]} />
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <AnimatedPressable
            key={option.label}
            onLayout={(event: LayoutChangeEvent) => {
              const { x: layoutX, width: layoutWidth } = event.nativeEvent.layout;
              setLayouts((prev) => ({ ...prev, [index]: { x: layoutX, width: layoutWidth } }));
            }}
            onPress={() => onChange(option.value)}
            style={styles.segment}>
            <ThemedText type="small" style={{ color: active ? theme.primaryText : theme.text }}>
              {option.label}
            </ThemedText>
          </AnimatedPressable>
        );
      })}
    </View>
  );
};
