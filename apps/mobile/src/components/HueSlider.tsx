import { useId } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';
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
  const { size, onLayout, responderProps } = useDragPosition((x, _y, width) => {
    if (width > 0) onChange(Math.max(0, Math.min(1, x / width)) * 360);
  });

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const delta = event.nativeEvent.actionName === 'increment' ? A11Y_STEP : event.nativeEvent.actionName === 'decrement' ? -A11Y_STEP : 0;
    if (delta) onChange(Math.max(0, Math.min(360, hue + delta)));
  };

  const thumbLeft = (Math.max(0, Math.min(360, hue)) / 360) * size.width - HUE_THUMB / 2;

  return (
    <View
      testID="hue-slider"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 360, now: Math.round(hue) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
      onLayout={onLayout}
      style={styles.touchArea}
      {...responderProps}>
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
      <View
        pointerEvents="none"
        testID="hue-slider-thumb"
        style={[styles.thumb, { left: thumbLeft, backgroundColor: hsvToHex({ h: hue, s: 1, v: 1 }) }]}
      />
    </View>
  );
};
