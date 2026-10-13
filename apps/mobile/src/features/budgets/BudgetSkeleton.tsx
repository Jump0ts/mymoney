import { View } from 'react-native';

import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { styles } from './BudgetSkeleton.styles';

const ROWS = 3;

export const BudgetSkeleton = () => (
  <View testID="budget-skeleton" style={styles.container}>
    <Card style={styles.summary}>
      <Skeleton height={16} width="45%" />
      <Skeleton height={16} width="70%" />
      <Skeleton height={16} width="70%" />
    </Card>
    {Array.from({ length: 2 }, (_, i) => (
      <Card key={i} style={styles.group}>
        <Skeleton height={44} borderRadius={0} />
        <View style={styles.rows}>
          {Array.from({ length: ROWS }, (_, j) => (
            <Skeleton key={j} height={16} width={`${80 - j * 15}%`} />
          ))}
        </View>
      </Card>
    ))}
  </View>
);
