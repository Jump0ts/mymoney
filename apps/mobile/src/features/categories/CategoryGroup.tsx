import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/Card';
import { ThemedText } from '@/components/themed-text';
import type { Category } from './categories.types';
import { styles } from './CategoryGroup.styles';

interface CategoryGroupProps {
  title: string;
  categories: Category[];
  onDelete: (category: Category) => void;
}

export const CategoryGroup = ({ title, categories, onDelete }: CategoryGroupProps) => {
  if (categories.length === 0) return null;

  return (
    <View style={styles.group}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
        {title.toUpperCase()}
      </ThemedText>
      {categories.map((category) => (
        <Card key={category.id} style={styles.categoryRow}>
          <View style={[styles.dot, { backgroundColor: category.color }]} />
          <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
          <Pressable onPress={() => onDelete(category)} hitSlop={8}>
            <Feather name="trash-2" size={18} color="#E5484D" />
          </Pressable>
        </Card>
      ))}
    </View>
  );
};
