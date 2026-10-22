import { View } from 'react-native';
import { Skeleton } from './Skeleton';
import { Spacing } from '@/constants/theme';
import { styles } from './DonutChart.styles';

const LEGEND_ROWS = 4;

interface DonutChartSkeletonProps {
  size?: number;
}

export const DonutChartSkeleton = ({ size = 176 }: DonutChartSkeletonProps) => (
  <View style={[styles.wrapper, { width: size, height: size }]}>
    <Skeleton width={size} height={size} borderRadius={size / 2} />
  </View>
);

export const DonutChartLegendSkeleton = () => (
  <View style={{ gap: Spacing.two, flex: 1 }}>
    {Array.from({ length: LEGEND_ROWS }, (_, i) => (
      <Skeleton key={i} height={14} width={i % 2 === 0 ? '90%' : '70%'} />
    ))}
  </View>
);
