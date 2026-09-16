import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/types/api';

export function CategoryPill({ category }: { category: Category }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${category.color}22` }]}>
      <View style={[styles.dot, { backgroundColor: category.color }]} />
      <ThemedText type="small" style={{ color: category.color }}>
        {category.name}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
