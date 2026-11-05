import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/themed-text';
import { useLegibleColor } from '@/hooks/use-legible-color';
import { useTheme } from '@/hooks/use-theme';
import type { Category } from './categories.types';
import { CategoryForm } from './CategoryForm';
import { styles } from './CategoryGroup.styles';

interface CategoryGroupProps {
  title: string;
  categories: Category[];
  onDelete: (category: Category) => void;
  // Editar nombre y color: el boton de cada fila avisa con onEdit, y la fila de `editingId` pasa a ser el editor.
  onEdit: (category: Category) => void;
  editingId?: string | null;
  onDoneEditing: () => void;
}

// No es una lista virtualizada (es un .map() dentro de un ScrollView normal),
// asi que animar la salida de la fila y el reflujo de las demas es seguro.
const ROW_EXIT = FadeOut.duration(200);
const ROW_REFLOW = LinearTransition.duration(200);

export const CategoryGroup = memo(({ title, categories, onDelete, onEdit, editingId = null, onDoneEditing }: CategoryGroupProps) => {
  const theme = useTheme();
  const legible = useLegibleColor();
  if (categories.length === 0) return null;

  return (
    <View style={styles.group}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
        {title.toUpperCase()}
      </ThemedText>
      {categories.map((category) => (
        <Animated.View key={category.id} exiting={ROW_EXIT} layout={ROW_REFLOW}>
          {editingId === category.id ? (
            <CategoryForm category={category} onDone={onDoneEditing} />
          ) : (
            <Card style={styles.categoryRow}>
              <View testID={`category-dot-${category.id}`} style={[styles.dot, { backgroundColor: legible(category.color) }]} />
              <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${category.name}`}
                testID={`category-group-edit-${category.id}`}
                style={styles.iconButton}
                onPress={() => onEdit(category)}>
                <Feather name="edit-2" size={18} color={theme.textSecondary} />
              </AnimatedPressable>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={`Borrar ${category.name}`}
                testID={`category-group-delete-${category.id}`}
                style={styles.iconButton}
                onPress={() => onDelete(category)}>
                <Feather name="trash-2" size={18} color={theme.danger} />
              </AnimatedPressable>
            </Card>
          )}
        </Animated.View>
      ))}
    </View>
  );
});
CategoryGroup.displayName = 'CategoryGroup';
