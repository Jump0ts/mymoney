import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Category } from './categories.types';
import { styles } from './CategoryGroup.styles';

interface CategoryGroupProps {
  title: string;
  categories: Category[];
  onDelete: (category: Category) => void;
}

// No es una lista virtualizada (es un .map() dentro de un ScrollView normal),
// asi que animar la salida de la fila y el reflujo de las demas es seguro.
const ROW_EXIT = FadeOut.duration(200);
const ROW_REFLOW = LinearTransition.duration(200);

export const CategoryGroup = ({ title, categories, onDelete }: CategoryGroupProps) => {
  const theme = useTheme();
  if (categories.length === 0) return null;

  return (
    <View style={styles.group}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
        {title.toUpperCase()}
      </ThemedText>
      {categories.map((category) => (
        <Animated.View key={category.id} exiting={ROW_EXIT} layout={ROW_REFLOW}>
          <Card style={styles.categoryRow}>
            <View style={[styles.dot, { backgroundColor: category.color }]} />
            <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={`Borrar ${category.name}`}
              testID={`category-group-delete-${category.id}`}
              style={styles.deleteButton}
              onPress={() => onDelete(category)}>
              <Feather name="trash-2" size={18} color={theme.danger} />
            </AnimatedPressable>
          </Card>
        </Animated.View>
      ))}
    </View>
  );
};
