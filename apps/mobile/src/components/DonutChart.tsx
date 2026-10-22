import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { Easing, type SharedValue, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { ThemedText } from './themed-text';
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
const REVEAL_DURATION = 450;
const REVEAL_EASING = Easing.bezier(0.23, 1, 0.32, 1);

interface DonutChartArcProps {
  center: number;
  radius: number;
  strokeWidth: number;
  color: string;
  length: number;
  dashOffset: number;
  circumference: number;
  progress: SharedValue<number>;
}

// Cada arco vive en su propio componente porque el numero de slices cambia
// de un mes a otro: llamar a useAnimatedProps dentro de un .map() violaria
// las reglas de los hooks (numero de llamadas variable entre renders).
const DonutChartArc = ({
  center,
  radius,
  strokeWidth,
  color,
  length,
  dashOffset,
  circumference,
  progress,
}: DonutChartArcProps) => {
  const animatedProps = useAnimatedProps(() => {
    const drawn = length * progress.get();
    return { strokeDasharray: `${drawn} ${circumference - drawn}` };
  });

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={radius}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDashoffset={-dashOffset}
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
  const progress = useSharedValue(0);

  // Huella de los datos actuales: distinta cada vez que cambian las categorias
  // o sus importes (p. ej. al cambiar de mes), igual aunque solo cambie el tema.
  const dataKey = data.map((slice) => `${slice.label}:${slice.value}`).join('|');

  useEffect(() => {
    progress.set(0);
    progress.set(withTiming(1, { duration: REVEAL_DURATION, easing: REVEAL_EASING }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

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
                  center={center}
                  radius={radius}
                  strokeWidth={strokeWidth}
                  color={slice.color}
                  length={length}
                  dashOffset={dashOffset}
                  circumference={circumference}
                  progress={progress}
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
