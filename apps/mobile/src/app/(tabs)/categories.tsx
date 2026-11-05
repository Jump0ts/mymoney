import { Feather } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryGroup } from '@/features/categories/CategoryGroup';
import { CategoryGroupSkeleton } from '@/features/categories/CategoryGroupSkeleton';
import { CategoryForm } from '@/features/categories/CategoryForm';
import type { Category } from '@/features/categories/categories.types';
import { useCategories, useDeleteCategory } from '@/features/categories/useCategories';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { styles } from '@/screens/tabs/categories.styles';
import { confirmAsync, notify } from '@/utils/alert';

const CONTENT_FADE_IN = FadeIn.duration(200);

const CategoriesScreen = () => {
  const theme = useTheme();
  const { data: categories, isLoading } = useCategories();
  const deleteCategory = useDeleteCategory();
  const [isCreating, setIsCreating] = useState(false);
  // Categoria que se esta editando: su fila pasa a ser el formulario. Crear y editar no se abren a la vez.
  const [editingId, setEditingId] = useState<string | null>(null);

  const expense = useMemo(() => categories?.filter((c) => c.type === 'EXPENSE') ?? [], [categories]);
  const income = useMemo(() => categories?.filter((c) => c.type === 'INCOME') ?? [], [categories]);

  const handleDelete = useCallback(
    async (category: Category) => {
      const confirmed = await confirmAsync({
        title: 'Borrar categoría',
        message: `¿Seguro que quieres borrar "${category.name}"?`,
        confirmLabel: 'Borrar',
        destructive: true,
      });
      if (!confirmed) return;

      deleteCategory.mutate(category.id, {
        onError: (err) =>
          notify('No se pudo borrar', err instanceof ApiError ? err.message : 'Error inesperado'),
      });
    },
    [deleteCategory],
  );

  const handleEdit = useCallback((category: Category) => {
    setIsCreating(false);
    setEditingId(category.id);
  }, []);

  const handleDoneEditing = useCallback(() => setEditingId(null), []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <ThemedText type="title" accessibilityRole="header" style={styles.title}>
              Categorías
            </ThemedText>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={isCreating ? 'Cerrar formulario' : 'Añadir categoría'}
              onPress={() => {
                setEditingId(null);
                setIsCreating((v) => !v);
              }}
              style={[styles.addButton, { backgroundColor: theme.primary }]}>
              <Feather name={isCreating ? 'x' : 'plus'} size={20} color={theme.primaryText} />
            </AnimatedPressable>
          </View>

          {isCreating && <CategoryForm onDone={() => setIsCreating(false)} />}

          {isLoading ? (
            <>
              <CategoryGroupSkeleton />
              <CategoryGroupSkeleton />
            </>
          ) : (
            <Animated.View entering={CONTENT_FADE_IN}>
              <CategoryGroup
                title="Gastos"
                categories={expense}
                onDelete={handleDelete}
                onEdit={handleEdit}
                editingId={editingId}
                onDoneEditing={handleDoneEditing}
              />
              <CategoryGroup
                title="Ingresos"
                categories={income}
                onDelete={handleDelete}
                onEdit={handleEdit}
                editingId={editingId}
                onDoneEditing={handleDoneEditing}
              />
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
};

export default CategoriesScreen;
