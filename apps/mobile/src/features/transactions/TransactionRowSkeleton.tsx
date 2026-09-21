import { View } from 'react-native';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { styles } from './TransactionRow.styles';

export const TransactionRowSkeleton = () => (
  <Card style={styles.row}>
    <View style={styles.rowInfo}>
      <Skeleton height={16} width="60%" />
      <View style={styles.rowMeta}>
        <Skeleton height={20} width={80} borderRadius={10} />
        <Skeleton height={12} width={70} />
      </View>
    </View>
    <Skeleton height={16} width={60} />
  </Card>
);
