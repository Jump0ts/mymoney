import { View } from 'react-native';
import { useLegibleColor } from '@/hooks/use-legible-color';
import { ThemedText } from './themed-text';
import type { Category } from '@/features/categories/categories.types';
import { styles } from './CategoryPill.styles';

export const CategoryPill = ({ category }: { category: Category }) => {
  const legible = useLegibleColor();
  const color = legible(category.color);

  return (
    <View style={[styles.pill, { backgroundColor: `${category.color}22` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="small" style={{ color }}>
        {category.name}
      </ThemedText>
    </View>
  );
};
