import { yupResolver } from '@hookform/resolvers/yup';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryPalette } from '@/features/categories/categories.constants';
import { createCategorySchema, type CreateCategoryFormValues } from '@/features/categories/categories.schema';
import type { Category } from '@/features/categories/categories.types';
import { useCategories, useCreateCategory, useDeleteCategory } from '@/features/categories/useCategories';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { styles } from './categories.styles';

interface CategoryGroupProps {
  title: string;
  categories: Category[];
  onDelete: (category: Category) => void;
}

const CategoryGroup = ({ title, categories, onDelete }: CategoryGroupProps) => {
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

const NewCategoryForm = ({ onDone }: { onDone: () => void }) => {
  const createCategory = useCreateCategory();
  const { control, handleSubmit, watch } = useForm<CreateCategoryFormValues>({
    resolver: yupResolver(createCategorySchema),
    defaultValues: { name: '', type: 'EXPENSE', color: CategoryPalette[0], icon: 'tag' },
  });
  const selectedColor = watch('color');
  const selectedType = watch('type');

  const onSubmit = (values: CreateCategoryFormValues) => {
    createCategory.mutate(values, {
      onSuccess: onDone,
      onError: (err) =>
        Alert.alert('No se pudo crear', err instanceof ApiError ? err.message : 'Error inesperado'),
    });
  };

  return (
    <Card style={styles.form}>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            placeholder="Nombre de la categoría"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />

      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <View style={styles.segmentRow}>
            {(['EXPENSE', 'INCOME'] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => field.onChange(option)}
                style={[styles.segment, { opacity: selectedType === option ? 1 : 0.5 }]}>
                <ThemedText type="small">{option === 'EXPENSE' ? 'Gasto' : 'Ingreso'}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      />

      <Controller
        control={control}
        name="color"
        render={({ field }) => (
          <View style={styles.paletteRow}>
            {CategoryPalette.map((swatch) => (
              <Pressable
                key={swatch}
                onPress={() => field.onChange(swatch)}
                style={[
                  styles.swatch,
                  { backgroundColor: swatch, borderWidth: selectedColor === swatch ? 3 : 0 },
                ]}
              />
            ))}
          </View>
        )}
      />

      <Button label="Crear categoría" loading={createCategory.isPending} onPress={handleSubmit(onSubmit)} />
    </Card>
  );
};

const CategoriesScreen = () => {
  const theme = useTheme();
  const { data: categories } = useCategories();
  const deleteCategory = useDeleteCategory();
  const [isCreating, setIsCreating] = useState(false);

  const expense = categories?.filter((c) => c.type === 'EXPENSE') ?? [];
  const income = categories?.filter((c) => c.type === 'INCOME') ?? [];

  const handleDelete = (category: Category) => {
    Alert.alert('Borrar categoría', `¿Seguro que quieres borrar "${category.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () =>
          deleteCategory.mutate(category.id, {
            onError: (err) =>
              Alert.alert(
                'No se pudo borrar',
                err instanceof ApiError ? err.message : 'Error inesperado',
              ),
          }),
      },
    ]);
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
