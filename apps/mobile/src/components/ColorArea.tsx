import { useId } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useDragPosition } from '@/hooks/useDragPosition';
import { areaToSv, hsvToHex, svToArea } from '@/utils/color';
import { AREA_THUMB, styles } from './ColorArea.styles';

interface ColorAreaProps {
  hue: number; // 0..360
  saturation: number; // 0..1
  value: number; // 0..1 (brillo)
  onChange: (next: { s: number; v: number }) => void;
  accessibilityLabel?: string;
}

// Paso con el que los lectores de pantalla mueven la saturacion y el brillo.
const A11Y_STEP = 0.05;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// El cuadrado clasico de un selector de color: saturacion de izquierda a derecha y brillo de abajo a arriba, sobre
// el matiz elegido. Se pinta con tres capas: el matiz puro, un degradado de blanco (saturacion) y uno de negro (brillo).
export const ColorArea = ({ hue, saturation, value, onChange, accessibilityLabel = 'Saturación y brillo' }: ColorAreaProps) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { onLayout, gesture, x, y } = useDragPosition({
    testID: 'color-area-pan',
    onMove: (px, py, width, height) => onChange(areaToSv(px, py, width, height)),
    restAt: ({ width, height }) => svToArea(saturation, value, width, height),
  });
  // El tirador va por transform (hilo de UI): su posicion sale de los valores compartidos, no del estado de React.
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() - AREA_THUMB / 2 }, { translateY: y.get() - AREA_THUMB / 2 }],
  }));

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    switch (event.nativeEvent.actionName) {
      case 'moreSaturation':
        return onChange({ s: clamp01(saturation + A11Y_STEP), v: value });
      case 'lessSaturation':
        return onChange({ s: clamp01(saturation - A11Y_STEP), v: value });
      case 'brighter':
        return onChange({ s: saturation, v: clamp01(value + A11Y_STEP) });
      case 'darker':
        return onChange({ s: saturation, v: clamp01(value - A11Y_STEP) });
      default:
    }
  };

  const current = hsvToHex({ h: hue, s: saturation, v: value });

  return (
    <GestureDetector gesture={gesture}>
      <View
        testID="color-area"
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Arrastra para elegir el color. También puedes escribir su código en el campo de debajo."
        accessibilityActions={[
          { name: 'moreSaturation', label: 'Más saturación' },
          { name: 'lessSaturation', label: 'Menos saturación' },
          { name: 'brighter', label: 'Más brillo' },
          { name: 'darker', label: 'Menos brillo' },
        ]}
        onAccessibilityAction={onAccessibilityAction}
        onLayout={onLayout}
        style={styles.area}>
        <View style={styles.layers}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={`${id}-sat`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id={`${id}-val`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                <Stop offset="1" stopColor="#000000" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={hsvToHex({ h: hue, s: 1, v: 1 })} />
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}-sat)`} />
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}-val)`} />
          </Svg>
        </View>
        <Animated.View
          testID="color-area-thumb"
          style={[styles.thumb, { backgroundColor: current }, thumbStyle]}
        />
      </View>
    </GestureDetector>
  );
};
