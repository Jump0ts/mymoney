import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryGroup } from '@/features/categories/CategoryGroup';
import { NewCategoryForm } from '@/features/categories/NewCategoryForm';
import type { Category } from '@/features/categories/categories.types';
import { useCategories, useDeleteCategory } from '@/features/categories/useCategories';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { styles } from '@/screens/tabs/categories.styles';
import { confirmAsync, notify } from '@/utils/alert';

const CategoriesScreen = () => {
  const theme = useTheme();
  const { data: categories } = useCategories();
  const deleteCategory = useDeleteCategory();
  const [isCreating, setIsCreating] = useState(false);

  const expense = categories?.filter((c) => c.type === 'EXPENSE') ?? [];
  const income = categories?.filter((c) => c.type === 'INCOME') ?? [];

  const handleDelete = async (category: Category) => {
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
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <ThemedText type="title" style={styles.title}>
              Categorías
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsCreating((v) => !v)}
              style={[styles.addButton, { backgroundColor: theme.primary }]}>
              <Feather name={isCreating ? 'x' : 'plus'} size={20} color={theme.primaryText} />
            </Pressable>
          </View>

          {isCreating && <NewCategoryForm onDone={() => setIsCreating(false)} />}

          <CategoryGroup title="Gastos" categories={expense} onDelete={handleDelete} />
          <CategoryGroup title="Ingresos" categories={income} onDelete={handleDelete} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
};

export default CategoriesScreen;
