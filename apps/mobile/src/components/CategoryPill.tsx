import { View } from 'react-native';
import { ThemedText } from './themed-text';
import type { Category } from '@/features/categories/categories.types';
import { styles } from './CategoryPill.styles';

export const CategoryPill = ({ category }: { category: Category }) => (
  <View style={[styles.pill, { backgroundColor: `${category.color}22` }]}>
    <View style={[styles.dot, { backgroundColor: category.color }]} />
    <ThemedText type="small" style={{ color: category.color }}>
      {category.name}
    </ThemedText>
  </View>
);
