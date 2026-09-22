import { View } from 'react-native';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { styles } from './CategoryGroup.styles';

const ROWS = 3;

export const CategoryGroupSkeleton = () => (
  <View style={styles.group}>
    <Skeleton height={14} width={90} style={styles.groupTitle} />
    {Array.from({ length: ROWS }, (_, i) => (
      <Card key={i} style={styles.categoryRow}>
        <Skeleton width={12} height={12} borderRadius={6} />
        <View style={styles.categoryName}>
          <Skeleton height={14} width="50%" />
        </View>
      </Card>
    ))}
  </View>
);
