import { useId } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useDragPosition } from '@/hooks/useDragPosition';
import { hsvToHex } from '@/utils/color';
import { HUE_THUMB, styles } from './HueSlider.styles';

interface HueSliderProps {
  // Matiz actual, 0..360.
  hue: number;
  onChange: (hue: number) => void;
  accessibilityLabel?: string;
}

// El arco iris completo en 7 paradas (cada 60 grados): el degradado lineal entre ellas es el del matiz.
const STOPS = [0, 60, 120, 180, 240, 300, 360];

// Paso con el que los lectores de pantalla suben y bajan el matiz.
const A11Y_STEP = 10;

export const HueSlider = ({ hue, onChange, accessibilityLabel = 'Tono' }: HueSliderProps) => {
  const gradientId = `hue-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { onLayout, gesture, x } = useDragPosition({
    testID: 'hue-slider-pan',
    onMove: (px, _py, width) => {
      if (width > 0) onChange(Math.max(0, Math.min(1, px / width)) * 360);
    },
    restAt: ({ width }) => ({ x: (Math.max(0, Math.min(360, hue)) / 360) * width, y: 0 }),
  });
  // El tirador va por transform (hilo de UI): su posicion sale del valor compartido, no del estado de React.
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() - HUE_THUMB / 2 }] }));

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const delta = event.nativeEvent.actionName === 'increment' ? A11Y_STEP : event.nativeEvent.actionName === 'decrement' ? -A11Y_STEP : 0;
    if (delta) onChange(Math.max(0, Math.min(360, hue + delta)));
  };

  return (
    <GestureDetector gesture={gesture}>
      <View
        testID="hue-slider"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: 360, now: Math.round(hue) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
        onLayout={onLayout}
        style={styles.touchArea}>
        <View pointerEvents="none" style={styles.track}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                {STOPS.map((stop) => (
                  <Stop key={stop} offset={stop / 360} stopColor={hsvToHex({ h: stop, s: 1, v: 1 })} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
          </Svg>
        </View>
        <Animated.View
          pointerEvents="none"
          testID="hue-slider-thumb"
          style={[styles.thumb, { backgroundColor: hsvToHex({ h: hue, s: 1, v: 1 }) }, thumbStyle]}
        />
      </View>
    </GestureDetector>
  );
};
