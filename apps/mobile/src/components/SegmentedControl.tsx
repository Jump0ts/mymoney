import { useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AnimatedPressable } from './AnimatedPressable';
import { ThemedText } from './themed-text';
import { Duration, EASE_IN_OUT } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { styles } from './SegmentedControl.styles';

export interface SegmentOption<T extends string | undefined> {
  label: string;
  value: T;
  testID?: string;
}

interface SegmentedControlProps<T extends string | undefined> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  // Nombre del grupo de opciones para el lector de pantalla ("Tipo de línea"...).
  accessibilityLabel?: string;
}

export const SegmentedControl = <T extends string | undefined>({
  options,
  value,
  onChange,
  accessibilityLabel,
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

    x.set(withTiming(layout.x, { duration: Duration.slide, easing: EASE_IN_OUT }));
    width.set(withTiming(layout.width, { duration: Duration.slide, easing: EASE_IN_OUT }));
  }, [activeIndex, layouts, width, x]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
    width: width.get(),
  }));

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <Animated.View style={[styles.pill, { backgroundColor: theme.primary }, pillStyle]} />
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <AnimatedPressable
            key={option.label}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            testID={option.testID}
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
