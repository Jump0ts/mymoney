import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

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

export function DonutChart({ data, size = 176, strokeWidth = 24, centerLabel, centerSubLabel }: DonutChartProps) {
  const theme = useTheme();
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${center}, ${center}`}>
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
              const dashoffset = -accumulated;
              accumulated += length;
              return (
                <Circle
                  key={slice.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="butt"
                  fill="none"
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
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
});
