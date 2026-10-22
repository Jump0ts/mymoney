import { View } from 'react-native';
import { Skeleton } from './Skeleton';
import { styles } from './MonthlyBarChart.styles';

const COLUMN_HEIGHTS = [55, 80, 40, 95, 65, 30];

interface MonthlyBarChartSkeletonProps {
  height?: number;
}

export const MonthlyBarChartSkeleton = ({ height = 140 }: MonthlyBarChartSkeletonProps) => (
  <View style={[styles.container, { height }]}>
    {COLUMN_HEIGHTS.map((barHeight, i) => (
      <View key={i} style={styles.column}>
        <View style={styles.bars}>
          <Skeleton width={10} height={`${barHeight}%`} />
          <Skeleton width={10} height={`${barHeight * 0.6}%`} />
        </View>
        <Skeleton width={20} height={12} style={styles.monthLabel} />
      </View>
    ))}
  </View>
);
