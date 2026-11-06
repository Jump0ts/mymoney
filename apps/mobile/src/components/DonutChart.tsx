import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { Duration, EASE_OUT } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { styles } from './DonutChart.styles';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSubLabel?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Trazo de un arco: `drawn` es lo pintado y el resto de la circunferencia, hueco.
export const arcDash = (drawn: number, circumference: number) => `${drawn} ${Math.max(circumference - drawn, 0)}`;

interface DonutChartArcProps {
  testID: string;
  center: number;
  radius: number;
  strokeWidth: number;
  color: string;
  length: number;
  dashOffset: number;
  circumference: number;
}

// Cada arco vive en su propio componente porque el numero de slices cambia de un mes a otro: llamar a
// useAnimatedProps dentro de un .map() violaria las reglas de los hooks. Cada arco anima su propio largo y su
// posicion: un arco nuevo se dibuja desde 0 y uno que ya estaba se reajusta desde donde esta, sin reiniciarse.
const DonutChartArc = ({
  testID,
  center,
  radius,
  strokeWidth,
  color,
  length,
  dashOffset,
  circumference,
}: DonutChartArcProps) => {
  const drawn = useSharedValue(0);
  const offset = useSharedValue(dashOffset);

  useEffect(() => {
    drawn.set(withTiming(length, { duration: Duration.chart, easing: EASE_OUT }));
    // Un arco nuevo ya nace en su sitio: solo se mueve si otro anterior cambia de tamano.
    if (offset.get() !== dashOffset) offset.set(withTiming(dashOffset, { duration: Duration.chart, easing: EASE_OUT }));
  }, [length, dashOffset, drawn, offset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: arcDash(drawn.get(), circumference),
    strokeDashoffset: -offset.get(),
  }));

  return (
    <AnimatedCircle
      testID={testID}
      cx={center}
      cy={center}
      r={radius}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      fill="none"
      animatedProps={animatedProps}
    />
  );
};

export const DonutChart = ({
  data,
  size = 176,
  strokeWidth = 24,
  centerLabel,
  centerSubLabel,
}: DonutChartProps) => {
  const theme = useTheme();
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G transform={`rotate(-90 ${center} ${center})`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={theme.backgroundSelected}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {total > 0 &&
            data.map((slice) => {
              const length = (slice.value / total) * circumference;
              const dashOffset = accumulated;
              accumulated += length;
              return (
                <DonutChartArc
                  key={slice.label}
                  testID={`donut-arc-${slice.label}`}
                  center={center}
                  radius={radius}
                  strokeWidth={strokeWidth}
                  color={slice.color}
                  length={length}
                  dashOffset={dashOffset}
                  circumference={circumference}
                />
              );
            })}
        </G>
      </Svg>
      <View style={styles.centerLabel} pointerEvents="none">
        {centerLabel && <ThemedText type="smallBold">{centerLabel}</ThemedText>}
        {centerSubLabel && (
          <ThemedText type="small" themeColor="textSecondary">
            {centerSubLabel}
          </ThemedText>
        )}
      </View>
    </View>
  );
};
